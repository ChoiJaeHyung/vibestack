import Anthropic from "@anthropic-ai/sdk";
import type {
  LLMProvider,
  AnalysisInput,
  AnalysisOutput,
  ChatInput,
  ChatOutput,
} from "./types";
import { buildAnalysisPrompt } from "@/lib/prompts/tech-analysis";
import { parseAnalysisResponse } from "./parse-analysis";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;

export class AnthropicProvider implements LLMProvider {
  readonly providerName = "anthropic";
  readonly modelName: string;
  private client: Anthropic;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    this.modelName = model ?? DEFAULT_MODEL;
  }

  async analyze(input: AnalysisInput): Promise<AnalysisOutput> {
    const prompt = input.promptOverride ?? buildAnalysisPrompt(input.files, input.techHints);

    try {
      const response = await this.client.messages.create({
        model: this.modelName,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
        system:
          "You are a technology stack analysis expert. Respond ONLY with valid JSON. No explanations or markdown.",
      });

      const textBlock = response.content.find(
        (block) => block.type === "text",
      );
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text content in Anthropic response");
      }

      return parseAnalysisResponse(
        textBlock.text,
        response.usage.input_tokens,
        response.usage.output_tokens,
      );
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new Error(
          `Anthropic API error (${error.status}): ${error.message}`,
        );
      }
      throw error;
    }
  }

  async chat(input: ChatInput): Promise<ChatOutput> {
    try {
      const messages: Anthropic.Messages.MessageParam[] = input.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      const systemMessage =
        input.systemPrompt ??
        input.messages.find((m) => m.role === "system")?.content;

      const response = await this.client.messages.create({
        model: this.modelName,
        max_tokens: input.maxTokens ?? MAX_TOKENS,
        messages,
        ...(systemMessage ? { system: systemMessage } : {}),
      });

      const textBlock = response.content.find(
        (block) => block.type === "text",
      );
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text content in Anthropic response");
      }

      return {
        content: textBlock.text,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      };
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new Error(
          `Anthropic API error (${error.status}): ${error.message}`,
        );
      }
      throw error;
    }
  }
}
