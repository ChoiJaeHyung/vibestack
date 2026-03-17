"use server";

/**
 * Template Assembler — the core of the Ontology-Driven Template Engine.
 *
 * Assembles a curriculum from pre-built templates, with LLM fallback
 * for missing sections (Level 3) + Flywheel auto-save.
 * Design doc: Section 2.1, 2.4, 6.4
 *
 * Algorithm:
 * 1. getKBHints() per technology -> concept_keys + prerequisites
 * 2. getMastery(userId) -> user_concept_mastery rows
 * 3. filterByMastery (MASTERED skip, LEARNING review, NEW full)
 * 4. topologicalSortConcepts -> learning order
 * 5. groupConceptsIntoModules -> module groups
 * 6. selectTemplatesForModule -> sections per module
 * 7. resolveFallbackSections -> Level 3 LLM generation + Flywheel save
 * 8. Validate with validateModule
 * 9. computeModulePrerequisites -> R4' module prereqs
 */

import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { getKBHints } from "@/lib/knowledge";
import type { ConceptHint } from "@/lib/knowledge/types";
import { topologicalSortConcepts } from "@/lib/templates/topological-sort";
import {
  groupConceptsIntoModules,
  type ConceptWithTech,
} from "@/lib/templates/module-grouper";
import {
  selectTemplatesForModule,
  checkMultiTechCoverage,
} from "@/lib/templates/template-selector";
import { validateModule } from "@/lib/utils/curriculum-validation";
import { updatePrerequisitesForPath } from "@/server/actions/curriculum";
import { createLLMProvider } from "@/lib/llm/factory";
import { getDefaultLlmKeyWithDiagnosis } from "@/server/actions/llm-keys";
import {
  MASTERY_THRESHOLDS,
} from "@/lib/templates/constants";
import {
  getMinExplanationChars,
  getMinCodeExamples,
  getMinQuizQuestions,
} from "@/lib/utils/curriculum-validation";
import type { ContentSection } from "@/server/actions/curriculum";
import type { Locale, Json } from "@/types/database";

// ─── Types ──────────────────────────────────────────────────────────

export interface AssemblerInput {
  projectId: string;
  userId: string;
  techStacks: Array<{
    technology_name: string;
    category: string;
    importance: string;
    version: string | null;
  }>;
  difficulty: "beginner" | "intermediate" | "advanced";
  locale: Locale;
  /** Pre-fetched KB concepts — skips redundant getKBHints calls */
  kbResults?: Array<{ techName: string; concepts: ConceptHint[] }>;
  /** Pre-fetched mastery map (concept_key → mastery_level) — skips redundant DB query */
  masteryMap?: Map<string, number>;
}

export interface AssembledModule {
  title: string;
  description: string;
  module_type: "concept" | "practical" | "quiz" | "project_walkthrough";
  module_order: number;
  tech_name: string;
  estimated_minutes: number;
  concept_keys: string[];
  sections: ContentSection[];
  /** Number of sections that needed LLM fallback */
  llmFallbackCount: number;
}

export interface AssembledCurriculum {
  title: string;
  description: string;
  difficulty: string;
  estimated_hours: number;
  modules: AssembledModule[];
  locale: Locale;
  /** true if all modules have full template coverage */
  fullyPrebuilt: boolean;
}

// ─── Coverage Check (exported for use by curriculum.ts) ─────────────

export { checkMultiTechCoverage };

// ─── Template DB Client (untyped) ────────────────────────────────────

function createTemplateClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase environment variables are not configured");
  }
  return createClient(url, serviceKey);
}

// ─── Level 3: Flywheel LLM Fallback Resolver ────────────────────────

const LLM_FALLBACK_MARKER = "__LLM_FALLBACK__";

/**
 * Resolve `__LLM_FALLBACK__` placeholder sections via LLM and save
 * generated sections to content_templates for future reuse (Flywheel).
 *
 * Design doc: Section 2.4 (Level 3) + Section 6.4 (Flywheel auto-save)
 */
