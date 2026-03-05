import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VibeUnivClient } from "../lib/api-client.js";

export const createCurriculumSchema = {
  project_id: z.string().describe("The VibeUniv project ID"),
  title: z.string().describe("Curriculum title"),
  description: z.string().describe("Curriculum description"),
  difficulty: z
    .enum(["beginner", "intermediate", "advanced"])
    .describe("Target difficulty level"),
  total_modules: z
    .number()
    .int()
    .min(1)
    .max(50)
    .describe("Total number of modules that will be submitted"),
  estimated_hours: z
    .number()
    .optional()
    .describe("Estimated total hours to complete the curriculum"),
};

export function registerCreateCurriculum(server: McpServer, client: VibeUnivClient): void {
  server.tool(
    "vibeuniv_create_curriculum",
    "Create a draft learning curriculum (learning path) for the project. This creates the curriculum shell — then submit each module individually with vibeuniv_submit_module. The curriculum auto-activates when all modules are submitted.",
    createCurriculumSchema,
    { readOnlyHint: false, openWorldHint: true },
    async ({ project_id, title, description, difficulty, total_modules, estimated_hours }) => {
      try {
        console.error(`[vibeuniv] Creating draft curriculum for project ${project_id}...`);

        const result = await client.createCurriculum(project_id, {
          title,
          description,
          difficulty,
          total_modules,
          estimated_hours,
        });

        const locale = await client.getUserLocale();
        const en = locale === "en";

        const message = en
          ? [
              `Draft curriculum created successfully!`,
              ``,
              `- Learning Path ID: ${result.learningPathId}`,
              `- Status: ${result.status}`,
              `- Total modules to submit: ${total_modules}`,
              ``,
              `Next steps:`,
              `For each module, generate the content yourself following the JSON schema from vibeuniv_generate_curriculum, then submit immediately with vibeuniv_submit_module.`,
              ``,
              `The curriculum will auto-activate when all ${total_modules} modules are submitted.`,
              ``,
              `If some module submissions fail, you can call vibeuniv_create_curriculum again to start a fresh draft and resubmit all modules.`,
            ]
          : [
              `커리큘럼 초안이 생성되었습니다!`,
              ``,
              `- Learning Path ID: ${result.learningPathId}`,
              `- 상태: ${result.status}`,
              `- 제출할 모듈 수: ${total_modules}`,
              ``,
              `다음 단계:`,
              `각 모듈마다 vibeuniv_generate_curriculum의 JSON 스키마에 따라 직접 콘텐츠를 생성한 후, 즉시 vibeuniv_submit_module로 제출하세요.`,
              ``,
              `${total_modules}개 모듈이 모두 제출되면 커리큘럼이 자동으로 활성화됩니다.`,
              ``,
              `일부 모듈 제출이 실패하면 vibeuniv_create_curriculum을 다시 호출하여 새 초안을 만들고 모든 모듈을 다시 제출할 수 있습니다.`,
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
              text: `Failed to create curriculum: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
