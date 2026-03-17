"use server";

/**
 * Code Injection Layer — Pro-only feature.
 *
 * Replaces generic code_example sections in a pre-built curriculum
 * with code from the user's actual project files.
 *
 * Design doc: Section 2.5
 *
 * Cost: ~$0.002-0.005/section, ~$0.06-0.15/curriculum
 * Execution: after() background, user can start learning immediately
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { createLLMProvider } from "@/lib/llm/factory";
import { getDefaultLlmKeyWithDiagnosis } from "@/server/actions/llm-keys";
import { llmKeyErrorMessage } from "@/lib/utils/llm-key-errors";
import { decryptContent } from "@/lib/utils/content-encryption";
import type { ContentSection } from "@/server/actions/curriculum";
import type { Json } from "@/types/database";

/**
 * Untyped service client for learning_paths metadata operations.
 * learning_paths.metadata is not in the typed Database schema.
 */
function createUntypedServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase environment variables are not configured");
  }
  return createClient(url, serviceKey);
}

// ─── Types ──────────────────────────────────────────────────────────

export interface CodeInjectionInput {
  learningPathId: string;
  projectId: string;
  userId: string;
  /** Modules with code_example sections to replace */
  modules: Array<{
    moduleId: string;
    sections: ContentSection[];
    techName: string;
  }>;
}

interface CodeInjectionResult {
  injectedCount: number;
  errors: string[];
}

interface ModuleContent {
  sections: ContentSection[];
  _status?: string;
  _generated_at?: string;
  [key: string]: unknown;
}

// ─── Code Injection Prompt ──────────────────────────────────────────

function buildCodeInjectionPrompt(
  originalSection: ContentSection,
  projectCode: string,
  filePath: string,
  locale: string,
): string {
  if (locale === "en") {
    return `You are replacing a generic code example with the user's actual project code.

## Original Section
Title: ${originalSection.title}
Body (explanation — keep this, adjust references if needed):
${originalSection.body}

Original generic code:
\`\`\`
${originalSection.code ?? ""}
\`\`\`

## User's Project Code (from ${filePath})
\`\`\`
${projectCode}
\`\`\`

## Task
1. Replace the generic code with a relevant snippet from the user's project code above.
2. Keep the explanation (body) intact but adjust any code references to match the new code.
3. The replacement code should demonstrate the same concept as the original.
4. If the project code doesn't have a relevant example, keep the original.

## Output Format (JSON only, no code fences)
{
  "code": "the replacement code snippet",
  "body": "the adjusted explanation"
}`;
  }

  return `범용 코드 예시를 사용자의 실제 프로젝트 코드로 교체합니다.

## 원본 섹션
제목: ${originalSection.title}
설명 (body — 유지하되 코드 참조만 수정):
${originalSection.body}

원본 범용 코드:
\`\`\`
${originalSection.code ?? ""}
\`\`\`

## 사용자 프로젝트 코드 (${filePath})
\`\`\`
${projectCode}
\`\`\`

## 작업
1. 범용 코드를 위 프로젝트 코드에서 관련 있는 부분으로 교체
2. 설명(body)은 유지하되 코드 참조만 새 코드에 맞게 수정
3. 교체 코드는 원본과 같은 개념을 보여줘야 함
4. 프로젝트 코드에 관련 예시가 없으면 원본 유지

## 출력 형식 (JSON만, 코드 펜스 없이)
{
  "code": "교체할 코드 스니펫",
  "body": "수정된 설명"
}`;
}

// ─── File Matching ──────────────────────────────────────────────────

/**
 * Find relevant project files for a technology.
 * Matches by file extension and common patterns.
 */
async function findRelevantFiles(
  projectId: string,
  techName: string,
): Promise<Array<{ file_path: string; content: string }>> {
  const serviceClient = createServiceClient();

  // Map tech names to common file patterns
  const techPatterns: Record<string, string[]> = {
    react: [".tsx", ".jsx", "component"],
    "next.js": [".tsx", "page.tsx", "layout.tsx", "route.ts"],
    typescript: [".ts", ".tsx"],
    supabase: ["supabase", "database", ".sql"],
    "tailwind css": [".css", "tailwind"],
    "node.js": [".js", ".ts", "server"],
    python: [".py"],
    vue: [".vue"],
    angular: [".component.ts"],
  };

  const normalized = techName.toLowerCase();
  const patterns = techPatterns[normalized] ?? [".ts", ".tsx", ".js"];

  // Fetch project files (limit to source code, prioritized by file_type)
  const { data: files } = await serviceClient
    .from("project_files")
    .select("file_path, file_name, raw_content, file_type")
    .eq("project_id", projectId)
    .in("file_type", ["source_code", "dependency", "build_config"])
    .order("file_type")
    .limit(30);

  if (!files || files.length === 0) return [];

  // Filter by tech patterns and return decrypted content
  const relevant: Array<{ file_path: string; content: string }> = [];
  const BUDGET = 30_000; // 30K chars total budget
  let totalChars = 0;

  for (const file of files) {
    if (!file.raw_content) continue;

    const filePath = file.file_path ?? file.file_name;
    const matchesPattern = patterns.some(
      (p) => filePath.toLowerCase().includes(p),
    );

    if (!matchesPattern) continue;

    try {
      const content = decryptContent(file.raw_content);
      if (totalChars + content.length > BUDGET) continue;

      relevant.push({ file_path: filePath, content });
      totalChars += content.length;
    } catch {
      // Skip files that can't be decrypted
    }
  }

  return relevant;
}

