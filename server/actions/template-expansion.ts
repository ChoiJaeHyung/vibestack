"use server";

/**
 * Template Auto-Expansion Pipeline.
 *
 * Generates pre-built section templates for new technologies.
 * Design doc: Section 2.6
 *
 * Trigger: tech_stacks INSERT with no existing templates.
 * Pipeline:
 * 1. Check template_generation_jobs for race condition prevention
 * 2. Generate KB via generateKBForTech() if needed
 * 3. Generate section templates per concept
 * 4. Validate and insert into content_templates
 *
 * Cost: ~$1-2/technology (one-time)
 * Execution: after() background or admin script
 */

import { createClient } from "@supabase/supabase-js";
import { generateKBForTech } from "@/server/actions/knowledge";
import { getKBHints } from "@/lib/knowledge";
import { createLLMProvider } from "@/lib/llm/factory";
import { getDefaultLlmKeyWithDiagnosis } from "@/server/actions/llm-keys";
import { llmKeyErrorMessage } from "@/lib/utils/llm-key-errors";
import type { LLMProvider } from "@/lib/llm/types";
import type { ConceptHint } from "@/lib/knowledge/types";
import type { ContentSection } from "@/server/actions/curriculum";
import type { Locale } from "@/types/database";
import {
  getMinExplanationChars,
  getMinCodeExamples,
  getMinQuizQuestions,
} from "@/lib/utils/curriculum-validation";

// ─── Service Client (untyped for template tables) ───────────────────

function createTemplateServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase environment variables are not configured");
  }
  return createClient(url, serviceKey);
}

// ─── Constants ──────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const STALE_JOB_MS = 30 * 60 * 1000; // 30 minutes

const SEED_TECHNOLOGIES = [
  "React",
  "Next.js",
  "TypeScript",
  "Supabase",
  "Tailwind CSS",
];

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

// ─── Section Generation Prompt ──────────────────────────────────────

function buildSectionGenerationPrompt(
  techName: string,
  concept: ConceptHint,
  difficulty: string,
  locale: Locale,
): string {
  const minExplanationChars = getMinExplanationChars(difficulty);
  const minCode = getMinCodeExamples(difficulty);
  const minQuiz = getMinQuizQuestions(difficulty);

  const sectionCount = difficulty === "beginner"
    ? "4-5 sections (2 explanation, 1-2 code_example, 1 quiz_question)"
    : "3-4 sections (1 explanation, 1 code_example, 1 quiz_question)";

  if (locale === "en") {
    return `You are a programming education content expert.
Generate learning sections for the following concept.

Technology: ${techName}
Concept Key: ${concept.concept_key}
Concept Name: ${concept.concept_name}
Key Points: ${concept.key_points.join(", ")}
Common Quiz Topics: ${concept.common_quiz_topics.join(", ")}
Difficulty: ${difficulty}
Language: English

## Requirements
- Generate ${sectionCount}
- explanation sections: ${minExplanationChars}+ characters, include key_points, use analogies for beginner
- code_example sections: generic/universal code examples (NOT project-specific), runnable, 10+ chars
- quiz_question sections: 4 unique options, 1 correct answer (0-3 index), 20+ char explanation
- Include "Learn More" links to official documentation in explanation body
- Each section title must be unique

## Output Format (JSON array only, no code fences)
[
  {
    "type": "explanation",
    "title": "Section title",
    "body": "Markdown body (${minExplanationChars}+ chars for explanation)"
  },
  {
    "type": "code_example",
    "title": "Code example title",
    "body": "Explanation of what this code does",
    "code": "// actual runnable code"
  },
  {
    "type": "quiz_question",
    "title": "Quiz title",
    "body": "Question prompt",
    "quiz_options": ["Option A", "Option B", "Option C", "Option D"],
    "quiz_answer": 0,
    "quiz_explanation": "Why option A is correct (20+ chars)"
  }
]`;
  }

  return `당신은 프로그래밍 교육 콘텐츠 전문가입니다.
다음 개념에 대해 학습 섹션을 생성하세요.

기술: ${techName}
개념 키: ${concept.concept_key}
개념 이름: ${concept.concept_name}
핵심 포인트: ${concept.key_points.join(", ")}
퀴즈 주제: ${concept.common_quiz_topics.join(", ")}
난이도: ${difficulty}
언어: 한국어

## 요구사항
- ${sectionCount} 생성
- explanation 섹션: ${minExplanationChars}자 이상, key_points 포함, beginner는 비유 활용
- code_example 섹션: 범용 예시 코드 (프로젝트 특정 X), 실행 가능, 10자 이상
- quiz_question 섹션: 유니크 옵션 4개, 정답 1개 (0-3 인덱스), 해설 20자 이상
- explanation body에 공식 문서 링크 포함
- 각 섹션 제목은 유니크해야 함

## 출력 형식 (JSON 배열만, 코드 펜스 없이)
[
  {
    "type": "explanation",
    "title": "섹션 제목",
    "body": "마크다운 본문 (explanation은 ${minExplanationChars}자 이상)"
  },
  {
    "type": "code_example",
    "title": "코드 예시 제목",
    "body": "이 코드가 하는 일 설명",
    "code": "// 실행 가능한 코드"
  },
  {
    "type": "quiz_question",
    "title": "퀴즈 제목",
    "body": "질문 내용",
    "quiz_options": ["옵션 A", "옵션 B", "옵션 C", "옵션 D"],
    "quiz_answer": 0,
    "quiz_explanation": "옵션 A가 정답인 이유 (20자 이상)"
  }
]`;
}

