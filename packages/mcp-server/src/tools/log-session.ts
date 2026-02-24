import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VibeUnivClient } from "../lib/api-client.js";

export const logSessionSchema = {
  project_id: z.string().describe("The VibeUniv project ID"),
  summary: z.string().describe("Summary of today's coding session"),
  files_changed: z
    .array(z.string())
    .optional()
    .describe("List of files changed during the session"),
};

export function registerLogSession(server: McpServer, client: VibeUnivClient): void {
  server.tool(
    "vibeuniv_log_session",
    "Log today's coding session summary to VibeUniv",
    logSessionSchema,
    { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    async ({ project_id, summary, files_changed }) => {
      try {
        await client.logSession(project_id, {
          summary,
          filesChanged: files_changed,
        });

        let output = "Session logged successfully!\n\n";
        output += `Summary: ${summary}\n`;

        if (files_changed && files_changed.length > 0) {
          output += `\nFiles changed (${files_changed.length}):\n`;
          output += files_changed.map((f) => `  - ${f}`).join("\n");
        }

        return {
          content: [{ type: "text" as const, text: output }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Failed to log session: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
