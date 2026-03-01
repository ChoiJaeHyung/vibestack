import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VibeUnivClient } from "../lib/api-client.js";

export const submitAnalysisSchema = {
  project_id: z.string().describe("The VibeUniv project ID"),
  analysis: z
    .object({})
    .passthrough()
    .describe(
      "Educational analysis JSON containing project_overview, user_flows, file_analysis, architecture, code_quality, learning_priorities, and repeated_patterns"
    ),
};

export function registerSubmitAnalysis(server: McpServer, client: VibeUnivClient): void {
  server.tool(
    "vibeuniv_submit_analysis",
    "Submit educational analysis of the project for personalized learning curriculum generation",
    submitAnalysisSchema,
    { readOnlyHint: false, openWorldHint: true },
    async ({ project_id, analysis }) => {
      try {
        console.error(`[vibeuniv] Submitting educational analysis for project ${project_id}...`);
        await client.submitEducationalAnalysis(project_id, analysis as Record<string, unknown>);

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `교육적 분석이 성공적으로 제출되었습니다! (Project: ${project_id})`,
                `이 데이터는 맞춤 학습 커리큘럼 생성에 활용됩니다.`,
                ``,
                `다음 단계: vibeuniv_analyze를 호출하여 기술 스택을 분석하세요.`,
                `분석이 완료되면 https://vibeuniv.com 에서 프로젝트를 확인할 수 있습니다.`,
              ].join("\n"),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to submit educational analysis: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