async function resolveFallbackSections(
  modules: AssembledModule[],
  locale: Locale,
  userId: string,
): Promise<AssembledModule[]> {
  // Collect all modules with fallback placeholders
  const modulesWithFallbacks = modules.filter(
    (m) => m.sections.some((s) => s.body?.startsWith(LLM_FALLBACK_MARKER)),
  );

  if (modulesWithFallbacks.length === 0) return modules;

  // Get LLM provider
  let provider;
  try {
    const keyResult = await getDefaultLlmKeyWithDiagnosis(userId);
    if (!keyResult.data) return modules; // No LLM key — keep placeholders
    provider = createLLMProvider(keyResult.data.provider, keyResult.data.apiKey);
  } catch {
    console.warn("[assembler] Could not get LLM provider for fallback resolution");
    return modules;
  }

  const templateClient = createTemplateClient();

  const resolvedModules = [...modules];

  for (let mi = 0; mi < resolvedModules.length; mi++) {
    const mod = resolvedModules[mi];
    const fallbackSections = mod.sections
      .map((s, idx) => ({ section: s, idx }))
      .filter((s) => s.section.body?.startsWith(LLM_FALLBACK_MARKER));

    if (fallbackSections.length === 0) continue;

    // Parse concept_key and section_type from each placeholder
    const placeholders = fallbackSections.map(({ section, idx }) => {
      const parts = section.body.split(":");
      return {
        idx,
        conceptKey: parts[1] ?? mod.concept_keys[0] ?? "unknown",
        sectionType: parts[2] ?? section.type,
      };
    });

    // Group by concept_key to minimize LLM calls
    const byConceptKey = new Map<string, typeof placeholders>();
    for (const p of placeholders) {
      const existing = byConceptKey.get(p.conceptKey) ?? [];
      existing.push(p);
      byConceptKey.set(p.conceptKey, existing);
    }

    for (const [conceptKey, items] of byConceptKey) {
      const neededTypes = items.map((i) => i.sectionType);
      const prompt = buildFallbackPrompt(
        mod.tech_name,
        conceptKey,
        neededTypes,
        mod.title,
        locale,
      );

      try {
        const response = await provider.chat({
          messages: [{ role: "user", content: prompt }],
          maxTokens: 4096,
        });

        const generated = parseLlmSections(response.content);

        // Match generated sections to placeholders and replace
        for (const item of items) {
          const match = generated.find((g) => g.type === item.sectionType);
          if (match && match.body && match.body.trim().length > 20) {
            mod.sections[item.idx] = match;

            // Flywheel: save to content_templates for future reuse
            try {
              await templateClient
                .from("content_templates")
                .insert({
                  technology_name: mod.tech_name,
                  concept_key: conceptKey,
                  difficulty: "beginner", // use module context if available
                  section_type: match.type,
                  locale,
                  title: match.title,
                  body: match.body,
                  code: match.code ?? null,
                  quiz_options: match.quiz_options ?? null,
                  quiz_answer: match.quiz_answer ?? null,
                  quiz_explanation: match.quiz_explanation ?? null,
                  source: "auto_generated",
                });
            } catch {
              // Unique constraint or other insert error — non-fatal
            }
          }
        }
      } catch (err) {
        console.warn(
          `[assembler] Fallback LLM failed for ${conceptKey}: ${err instanceof Error ? err.message : err}`,
        );
        // Keep placeholders — non-fatal
      }
    }

    // Update fallback count
    const remainingFallbacks = mod.sections.filter(
      (s) => s.body?.startsWith(LLM_FALLBACK_MARKER),
    ).length;
    resolvedModules[mi] = { ...mod, llmFallbackCount: remainingFallbacks };
  }

  return resolvedModules;
}