// ─── Status Tracking ────────────────────────────────────────────────

async function updateInjectionStatus(
  learningPathId: string,
  status: "pending" | "injecting" | "done" | "failed",
  progress?: { done: number; total: number },
): Promise<void> {
  // Use untyped client since learning_paths.metadata is not in Database types
  const untypedClient = createUntypedServiceClient();

  const metadata: Record<string, unknown> = {
    code_injection_status: status,
  };

  if (progress) {
    metadata.code_injection_progress = progress;
  }

  // Read existing metadata and merge
  const { data: existing } = await untypedClient
    .from("learning_paths")
    .select("metadata")
    .eq("id", learningPathId)
    .single();

  const existingMeta = (existing?.metadata as Record<string, unknown>) ?? {};

  await untypedClient
    .from("learning_paths")
    .update({
      metadata: { ...existingMeta, ...metadata },
    })
    .eq("id", learningPathId);
}

// ─── Main Function ──────────────────────────────────────────────────

/**
 * Replace code_example sections with user's project code.
 *
 * Only code_example sections are affected.
 * Uses minimal LLM calls (code replacement only, ~200-300 tokens per section).
 *
 * Status tracked in learning_paths.metadata:
 * - code_injection_status: "pending" | "injecting" | "done" | "failed"
 * - code_injection_progress: { done: number, total: number }
 */
export async function injectProjectCode(
  input: CodeInjectionInput,
): Promise<CodeInjectionResult> {
  const { learningPathId, projectId, userId, modules } = input;
  const errors: string[] = [];
  let injectedCount = 0;

  // Get LLM provider
  const llmKeyResult = await getDefaultLlmKeyWithDiagnosis(userId);
  if (!llmKeyResult.data) {
    const error = `LLM key not available: ${llmKeyErrorMessage(llmKeyResult.error)}`;
    await updateInjectionStatus(learningPathId, "failed");
    return { injectedCount: 0, errors: [error] };
  }

  const provider = createLLMProvider(
    llmKeyResult.data.provider,
    llmKeyResult.data.apiKey,
  );

  // Count total code_example sections
  const totalCodeSections = modules.reduce(
    (sum, m) => sum + m.sections.filter((s) => s.type === "code_example").length,
    0,
  );

  if (totalCodeSections === 0) {
    await updateInjectionStatus(learningPathId, "done", { done: 0, total: 0 });
    return { injectedCount: 0, errors: [] };
  }

  await updateInjectionStatus(learningPathId, "injecting", {
    done: 0,
    total: totalCodeSections,
  });

  const serviceClient = createServiceClient();

  // Get user locale
  const { data: pathData } = await serviceClient
    .from("learning_paths")
    .select("locale")
    .eq("id", learningPathId)
    .single();

  const locale = (pathData?.locale as string) ?? "ko";

  // Process each module
  for (const mod of modules) {
    // Find relevant project files for this tech
    const projectFiles = await findRelevantFiles(projectId, mod.techName);
    if (projectFiles.length === 0) continue;

    // Read current module content from DB
    const { data: moduleData } = await serviceClient
      .from("learning_modules")
      .select("content")
      .eq("id", mod.moduleId)
      .single();

    if (!moduleData) continue;

    const content = moduleData.content as unknown as ModuleContent;
    if (!content.sections || content.sections.length === 0) continue;

    let modified = false;
    const updatedSections = [...content.sections];

    for (let i = 0; i < updatedSections.length; i++) {
      const section = updatedSections[i];
      if (section.type !== "code_example") continue;

      // Find best matching project file
      const bestFile = projectFiles[0]; // Simple: use first relevant file

      try {
        const prompt = buildCodeInjectionPrompt(
          section,
          bestFile.content.slice(0, 3000), // Limit to 3K chars
          bestFile.file_path,
          locale,
        );

        const response = await provider.chat({
          messages: [{ role: "user", content: prompt }],
          maxTokens: 1024,
        });

        // Parse response
        let cleaned = response.content.trim();
        if (cleaned.startsWith("```")) {
          cleaned = cleaned
            .replace(/^```(?:json)?\s*\n?/, "")
            .replace(/\n?```\s*$/, "");
        }

        const parsed = JSON.parse(cleaned) as {
          code: string;
          body: string;
        };

        if (parsed.code && parsed.code.trim().length > 10) {
          updatedSections[i] = {
            ...section,
            code: parsed.code,
            body: parsed.body || section.body,
          };
          modified = true;
          injectedCount++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Module ${mod.moduleId}, section ${i}: ${message}`);
      }

      // Update progress
      await updateInjectionStatus(learningPathId, "injecting", {
        done: injectedCount,
        total: totalCodeSections,
      });
    }

    // Update module content if modified
    if (modified) {
      await serviceClient
        .from("learning_modules")
        .update({
          content: {
            ...content,
            sections: updatedSections,
            _code_injected_at: new Date().toISOString(),
          } as unknown as Json,
        })
        .eq("id", mod.moduleId);

      // Revalidate module page so UI auto-refreshes (Design Section 2.5)
      revalidatePath(`/learning/${learningPathId}`);
    }
  }

  // Final status
  const finalStatus = errors.length > 0 && injectedCount === 0 ? "failed" : "done";
  await updateInjectionStatus(learningPathId, finalStatus, {
    done: injectedCount,
    total: totalCodeSections,
  });

  return { injectedCount, errors };
}
