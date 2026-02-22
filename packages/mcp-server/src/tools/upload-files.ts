import { z } from "zod";
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, relative, basename } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VibeStackClient } from "../lib/api-client.js";
import type { ProjectFile } from "../types.js";

const MAX_FILE_SIZE = 50 * 1024; // 50KB

export const uploadFilesSchema = {
  project_id: z.string().describe("The VibeStack project ID"),
  file_paths: z.array(z.string()).describe("Array of file paths to upload (relative or absolute)"),
};

export function registerUploadFiles(server: McpServer, client: VibeStackClient): void {
  server.tool(
    "vibestack_upload_files",
    "Upload specific project files to VibeStack for detailed analysis",
    uploadFilesSchema,
    { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    async ({ project_id, file_paths }) => {
      try {
        const cwd = process.cwd();
        const files: ProjectFile[] = [];
        const errors: string[] = [];

        for (const filePath of file_paths) {
          const absolutePath = resolve(cwd, filePath);

          try {
            const fileStat = await stat(absolutePath);
            if (!fileStat.isFile()) {
              errors.push(`${filePath}: not a file`);
              continue;
            }

            let content = await readFile(absolutePath, "utf-8");
            if (Buffer.byteLength(content, "utf-8") > MAX_FILE_SIZE) {
              content = content.slice(0, MAX_FILE_SIZE);
            }

            const sha256 = createHash("sha256").update(content, "utf-8").digest("hex");

            files.push({
              name: basename(absolutePath),
              relativePath: relative(cwd, absolutePath),
              size: fileStat.size,
              content,
              sha256,
            });
          } catch {
            errors.push(`${filePath}: file not found or unreadable`);
          }
        }

        if (files.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No valid files to upload.\nErrors:\n${errors.map((e) => `  - ${e}`).join("\n")}`,
              },
            ],
            isError: true,
          };
        }

        await client.uploadFiles(project_id, files);

        let result = `Successfully uploaded ${files.length} file(s):\n`;
        result += files.map((f) => `  - ${f.relativePath} (${f.size} bytes)`).join("\n");

        if (errors.length > 0) {
          result += `\n\nSkipped ${errors.length} file(s):\n`;
          result += errors.map((e) => `  - ${e}`).join("\n");
        }

        return {
          content: [{ type: "text" as const, text: result }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Failed to upload files: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