// ─── Section Validation ─────────────────────────────────────────────

function validateGeneratedSection(
  section: ContentSection,
  difficulty: string,
): { valid: boolean; error?: string } {
  if (!section.type || !section.title || !section.body) {
    return { valid: false, error: "Missing required fields (type, title, body)" };
  }

  if (section.type === "explanation") {
    const minChars = getMinExplanationChars(difficulty);
    if (section.body.trim().length < minChars) {
      return { valid: false, error: `Explanation body too short: ${section.body.trim().length} < ${minChars}` };
    }
  } else if (section.body.trim().length < 20) {
    return { valid: false, error: `Body too short: ${section.body.trim().length} < 20` };
  }

  if (section.type === "code_example") {
    if (!section.code || section.code.trim().length < 10) {
      return { valid: false, error: "Code example too short or missing" };
    }
  }

  if (section.type === "quiz_question") {
    if (!Array.isArray(section.quiz_options) || section.quiz_options.length !== 4) {
      return { valid: false, error: "Quiz must have exactly 4 options" };
    }
    const uniqueOpts = new Set(section.quiz_options.map((o) => o.trim().toLowerCase()));
    if (uniqueOpts.size < 4) {
      return { valid: false, error: "Quiz options must be unique" };
    }
    if (typeof section.quiz_answer !== "number" || section.quiz_answer < 0 || section.quiz_answer > 3) {
      return { valid: false, error: "Quiz answer must be 0-3" };
    }
    if (!section.quiz_explanation || section.quiz_explanation.trim().length < 20) {
      return { valid: false, error: "Quiz explanation must be 20+ chars" };
    }
  }

  return { valid: true };
}

// ─── LLM Response Parser ────────────────────────────────────────────

function parseSectionsFromLLM(raw: string): ContentSection[] {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  const parsed: unknown = JSON.parse(cleaned);

  if (!Array.isArray(parsed)) {
    throw new Error("Expected JSON array of sections");
  }

  return parsed as ContentSection[];
}

// ─── Job Lock Management ────────────────────────────────────────────

