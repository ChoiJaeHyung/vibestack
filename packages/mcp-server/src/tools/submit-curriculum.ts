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

        return {
          content: [
            {
              type: "text" as const,
              text: `Curriculum submitted successfully!\n\n- Learning Path ID: ${result.learningPathId}\n- Title: ${result.title}\n- Total Modules: ${result.totalModules}\n\nThe user can now access the learning path at https://vibeuniv.com to start learning.`,
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
