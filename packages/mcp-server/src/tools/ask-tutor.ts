import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VibeUnivClient } from "../lib/api-client.js";

export const askTutorSchema = {
  project_id: z.string().describe("The VibeUniv project ID"),
  question: z.string().describe("Question to ask the AI tutor about your project's tech stack"),
};

export function registerAskTutor(server: McpServer, client: VibeUnivClient): void {
  server.tool(
    "vibeuniv_ask_tutor",
    "Ask the AI tutor a question about your project's tech stack with full project context",
    askTutorSchema,
    { readOnlyHint: true, openWorldHint: true },
    async ({ project_id, question }) => {
      try {
        console.error(`[vibeuniv] Asking tutor for project ${project_id}...`);
        const result = await client.askTutor(project_id, question);

        let output = result.answer;
        output += `\n\n(conversation_id: ${result.conversationId})`;

        return {
          content: [{ type: "text" as const, text: output }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Failed to get tutor response: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