async function acquireGenerationLock(
  techName: string,
  locale: Locale,
): Promise<boolean> {
  const supabase = createTemplateServiceClient();

  // Check existing job
  const { data: existing } = await supabase
    .from("template_generation_jobs")
    .select("id, status, started_at")
    .eq("technology_name", techName)
    .eq("locale", locale)
    .maybeSingle();

  if (existing) {
    if (existing.status === "ready") return false; // Already done
    if (existing.status === "generating") {
      const startedAt = new Date(existing.started_at).getTime();
      if (Date.now() - startedAt < STALE_JOB_MS) return false; // In progress
      // Stale — reclaim
    }

    // Update to generating
    const { error } = await supabase
      .from("template_generation_jobs")
      .update({
        status: "generating",
        started_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", existing.id);

    return !error;
  }

  // Insert new job
  const { error } = await supabase
    .from("template_generation_jobs")
    .insert({
      technology_name: techName,
      locale,
      status: "generating",
    });

  // 23505 = unique violation (another process beat us)
  if (error) {
    return error.code !== "23505" ? false : false;
  }

  return true;
}

async function completeGenerationJob(
  techName: string,
  locale: Locale,
  templateCount: number,
): Promise<void> {
  const supabase = createTemplateServiceClient();
  await supabase
    .from("template_generation_jobs")
    .update({
      status: "ready",
      completed_at: new Date().toISOString(),
      template_count: templateCount,
    })
    .eq("technology_name", techName)
    .eq("locale", locale);
}

async function failGenerationJob(
  techName: string,
  locale: Locale,
  errorMessage: string,
): Promise<void> {
  const supabase = createTemplateServiceClient();
  await supabase
    .from("template_generation_jobs")
    .update({
      status: "failed",
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("technology_name", techName)
    .eq("locale", locale);
}

// ─── Main Expansion Function ────────────────────────────────────────

/**
 * Generate pre-built section templates for a technology.
 *
 * Race condition safe: uses template_generation_jobs for locking.
 * Retry policy: max 3 attempts per concept.
 */
export async function expandTemplatesForTech(
  techName: string,
  locale: Locale,
): Promise<{ conceptCount: number; templateCount: number }> {
  // Acquire lock
  const acquired = await acquireGenerationLock(techName, locale);
  if (!acquired) {
    console.log(`[template-expansion] Skipping ${techName}/${locale}: lock not acquired`);
    return { conceptCount: 0, templateCount: 0 };
  }

  try {
    // Get LLM provider (use system default key)
    // For expansion, we need a service-level API key
    // This runs in background, so we use service role
    const llmKeyResult = await getSystemLlmProvider();
    if (!llmKeyResult) {
      throw new Error("No system LLM provider available for template expansion");
    }

    const provider = llmKeyResult;

    // Step 1: Ensure KB exists
    let concepts = await getKBHints(techName, locale);
    if (concepts.length === 0) {
      // Generate KB first
      concepts = await generateKBForTech(techName, null, provider, locale);
      if (concepts.length === 0) {
        throw new Error(`Failed to generate KB for ${techName}`);
      }
    }

    // Step 2: Generate templates per concept x difficulty
    const supabase = createTemplateServiceClient();
    let totalTemplates = 0;

    for (const concept of concepts) {
      for (const difficulty of DIFFICULTIES) {
        // Check if templates already exist for this combo
        const { data: existing } = await supabase
          .from("content_templates")
          .select("id")
          .eq("technology_name", techName)
          .eq("concept_key", concept.concept_key)
          .eq("difficulty", difficulty)
          .eq("locale", locale)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Generate with retry
        let success = false;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            const prompt = buildSectionGenerationPrompt(
              techName,
              concept,
              difficulty,
              locale,
            );

            const response = await provider.chat({
              messages: [{ role: "user", content: prompt }],
              maxTokens: 4096,
            });

            const sections = parseSectionsFromLLM(response.content);

            // Validate each section
            const validSections: ContentSection[] = [];
            for (const section of sections) {
              const validation = validateGeneratedSection(section, difficulty);
              if (validation.valid) {
                validSections.push(section);
              } else {
                console.warn(
                  `[template-expansion] Section validation failed for ${concept.concept_key}/${difficulty}: ${validation.error}`,
                );
              }
            }

            if (validSections.length === 0) {
              throw new Error("All generated sections failed validation");
            }

            // Insert valid sections
            const inserts = validSections.map((s) => ({
              technology_name: techName,
              concept_key: concept.concept_key,
              difficulty,
              section_type: s.type,
              locale,
              title: s.title,
              body: s.body,
              code: s.code ?? null,
              quiz_options: s.quiz_options ?? null,
              quiz_answer: s.quiz_answer ?? null,
              quiz_explanation: s.quiz_explanation ?? null,
              source: "auto_generated",
            }));

            const { error: insertError } = await supabase
              .from("content_templates")
              .insert(inserts);

            if (insertError) {
              // Unique constraint violations are expected for duplicates
              if (insertError.code !== "23505") {
                console.error(`[template-expansion] Insert error: ${insertError.message}`);
              }
            }

            totalTemplates += validSections.length;
            success = true;
            break;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(
              `[template-expansion] Attempt ${attempt}/${MAX_RETRIES} failed for ${concept.concept_key}/${difficulty}: ${message}`,
            );
            if (attempt === MAX_RETRIES) {
              console.error(`[template-expansion] Skipping ${concept.concept_key}/${difficulty} after ${MAX_RETRIES} attempts`);
            }
          }
        }
      }
    }

    await completeGenerationJob(techName, locale, totalTemplates);

    console.log(
      `[template-expansion] Generated ${totalTemplates} templates for ${techName}/${locale} (${concepts.length} concepts)`,
    );

    return { conceptCount: concepts.length, templateCount: totalTemplates };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[template-expansion] Failed for ${techName}/${locale}: ${message}`);
    await failGenerationJob(techName, locale, message);
    return { conceptCount: 0, templateCount: 0 };
  }
}

// ─── Seed Templates ─────────────────────────────────────────────────

/**
 * Generate seed templates for the initial 5 technologies.
 * Run once during setup.
 */
export async function generateSeedTemplates(
  locale: Locale,
): Promise<{ totalTemplates: number; errors: string[] }> {
  let totalTemplates = 0;
  const errors: string[] = [];

  for (const techName of SEED_TECHNOLOGIES) {
    try {
      console.log(`[seed] Generating templates for ${techName}/${locale}...`);
      const result = await expandTemplatesForTech(techName, locale);
      totalTemplates += result.templateCount;
      console.log(`[seed] ${techName}: ${result.templateCount} templates (${result.conceptCount} concepts)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${techName}: ${message}`);
      console.error(`[seed] Failed for ${techName}: ${message}`);
    }
  }

  return { totalTemplates, errors };
}

// ─── System LLM Provider ────────────────────────────────────────────

/**
 * Get system-level LLM provider for background jobs.
 * Uses the first available admin key or BYOK fallback.
 */
async function getSystemLlmProvider(): Promise<LLMProvider | null> {
  const supabase = createTemplateServiceClient();

  // Try to find any admin user's LLM key
  const { data: adminUsers } = await supabase
    .from("users")
    .select("id")
    .eq("role", "admin")
    .limit(1);

  if (adminUsers && adminUsers.length > 0) {
    const adminId = adminUsers[0].id;
    const keyResult = await getDefaultLlmKeyWithDiagnosis(adminId);
    if (keyResult.data) {
      return createLLMProvider(keyResult.data.provider, keyResult.data.apiKey);
    }
  }

  // Fallback: try any user with a key
  const { data: anyUser } = await supabase
    .from("user_llm_keys")
    .select("user_id")
    .limit(1);

  if (anyUser && anyUser.length > 0) {
    const keyResult = await getDefaultLlmKeyWithDiagnosis(anyUser[0].user_id);
    if (keyResult.data) {
      return createLLMProvider(keyResult.data.provider, keyResult.data.apiKey);
    }
  }

  return null;
}