function buildFallbackPrompt(
  techName: string,
  conceptKey: string,
  sectionTypes: string[],
  moduleTitle: string,
  locale: Locale,
): string {
  const typesStr = sectionTypes.join(", ");

  if (locale === "en") {
    return `You are a programming education content expert.
Generate the following section types for a learning module.

Technology: ${techName}
Concept: ${conceptKey}
Module: ${moduleTitle}
Needed sections: ${typesStr}

## Requirements
- explanation: 400+ characters, include analogies, key concepts
- code_example: generic runnable code (NOT project-specific), 10+ chars
- quiz_question: 4 unique options, 1 correct answer (0-3 index), 20+ char explanation
- Each section title must be unique

## Output Format (JSON array only, no code fences)
[{"type":"explanation","title":"...","body":"..."},{"type":"code_example","title":"...","body":"...","code":"..."},{"type":"quiz_question","title":"...","body":"...","quiz_options":["A","B","C","D"],"quiz_answer":0,"quiz_explanation":"..."}]`;
  }

  return `당신은 프로그래밍 교육 콘텐츠 전문가입니다.
학습 모듈에 필요한 섹션을 생성하세요.

기술: ${techName}
개념: ${conceptKey}
모듈: ${moduleTitle}
필요한 섹션 타입: ${typesStr}

## 요구사항
- explanation: 400자 이상, 비유 포함, 핵심 개념 설명
- code_example: 범용 예시 코드 (프로젝트 특정 X), 실행 가능, 10자 이상
- quiz_question: 유니크 옵션 4개, 정답 1개 (0-3 인덱스), 해설 20자 이상
- 각 섹션 제목은 유니크해야 함

## 출력 형식 (JSON 배열만, 코드 펜스 없이)
[{"type":"explanation","title":"...","body":"..."},{"type":"code_example","title":"...","body":"...","code":"..."},{"type":"quiz_question","title":"...","body":"...","quiz_options":["A","B","C","D"],"quiz_answer":0,"quiz_explanation":"..."}]`;
}

function parseLlmSections(raw: string): ContentSection[] {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed as ContentSection[];
  } catch {
    return [];
  }
}

// ─── Main Assembler ─────────────────────────────────────────────────

