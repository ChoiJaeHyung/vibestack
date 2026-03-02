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
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to submit curriculum: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
