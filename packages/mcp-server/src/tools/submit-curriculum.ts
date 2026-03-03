import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VibeUnivClient } from "../lib/api-client.js";

export const submitCurriculumSchema = {
  project_id: z.string().describe("The VibeUniv project ID"),
  curriculum: z
    .object({})
    .passthrough()
    .describe(
      "Curriculum JSON containing title, description, difficulty, estimated_hours, and modules array with content sections"
    ),
};

export function registerSubmitCurriculum(server: McpServer, client: VibeUnivClient): void {
  server.tool(
    "vibeuniv_submit_curriculum",
    "Submit a generated learning curriculum for the project. The curriculum should follow the JSON schema from vibeuniv_generate_curriculum.",
    submitCurriculumSchema,
    { readOnlyHint: false, openWorldHint: true },
    async ({ project_id, curriculum }) => {
      try {
        console.error(`[vibeuniv] Submitting curriculum for project ${project_id}...`);
        const result = await client.submitCurriculum(
          project_id,
          curriculum as Record<string, unknown>,
        );
        const locale = await client.getUserLocale();

        const message = locale === "en"
          ? [
              `Curriculum created successfully!`,
              ``,
              `- Learning Path ID: ${result.learningPathId}`,
              `- Title: ${result.title}`,
              `- Total modules: ${result.totalModules}`,
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
              `커리큘럼이 성공적으로 생성되었습니다!`,
              ``,
              `- Learning Path ID: ${result.learningPathId}`,
              `- 제목: ${result.title}`,
              `- 총 모듈 수: ${result.totalModules}`,
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
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const locale = await client.getUserLocale().catch(() => "ko");

        const hint = locale === "en"
          ? [
              ``,
              `--- Validation Guide ---`,
              `Server minimum requirements:`,
              `• 10+ modules (aim for 10-15)`,
              `• Beginner: 5+ sections/module, 400+ chars/explanation`,
              `• Other: 3+ sections/module, 200+ chars/explanation`,
              `• Each module needs at least 1 code_example + 1 quiz_question`,
              `• quiz_question needs exactly 4 options + quiz_explanation`,
              ``,
              `Fix the failing module/section and resubmit — no need to regenerate everything.`,
            ]
          : [
              ``,
              `--- 검증 가이드 ---`,
              `서버 최소 요구사항:`,
              `• 10개 이상 모듈 (10-15개 권장)`,
              `• 초급: 모듈당 5개↑ 섹션, explanation 400자↑`,
              `• 그 외: 모듈당 3개↑ 섹션, explanation 200자↑`,
              `• 모듈당 code_example 1개↑ + quiz_question 1개↑ 필수`,
              `• quiz_question은 정확히 4개 선택지 + quiz_explanation 필수`,
              ``,
              `실패한 모듈/섹션만 수정해서 다시 제출하세요 — 전체 재생성 불필요.`,
            ];

        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to submit curriculum: ${message}\n${hint.join("\n")}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
