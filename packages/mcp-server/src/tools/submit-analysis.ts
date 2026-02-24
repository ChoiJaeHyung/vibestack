import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VibeStackClient } from "../lib/api-client.js";

export const submitAnalysisSchema = {
  project_id: z.string().describe("The VibeStack project ID"),
  analysis: z
    .object({})
    .passthrough()
    .describe(
      "Educational analysis JSON containing project_overview, user_flows, file_analysis, architecture, code_quality, learning_priorities, and repeated_patterns"
    ),
};

export function registerSubmitAnalysis(server: McpServer, client: VibeStackClient): void {
  server.tool(
    "vibeuniv_submit_analysis",
    "Submit educational analysis of the project for personalized learning curriculum generation",
    submitAnalysisSchema,
    { readOnlyHint: false, openWorldHint: true },
    async ({ project_id, analysis }) => {
      try {
        console.error(`[vibestack] Submitting educational analysis for project ${project_id}...`);
        await client.submitEducationalAnalysis(project_id, analysis as Record<string, unknown>);

        return {
          content: [
            {
              type: "text" as const,
              text: `Educational analysis submitted successfully for project ${project_id}. This data will be used to generate a more personalized learning curriculum.`,
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
