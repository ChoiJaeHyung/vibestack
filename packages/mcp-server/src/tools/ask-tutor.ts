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
        console.error(`[vibeuniv] Fetching tutor context for project ${project_id}...`);
        const context = await client.getTutorContext(project_id);

        const locale = await client.getUserLocale();

        // Build tutor instructions for local AI
        let output = `## AI Tutor — Answer the student's question below\n\n`;

        if (locale === "en") {
          output += `You are a friendly tutor for a "vibe coder" — someone who built a working app with AI tools but wants to understand WHY it works.\n\n`;
          output += `**Style:** Reference the student's actual code with file paths. Explain simply with analogies. ~500 words max. Be encouraging.\n`;
          output += `**Rules:** Never make up code not in the project. No filler ("Great question!"). Admit unknowns honestly. **Write ALL in English.**\n\n`;
        } else {
          output += `You are a friendly tutor for a "vibe coder" — someone who built a working app with AI tools but wants to understand WHY it works.\n\n`;
          output += `**Style:** Reference the student's actual code with file paths. Explain simply with analogies. ~500 words max. Be encouraging.\n`;
          output += `**Rules:** Never make up code not in the project. No filler ("Great question!"). Admit unknowns honestly. **반드시 한국어 해요체로 답변하세요.**\n\n`;
        }

        // Tech stacks section
        if (context.techStacks.length > 0) {
          output += `### Student's Project Technologies\n\n`;
          for (const t of context.techStacks) {
            const desc = t.description ? ` — ${t.description}` : "";
            output += `- ${t.technology_name} (${t.category})${desc}\n`;
          }
          output += `\n`;
        }

        // Project files section
        if (context.files.length > 0) {
          output += `### Student's Project Files\n\n`;
          for (const f of context.files) {
            output += `#### ${f.file_name}\n\`\`\`\n${f.content}\n\`\`\`\n\n`;
          }
        }

        // Learning context section
        if (context.learningContext) {
          const lc = context.learningContext;
          output += `### Current Learning Context\n\n`;
          output += `The student is currently working through:\n`;
          output += `- **Learning Path:** ${lc.path_title}\n`;
          output += `- **Current Module:** ${lc.current_module}\n\n`;
          output += `Relate your answers to their current module topic when relevant.\n\n`;

          // Module list with vibeuniv.com links
          if (lc.modules && lc.modules.length > 0) {
            output += `### Available Learning Modules\n\n`;
            output += locale === "en"
              ? `Below are the student's learning modules. If a module is relevant to your answer, include a vibeuniv.com link:\n\n`
              : `아래는 학생의 학습 모듈 목록입니다. 답변과 관련된 모듈이 있으면 vibeuniv.com 링크를 안내하세요:\n\n`;
            for (const mod of lc.modules) {
              output += `${mod.module_order}. [${mod.title}](https://vibeuniv.com/learning/${lc.learning_path_id}/${mod.id})\n`;
            }
            output += `\n`;
          }
        }

        // Instruction to suggest learning links
        output += locale === "en"
          ? `At the end, if a related module exists: 📚 Learn more → [Module name](link). If none, skip.\n\n`
          : `답변 끝에 관련 모듈이 있으면: 📚 더 자세히 → [모듈명](링크) 형식으로 안내. 없으면 생략.\n\n`;

        // User question
        output += `### Student's Question\n\n`;
        output += question;

        return {
          content: [{ type: "text" as const, text: output }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Failed to get tutor context: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
