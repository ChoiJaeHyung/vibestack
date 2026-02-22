import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { scanProjectFiles } from "../lib/file-scanner.js";
import { VibeStackClient } from "../lib/api-client.js";

export const syncProjectSchema = {
  project_name: z.string().optional().describe("Name for the project (defaults to directory name)"),
  description: z.string().optional().describe("Short description of the project"),
};

export function registerSyncProject(server: McpServer, client: VibeStackClient): void {
  server.tool(
    "vibestack_sync_project",
    "Sync current project's tech stack information to VibeStack platform for analysis and learning",
    syncProjectSchema,
    { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    async ({ project_name, description }) => {
      try {
        const cwd = process.cwd();
        const defaultName = cwd.split("/").pop() || "unnamed-project";

        console.error(`[vibestack] Scanning project files in ${cwd}...`);
        const files = await scanProjectFiles(cwd);

        if (files.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No tech stack files detected in the current directory. Make sure you're in a project root directory.",
              },
            ],
            isError: true,
          };
        }

        console.error(`[vibestack] Creating/updating project...`);
        const project = await client.createProject({
          name: project_name || defaultName,
          description,
        });

        console.error(`[vibestack] Uploading ${files.length} files...`);
        await client.uploadFiles(project.id, files);

        const fileList = files.map((f) => `  - ${f.relativePath} (${f.size} bytes)`).join("\n");

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Project "${project.name}" synced successfully!`,
                `Project ID: ${project.id}`,
                "",
                `Detected ${files.length} tech stack files:`,
                fileList,
                "",
                `Next step: Use vibestack_analyze to analyze the tech stack.`,
              ].join("\n"),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Failed to sync project: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