export async function assembleCurriculum(
  input: AssemblerInput,
): Promise<AssembledCurriculum> {
  const { projectId, userId, techStacks, difficulty, locale } = input;

  // ─── Step 1: Get KB hints per technology (reuse if pre-fetched) ───
  const kbResults = input.kbResults ?? await Promise.all(
    techStacks.map(async (ts) => {
      const concepts = await getKBHints(ts.technology_name, locale);
      return { techName: ts.technology_name, concepts };
    }),
  );

  // Flatten all concepts with tech info
  const allConcepts: Array<ConceptHint & { tech_name: string }> = [];
  for (const { techName, concepts } of kbResults) {
    for (const c of concepts) {
      allConcepts.push({ ...c, tech_name: techName });
    }
  }

  if (allConcepts.length === 0) {
    throw new Error("No KB concepts found for the given technologies");
  }

  // ─── Step 2: Get user mastery (reuse if pre-fetched) ──────────────
  let masteryMap: Map<string, number>;
  if (input.masteryMap) {
    masteryMap = input.masteryMap;
  } else {
    const serviceClient = createServiceClient();
    const { data: masteryRows } = await serviceClient
      .from("user_concept_mastery")
      .select("concept_key, mastery_level")
      .eq("user_id", userId);

    masteryMap = new Map<string, number>();
    for (const row of masteryRows ?? []) {
      if (row.concept_key) {
        masteryMap.set(row.concept_key, row.mastery_level);
      }
    }
  }

  // ─── Step 3: Filter by mastery ────────────────────────────────────
  const includedConcepts: ConceptWithTech[] = [];
  const includedKeys = new Set<string>();

  for (const c of allConcepts) {
    const level = masteryMap.get(c.concept_key) ?? 0;

    if (level >= MASTERY_THRESHOLDS.MASTERED) {
      // Skip mastered concepts (only mentioned as prerequisites)
      continue;
    }

    const masteryStatus: "new" | "learning" =
      level >= MASTERY_THRESHOLDS.LEARNING ? "learning" : "new";

    includedConcepts.push({
      concept_key: c.concept_key,
      concept_name: c.concept_name,
      tech_name: c.tech_name,
      key_points: c.key_points,
      common_quiz_topics: c.common_quiz_topics,
      mastery_status: masteryStatus,
    });
    includedKeys.add(c.concept_key);
  }

  if (includedConcepts.length === 0) {
    throw new Error("All concepts are mastered. No curriculum to generate.");
  }

  // ─── Step 4: Topological sort ─────────────────────────────────────
  const sortedKeys = topologicalSortConcepts(
    allConcepts.map((c) => ({
      concept_key: c.concept_key,
      prerequisite_concepts: c.prerequisite_concepts,
    })),
    includedKeys,
  );

  // Reorder includedConcepts to match sorted order
  const conceptMap = new Map<string, ConceptWithTech>();
  for (const c of includedConcepts) {
    conceptMap.set(c.concept_key, c);
  }
  const sortedConcepts: ConceptWithTech[] = [];
  for (const key of sortedKeys) {
    const concept = conceptMap.get(key);
    if (concept) sortedConcepts.push(concept);
  }

  // ─── Step 5: Group into modules ───────────────────────────────────
  const moduleGroups = groupConceptsIntoModules(
    sortedConcepts,
    difficulty,
    locale,
  );

  // ─── Step 6: Select templates for each module ─────────────────────
  const assembledModules: AssembledModule[] = [];
  let totalFullyPrebuilt = true;

  for (let i = 0; i < moduleGroups.length; i++) {
    const group = moduleGroups[i];

    const selectionResult = await selectTemplatesForModule(
      group.concept_keys,
      difficulty,
      locale,
      group.module_type,
    );

    if (!selectionResult.fullyPrebuilt) {
      totalFullyPrebuilt = false;
    }

    // ─── Step 7: Validate assembled module ──────────────────────────
    const moduleForValidation = {
      title: group.title,
      description: group.description,
      module_type: group.module_type,
      tech_name: group.tech_name,
      concept_keys: group.concept_keys,
      content: { sections: selectionResult.sections },
    };

    const validation = validateModule(moduleForValidation, i, difficulty);
    if (!validation.valid) {
      console.warn(
        `[assembler] Module ${i} validation failed: ${validation.error}. ` +
          `Using assembled sections anyway (will be supplemented by LLM fallback if needed).`,
      );
    }

    assembledModules.push({
      title: group.title,
      description: group.description,
      module_type: group.module_type,
      module_order: i + 1,
      tech_name: group.tech_name,
      estimated_minutes: group.estimated_minutes,
      concept_keys: group.concept_keys,
      sections: selectionResult.sections,
      llmFallbackCount: selectionResult.llmFallbackCount,
    });
  }

  // ─── Step 7: Resolve LLM fallback placeholders (Flywheel) ────────
  const hasFallbacks = assembledModules.some((m) => m.llmFallbackCount > 0);
  let finalModules = assembledModules;

  if (hasFallbacks) {
    try {
      finalModules = await resolveFallbackSections(assembledModules, locale, userId);
      // Update fullyPrebuilt based on resolved results
      totalFullyPrebuilt = finalModules.every((m) => m.llmFallbackCount === 0);
    } catch (err) {
      console.warn(
        "[assembler] Fallback resolution failed (non-fatal):",
        err instanceof Error ? err.message : err,
      );
      // Keep placeholder modules — they still have enough content to learn from
    }
  }

  // ─── Compute curriculum metadata ──────────────────────────────────
  const totalMinutes = finalModules.reduce(
    (sum, m) => sum + m.estimated_minutes,
    0,
  );
  const estimatedHours = Math.ceil(totalMinutes / 60);

  // Generate curriculum title
  const primaryTechs = [...new Set(techStacks
    .filter((t) => t.importance === "core")
    .map((t) => t.technology_name))];

  const titleTechs = primaryTechs.slice(0, 3).join(" + ");
  const title = locale === "en"
    ? `${titleTechs} Learning Path`
    : `${titleTechs} 학습 로드맵`;

  const description = locale === "en"
    ? `A personalized ${difficulty} curriculum covering ${finalModules.length} modules across ${primaryTechs.length} technologies.`
    : `${primaryTechs.length}개 기술을 다루는 ${finalModules.length}개 모듈의 ${difficulty} 맞춤 커리큘럼입니다.`;

  return {
    title,
    description,
    difficulty,
    estimated_hours: estimatedHours,
    modules: finalModules,
    locale,
    fullyPrebuilt: totalFullyPrebuilt,
  };
}

