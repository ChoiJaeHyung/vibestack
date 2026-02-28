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

        // Build tutor instructions for local AI
        let output = `## AI Tutor — Answer the student's question below\n\n`;

        // Tutor persona instructions (extracted from lib/prompts/tutor-chat.ts)
        output += `### Your Role\n\n`;
        output += `You are a friendly, patient AI tutor helping a "vibe coder" understand their own project.\n`;
        output += `A vibe coder is someone who built a working application using AI coding tools (like Claude Code, Cursor, Bolt, etc.) `;
        output += `but wants to deeply understand the technologies they used.\n\n`;

        output += `### Teaching Style\n\n`;
        output += `1. **Always reference the student's actual project code.** Point to specific lines or patterns in their files.\n`;
        output += `2. **Explain simply.** Avoid jargon. When you must use a technical term, immediately explain it in plain language.\n`;
        output += `3. **Be encouraging.** The student already built something that works — build on their confidence.\n`;
        output += `4. **Keep responses focused.** Aim for ~500 words max.\n`;
        output += `5. **Walk through code line-by-line when asked.**\n`;
        output += `6. **Use analogies.** Connect programming concepts to everyday experiences.\n`;
        output += `7. **Be honest about complexity.** If something is complex, say so but break it down.\n\n`;

        output += `### Rules\n\n`;
        output += `- NEVER make up code that isn't in the student's project. Only reference actual files shown below.\n`;
        output += `- If asked about something outside the project files, clearly state you're giving general advice.\n`;
        output += `- If you don't know something, say so honestly.\n`;
        output += `- Do NOT repeat the student's question back to them.\n`;
        output += `- Do NOT start with "Great question!" or similar filler phrases.\n`;
        output += `- Keep code snippets short and relevant.\n\n`;

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
          output += `### Current Learning Context\n\n`;
          output += `The student is currently working through:\n`;
          output += `- **Learning Path:** ${context.learningContext.path_title}\n`;
          output += `- **Current Module:** ${context.learningContext.current_module}\n\n`;
          output += `Relate your answers to their current module topic when relevant.\n\n`;
        }

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
