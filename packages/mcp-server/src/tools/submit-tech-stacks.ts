import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VibeUnivClient } from "../lib/api-client.js";
import type { TechStackSubmission } from "../types.js";

export const submitTechStacksSchema = {
  project_id: z.string().describe("The VibeUniv project ID"),
  analysis: z
    .object({})
    .passthrough()
    .describe(
      "Analysis result containing technologies array and optional architecture_summary"
    ),
};

export function registerSubmitTechStacks(server: McpServer, client: VibeUnivClient): void {
  server.tool(
    "vibeuniv_submit_tech_stacks",
    "Submit tech stack analysis results for a project. Use after vibeuniv_analyze returns file contents for local analysis.",
    submitTechStacksSchema,
    { readOnlyHint: false, openWorldHint: true },
    async ({ project_id, analysis }) => {
      try {
        console.error(`[vibeuniv] Submitting tech stacks for project ${project_id}...`);

        const submission = analysis as unknown as TechStackSubmission;

        // Basic client-side validation
        if (
          !submission.technologies ||
          !Array.isArray(submission.technologies) ||
          submission.technologies.length === 0
        ) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Invalid submission: technologies array is required and must have at least 1 entry.",
              },
            ],
            isError: true,
          };
        }

        const result = await client.submitTechStacks(project_id, submission);

        let output = `Tech stack analysis submitted successfully!\n\n`;
        output += `- Technologies saved: ${result.savedCount}\n`;
        output += `- Project status: ${result.projectStatus}\n\n`;
        output += `Next step: Use vibeuniv_generate_curriculum to create a learning curriculum.`;

        return {
          content: [{ type: "text" as const, text: output }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to submit tech stacks: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
