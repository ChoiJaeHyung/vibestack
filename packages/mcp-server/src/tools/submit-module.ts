import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VibeUnivClient } from "../lib/api-client.js";

export const submitModuleSchema = {
  project_id: z.string().describe("The VibeUniv project ID"),
  learning_path_id: z.string().describe("The learning path ID from vibeuniv_create_curriculum"),
  module_order: z
    .number()
    .int()
    .min(1)
    .describe("Module order (1-based)"),
  title: z.string().describe("Module title"),
  description: z.string().describe("Module description"),
  module_type: z
    .enum(["concept", "practical", "quiz", "project_walkthrough"])
    .describe("Module type"),
  tech_name: z.string().describe("Technology name (must match tech stack)"),
  estimated_minutes: z
    .number()
    .optional()
    .describe("Estimated minutes to complete"),
  concept_keys: z
    .array(z.string())
    .optional()
    .describe("KB concept_key identifiers this module teaches (optional, for ontology tagging)"),
  content: z
    .object({})
    .passthrough()
    .describe("Module content with sections array"),
};

export function registerSubmitModule(server: McpServer, client: VibeUnivClient): void {
  server.tool(
    "vibeuniv_submit_module",
    "Submit a single module to an existing draft curriculum. Call this immediately after generating each module's content. The curriculum auto-activates when all modules are submitted.",
    submitModuleSchema,
    { readOnlyHint: false, openWorldHint: true },
    async ({ project_id, learning_path_id, module_order, title, description, module_type, tech_name, estimated_minutes, concept_keys, content }) => {
      try {
        console.error(`[vibeuniv] Submitting module ${module_order} for path ${learning_path_id}...`);

        const result = await client.submitModule(project_id, learning_path_id, {
          module_order,
          title,
          description,
          module_type,
          tech_name,
          estimated_minutes,
          concept_keys,
          content: content as { sections: unknown[] },
        });

        const locale = await client.getUserLocale();
        const en = locale === "en";

        const progressBar = `[${result.submitted}/${result.total}]`;

        if (result.status === "active") {
          // All modules submitted — curriculum complete!
          const message = en
            ? [
                `${progressBar} All modules submitted! Curriculum is now ACTIVE! 🎉`,
                ``,
                `- Module "${title}" saved (ID: ${result.moduleId})`,
                `- Curriculum status: active`,
                ``,
                `${"=".repeat(50)}`,
                `🎓 Ready to learn!`,
                `${"=".repeat(50)}`,
                ``,
                `Your personalized learning curriculum is ready.`,
                `Start learning right away at the link below:`,
                ``,
                `👉 https://vibeuniv.com`,
                ``,
                `Start your project-based learning journey with an AI tutor!`,
              ]
            : [
                `${progressBar} 모든 모듈이 제출되었습니다! 커리큘럼이 활성화되었습니다! 🎉`,
                ``,
                `- 모듈 "${title}" 저장 완료 (ID: ${result.moduleId})`,
                `- 커리큘럼 상태: active`,
                ``,
                `${"=".repeat(50)}`,
                `🎓 학습 준비 완료!`,
                `${"=".repeat(50)}`,
                ``,
                `맞춤 학습 커리큘럼이 준비되었습니다.`,
                `아래 링크에서 바로 학습을 시작할 수 있습니다:`,
                ``,
                `👉 https://vibeuniv.com`,
                ``,
                `AI 튜터와 함께 프로젝트 기반 학습을 시작해보세요!`,
              ];

          return {
            content: [
              {
                type: "text" as const,
                text: message.join("\n"),
              },
            ],
          };
        }

        // Module submitted, more to go
        const message = en
          ? [
              `${progressBar} Module ${module_order} submitted successfully!`,
              ``,
              `- Module "${title}" saved (ID: ${result.moduleId})`,
              `- Progress: ${result.submitted} of ${result.total} modules submitted`,
              ``,
              `Continue with the next module.`,
            ]
          : [
              `${progressBar} 모듈 ${module_order} 제출 완료!`,
              ``,
              `- 모듈 "${title}" 저장 완료 (ID: ${result.moduleId})`,
              `- 진행률: ${result.submitted}/${result.total} 모듈 제출됨`,
              ``,
              `다음 모듈을 계속 진행하세요.`,
            ];

        return {
          content: [
            {
              type: "text" as const,
              text: message.join("\n"),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const locale = await client.getUserLocale().catch(() => "ko" as const);

        // Parse validation errors from server response (now returns all errors at once)
        const isMultiError = message.includes("validation errors:");

        const hint = locale === "en"
          ? [
              ``,
              `--- Fix Guide ---`,
              `All errors are listed above. Fix ALL of them before resubmitting.`,
              `Key rules: explanation body >= 800 chars (beginner) or 400 chars (other), code_example needs separate "code" field, quiz_question needs 4 options + quiz_answer(0-3) + quiz_explanation, challenge needs starter_code + answer_code.`,
              `The error messages show current character counts — use them to know exactly how much more to write.`,
            ]
          : [
              ``,
              `--- 수정 가이드 ---`,
              `위의 모든 에러를 한번에 수정한 후 다시 제출하세요.`,
              `핵심 규칙: explanation body >= 800자(초급) 또는 400자(그 외), code_example은 "body"와 별도로 "code" 필드 필요, quiz_question은 4개 선택지 + quiz_answer(0-3) + quiz_explanation, challenge는 starter_code + answer_code 필요.`,
              `에러 메시지에 현재 글자 수가 표시됩니다 — 얼마나 더 써야 하는지 확인하세요.`,
            ];

        return {
          content: [
            {
              type: "text" as const,
              text: isMultiError
                ? `Module submission failed:\n${message}\n${hint.join("\n")}`
                : `Module submission failed: ${message}\n${hint.join("\n")}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
