import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VibeUnivClient } from "../lib/api-client.js";

export const analyzeSchema = {
  project_id: z.string().describe("The VibeUniv project ID to analyze"),
};

export function registerAnalyze(server: McpServer, client: VibeUnivClient): void {
  server.tool(
    "vibeuniv_analyze",
    "Trigger AI analysis of the project's tech stack and get results",
    analyzeSchema,
    { readOnlyHint: true, openWorldHint: true },
    async ({ project_id }) => {
      try {
        console.error(`[vibeuniv] Triggering analysis for project ${project_id}...`);
        const result = await client.triggerAnalysis(project_id);

        if (result.status === "failed") {
          return {
            content: [
              {
                type: "text" as const,
                text: "Analysis failed. Please try again or check that files have been uploaded.",
              },
            ],
            isError: true,
          };
        }

        let output = `Analysis completed for project ${project_id}\n`;
        output += `Analysis ID: ${result.id}\n\n`;

        if (result.summary) {
          output += `Summary:\n${result.summary}\n\n`;
        }

        if (result.techStack && result.techStack.length > 0) {
          output += "Detected Tech Stack:\n";
          const grouped = new Map<string, typeof result.techStack>();

          for (const item of result.techStack) {
            const existing = grouped.get(item.category) || [];
            existing.push(item);
            grouped.set(item.category, existing);
          }

          for (const [category, items] of grouped) {
            output += `\n  [${category}]\n`;
            for (const item of items) {
              const version = item.version ? ` v${item.version}` : "";
              const confidence = Math.round(item.confidence * 100);
              output += `    - ${item.name}${version} (${confidence}% confidence)\n`;
            }
          }

          output += "\nNext step: Use vibeuniv_get_learning to get personalized learning recommendations.";
        }

        return {
          content: [{ type: "text" as const, text: output }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Failed to analyze project: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
