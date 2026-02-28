import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VibeUnivClient } from "../lib/api-client.js";

export const analyzeSchema = {
  project_id: z.string().describe("The VibeUniv project ID to analyze"),
  force: z
    .boolean()
    .default(false)
    .describe("Force re-analysis even if existing tech stacks exist"),
};

export function registerAnalyze(server: McpServer, client: VibeUnivClient): void {
  server.tool(
    "vibeuniv_analyze",
    "Trigger AI analysis of the project's tech stack and get results",
    analyzeSchema,
    { readOnlyHint: true, openWorldHint: true },
    async ({ project_id, force }) => {
      try {
        console.error(`[vibeuniv] Fetching project detail for ${project_id}...`);
        const detail = await client.getProjectDetail(project_id);

        // If existing analysis exists and force is not set, return existing results
        if (detail.existingTechStacks.length > 0 && !force) {
          let output = `Project "${detail.name}" already has ${detail.existingTechStacks.length} detected technologies:\n\n`;

          const grouped = new Map<string, typeof detail.existingTechStacks>();
          for (const item of detail.existingTechStacks) {
            const existing = grouped.get(item.category) || [];
            existing.push(item);
            grouped.set(item.category, existing);
          }

          for (const [category, items] of grouped) {
            output += `  [${category}]\n`;
            for (const item of items) {
              const version = item.version ? ` v${item.version}` : "";
              const confidence = Math.round(item.confidence * 100);
              output += `    - ${item.name}${version} (${confidence}% confidence)\n`;
            }
            output += "\n";
          }

          output += "To re-analyze, call vibeuniv_analyze with force: true.\n";
          output += "Next step: Use vibeuniv_generate_curriculum to create a learning curriculum.";

          return {
            content: [{ type: "text" as const, text: output }],
          };
        }

        // No files uploaded
        if (detail.files.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Project "${detail.name}" has no files uploaded. Upload files first using vibeuniv_upload_files.`,
              },
            ],
            isError: true,
          };
        }

        // Build analysis instructions for local AI
        let output = `## Tech Stack Analysis Request\n\n`;
        output += `Analyze the following project files and identify all technologies used.\n\n`;

        // Include existing tech stacks as reference (for re-analysis)
        if (detail.existingTechStacks.length > 0) {
          output += `### Previous Analysis (for reference)\n\n`;
          output += `The project was previously analyzed and the following technologies were detected. Use this as a starting point but verify and update based on the actual file contents:\n\n`;
          for (const tech of detail.existingTechStacks) {
            output += `- ${tech.name} (${tech.category}, confidence: ${Math.round(tech.confidence * 100)}%)\n`;
          }
          output += `\n`;
        }

        // File contents
        output += `### Project Files\n\n`;

        for (const file of detail.files) {
          output += `#### ${file.file_path}\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
        }

        // If there are more files than returned
        if (detail.allFileList && detail.allFileList.length > detail.files.length) {
          output += `### Additional Files (content not included, ${detail.allFileList.length - detail.files.length} more)\n\n`;
          for (const f of detail.allFileList.slice(detail.files.length)) {
            output += `- ${f.file_path}\n`;
          }
          output += `\n`;
        }

        // Analysis instructions
        output += `### Analysis Instructions\n\n`;
        output += `For each technology detected, provide:\n`;
        output += `- **name**: Technology name (e.g., "Next.js", "React", "TypeScript")\n`;
        output += `- **category**: One of: framework, language, database, auth, deploy, styling, testing, build_tool, library, other\n`;
        output += `- **version**: Version string if detectable (e.g., "15.1.0"), omit if unknown\n`;
        output += `- **confidence**: 0.0 to 1.0 — how confident you are\n`;
        output += `- **importance**: One of: core (essential to the project), supporting (actively used), dev_dependency (development only)\n`;
        output += `- **description**: One sentence describing how this tech is used in the project\n\n`;
        output += `Also provide an **architecture_summary** — a 2-3 sentence description of the overall project architecture.\n\n`;
        output += `### Submit Results\n\n`;
        output += `After completing the analysis, submit the results using:\n\n`;
        output += `vibeuniv_submit_tech_stacks({\n`;
        output += `  project_id: "${project_id}",\n`;
        output += `  analysis: {\n`;
        output += `    technologies: [ { name, category, version, confidence, importance, description }, ... ],\n`;
        output += `    architecture_summary: "..."\n`;
        output += `  }\n`;
        output += `})\n`;

        return {
          content: [{ type: "text" as const, text: output }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Failed to fetch project detail: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
