import { CohereClientV2 } from "cohere-ai";
import type {
  LLMProvider,
  AnalysisInput,
  AnalysisOutput,
  ChatInput,
  ChatOutput,
} from "./types";
import { buildAnalysisPrompt } from "@/lib/prompts/tech-analysis";
import { parseAnalysisResponse } from "./parse-analysis";

const DEFAULT_MODEL = "command-r-plus";
const MAX_TOKENS = 4096;

export class CohereProvider implements LLMProvider {
  readonly providerName = "cohere";
  readonly modelName: string;
  private client: CohereClientV2;

  constructor(apiKey: string, model?: string) {
    this.client = new CohereClientV2({ token: apiKey });
    this.modelName = model ?? DEFAULT_MODEL;
  }

  async analyze(input: AnalysisInput): Promise<AnalysisOutput> {
    const prompt = input.promptOverride ?? buildAnalysisPrompt(input.files, input.techHints);

    try {
      const response = await this.client.chat({
        model: this.modelName,
        maxTokens: MAX_TOKENS,
        messages: [
          {
            role: "system",
            content:
              "You are a technology stack analysis expert. Respond ONLY with valid JSON. No explanations or markdown.",
          },
          { role: "user", content: prompt },
        ],
      });

      const content = response.message?.content;
      if (!content || !Array.isArray(content) || content.length === 0) {
        throw new Error("No content in Cohere response");
      }

      const textContent = content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text content in Cohere response");
      }

      const inputTokens =
        response.usage?.tokens?.inputTokens ?? 0;
      const outputTokens =
        response.usage?.tokens?.outputTokens ?? 0;

      return parseAnalysisResponse(
        textContent.text,
        inputTokens,
        outputTokens,
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Cohere API error: ${error.message}`);
      }
      throw error;
    }
  }

  async chat(input: ChatInput): Promise<ChatOutput> {
    try {
      const messages: Array<{
        role: "system" | "user" | "assistant";
        content: string;
      }> = [];

      const systemMessage =
        input.systemPrompt ??
        input.messages.find((m) => m.role === "system")?.content;

      if (systemMessage) {
        messages.push({ role: "system", content: systemMessage });
      }

      for (const msg of input.messages) {
        if (msg.role === "system") continue;
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }

      const response = await this.client.chat({
        model: this.modelName,
        maxTokens: MAX_TOKENS,
        messages,
      });

      const content = response.message?.content;
      if (!content || !Array.isArray(content) || content.length === 0) {
        throw new Error("No content in Cohere response");
      }

      const textContent = content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text content in Cohere response");
      }

      return {
        content: textContent.text,
        input_tokens: response.usage?.tokens?.inputTokens ?? 0,
        output_tokens: response.usage?.tokens?.outputTokens ?? 0,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Cohere API error: ${error.message}`);
      }
      throw error;
    }
  }
}
