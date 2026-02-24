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
                "=".repeat(50),
                "=== 필수 다음 단계: 교육적 분석 ===",
                "=".repeat(50),
                "",
                "더 좋은 학습 커리큘럼을 위해 이 프로젝트를 분석해 주세요.",
                "프로젝트의 주요 소스 파일들을 읽고, 아래 JSON 형식으로 분석한 후",
                "`vibeuniv_submit_analysis` 도구로 전송해 주세요.",
                "",
                "```json",
                JSON.stringify({
                  project_overview: {
                    one_liner: "이 앱이 무엇을 하는지 한 문장",
                    app_type: "saas | ecommerce | dashboard | tool | api_service | other",
                    core_features: ["핵심 기능1", "핵심 기능2", "핵심 기능3"],
                  },
                  file_roles: [
                    { path: "src/example.ts", role: "이 파일의 역할 한 문장", complexity: 3 },
                  ],
                  architecture_summary: "전체 아키텍처를 2-3문장으로 설명",
                  learning_priorities: {
                    start_with: ["먼저 배울 파일/개념"],
                    focus_on: ["집중적으로 학습할 것"],
                    skip_for_now: ["나중에 봐도 되는 것"],
                  },
                }, null, 2),
                "```",
                "",
                "도구 호출 예시:",
                `vibeuniv_submit_analysis({ project_id: "${project.id}", analysis: <위 JSON> })`,
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
