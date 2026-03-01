import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { scanProjectFiles } from "../lib/file-scanner.js";
import { VibeUnivClient } from "../lib/api-client.js";

export const syncProjectSchema = {
  project_name: z.string().optional().describe("Name for the project (defaults to directory name)"),
  description: z.string().optional().describe("Short description of the project"),
};

export function registerSyncProject(server: McpServer, client: VibeUnivClient): void {
  server.tool(
    "vibeuniv_sync_project",
    "Sync current project's tech stack information to VibeUniv platform for analysis and learning",
    syncProjectSchema,
    { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    async ({ project_name, description }) => {
      try {
        const cwd = process.cwd();
        const defaultName = cwd.split("/").pop() || "unnamed-project";

        console.error(`[vibeuniv] Scanning project files in ${cwd}...`);
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

        console.error(`[vibeuniv] Creating/updating project...`);
        const project = await client.createProject({
          name: project_name || defaultName,
          description,
        });

        console.error(`[vibeuniv] Uploading ${files.length} files...`);
        await client.uploadFiles(project.id, files);

        const fileList = files.map((f) => `  - ${f.relativePath} (${f.size} bytes)`).join("\n");

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `프로젝트 "${project.name}" 동기화 완료!`,
                `Project ID: ${project.id}`,
                "",
                `${files.length}개 파일 업로드됨:`,
                fileList,
                "",
                "다음 단계: 프로젝트 소스 파일을 읽고 교육적 분석을 제출하세요.",
                "",
                `vibeuniv_submit_analysis({ project_id: "${project.id}", analysis: {`,
                `  project_overview: { one_liner, app_type, core_features },`,
                `  file_roles: [{ path, role, complexity(1-5) }],`,
                `  architecture_summary, learning_priorities: { start_with, focus_on, skip_for_now }`,
                `} })`,
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
