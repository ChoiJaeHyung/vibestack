import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VibeUnivClient } from "../lib/api-client.js";

export const getLearningSchema = {
  project_id: z.string().describe("The VibeUniv project ID"),
};

export function registerGetLearning(server: McpServer, client: VibeUnivClient): void {
  server.tool(
    "vibeuniv_get_learning",
    "Get personalized learning recommendations based on the project's tech stack",
    getLearningSchema,
    { readOnlyHint: true, openWorldHint: true },
    async ({ project_id }) => {
      try {
        console.error(`[vibeuniv] Fetching learning path for project ${project_id}...`);
        const learningPath = await client.getLearningPath(project_id);

        let output = `Learning Path: ${learningPath.title}\n`;
        output += `Difficulty: ${learningPath.difficulty}\n`;
        output += `Learning Path ID: ${learningPath.id}\n`;
        if (learningPath.description) {
          output += `${learningPath.description}\n`;
        }
        output += `Created: ${learningPath.createdAt}\n\n`;

        if (learningPath.modules.length === 0) {
          output +=
            "No learning modules available yet. Run vibeuniv_analyze first to generate recommendations.";
        } else {
          output += `${learningPath.modules.length} Learning Module(s):\n`;

          for (const mod of learningPath.modules) {
            output += `\n  ${mod.order}. ${mod.title}\n`;
            output += `     ${mod.description}\n`;
            if (mod.topics.length > 0) {
              output += `     Topics: ${mod.topics.join(", ")}\n`;
            }
          }

          output += "\nUse vibeuniv_ask_tutor to ask questions about any of these topics.";
        }

        return {
          content: [{ type: "text" as const, text: output }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            { type: "text" as const, text: `Failed to get learning path: ${message}` },
          ],
          isError: true,
        };
      }
    }
  );
}