// ─── Persist Assembled Curriculum to DB ─────────────────────────────

/**
 * Save an assembled curriculum to learning_paths + learning_modules.
 * Returns the learning_path_id and first module id.
 */
export async function persistAssembledCurriculum(
  assembled: AssembledCurriculum,
  userId: string,
  projectId: string,
  techStacks: Array<{ id: string; technology_name: string }>,
): Promise<{
  learningPathId: string;
  firstModuleId: string | null;
  totalModules: number;
}> {
  const serviceClient = createServiceClient();

  // Build tech_name -> tech_stack_id map
  const techNameToId = new Map<string, string>();
  for (const tech of techStacks) {
    techNameToId.set(tech.technology_name.toLowerCase(), tech.id);
  }

  // Insert learning_path
  const { data: learningPath, error: pathError } = await serviceClient
    .from("learning_paths")
    .insert({
      project_id: projectId,
      user_id: userId,
      title: assembled.title,
      description: assembled.description,
      difficulty: assembled.difficulty as "beginner" | "intermediate" | "advanced",
      estimated_hours: assembled.estimated_hours,
      total_modules: assembled.modules.length,
      llm_provider: "template_engine",
      status: "active",
      locale: assembled.locale,
    })
    .select("id")
    .single();

  if (pathError || !learningPath) {
    throw new Error(`Failed to create learning path: ${pathError?.message ?? "unknown"}`);
  }

  // Insert learning_modules
  const moduleInserts = assembled.modules.map((mod) => {
    const techStackId = techNameToId.get(mod.tech_name.toLowerCase()) ?? null;

    return {
      learning_path_id: learningPath.id,
      title: mod.title,
      description: mod.description,
      module_type: mod.module_type,
      module_order: mod.module_order,
      estimated_minutes: mod.estimated_minutes,
      tech_stack_id: techStackId,
      concept_keys: mod.concept_keys.length > 0 ? mod.concept_keys : null,
      content: {
        sections: mod.sections,
        _status: "ready",
        _generated_at: new Date().toISOString(),
      } as unknown as Json,
    };
  });

  const { data: insertedModules, error: modulesError } = await serviceClient
    .from("learning_modules")
    .insert(moduleInserts)
    .select("id, module_order")
    .order("module_order", { ascending: true });

  if (modulesError) {
    throw new Error(`Failed to create learning modules: ${modulesError.message}`);
  }

  const firstModuleId = insertedModules?.[0]?.id ?? null;

  // Compute module prerequisites (R4') — reuse existing function from curriculum.ts
  try {
    await updatePrerequisitesForPath(learningPath.id);
  } catch (err) {
    console.error(
      "[assembler] Prerequisite computation failed (non-fatal):",
      err instanceof Error ? err.message : err,
    );
  }

  return {
    learningPathId: learningPath.id,
    firstModuleId,
    totalModules: assembled.modules.length,
  };
}
