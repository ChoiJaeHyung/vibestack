import OpenAI from "openai";
import type {
  LLMProvider,
  AnalysisInput,
  AnalysisOutput,
  ChatInput,
  ChatOutput,
} from "./types";
import { buildAnalysisPrompt } from "@/lib/prompts/tech-analysis";
import { parseAnalysisResponse } from "./parse-analysis";

type OpenAICompatProvider =
  | "openai"
  | "groq"
  | "mistral"
  | "deepseek"
  | "together"
  | "fireworks"
  | "xai"
  | "openrouter";

interface ProviderConfig {
  baseURL: string;
  defaultModel: string;
  supportsJsonMode: boolean;
}

const PROVIDER_CONFIGS: Record<OpenAICompatProvider, ProviderConfig> = {
  openai: {
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    supportsJsonMode: true,
  },
  groq: {
    baseURL: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    supportsJsonMode: true,
  },
  mistral: {
    baseURL: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
    supportsJsonMode: true,
  },
  deepseek: {
    baseURL: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    supportsJsonMode: true,
  },
  together: {
    baseURL: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    supportsJsonMode: true,
  },
  fireworks: {
    baseURL: "https://api.fireworks.ai/inference/v1",
    defaultModel: "accounts/fireworks/models/llama-v3p3-70b-instruct",
    supportsJsonMode: true,
  },
  xai: {
    baseURL: "https://api.x.ai/v1",
    defaultModel: "grok-2-latest",
    supportsJsonMode: true,
  },
  openrouter: {
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct",
    supportsJsonMode: true,
  },
};

const MAX_TOKENS = 4096;

export class OpenAICompatibleProvider implements LLMProvider {
  readonly providerName: string;
  readonly modelName: string;
  private client: OpenAI;
  private config: ProviderConfig;

  constructor(provider: OpenAICompatProvider, apiKey: string, model?: string) {
    const config = PROVIDER_CONFIGS[provider];
    this.config = config;
    this.providerName = provider;
    this.modelName = model ?? config.defaultModel;
    this.client = new OpenAI({
      apiKey,
      baseURL: config.baseURL,
    });
  }

  async analyze(input: AnalysisInput): Promise<AnalysisOutput> {
    const prompt = input.promptOverride ?? buildAnalysisPrompt(input.files, input.techHints);

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        max_tokens: MAX_TOKENS,
        messages: [
          {
            role: "system",
            content:
              "You are a technology stack analysis expert. Respond ONLY with valid JSON. No explanations or markdown.",
          },
          { role: "user", content: prompt },
        ],
        ...(this.config.supportsJsonMode
          ? { response_format: { type: "json_object" } }
          : {}),
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error(
          `No content in ${this.providerName} response`,
        );
      }

      const inputTokens = response.usage?.prompt_tokens ?? 0;
      const outputTokens = response.usage?.completion_tokens ?? 0;

      return parseAnalysisResponse(content, inputTokens, outputTokens);
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new Error(
          `${this.providerName} API error (${error.status}): ${error.message}`,
        );
      }
      throw error;
    }
  }

  async chat(input: ChatInput): Promise<ChatOutput> {
    try {
      const messages: OpenAI.ChatCompletionMessageParam[] = [];

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

      const response = await this.client.chat.completions.create({
        model: this.modelName,
        max_tokens: input.maxTokens ?? MAX_TOKENS,
        messages,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error(
          `No content in ${this.providerName} response`,
        );
      }

      return {
        content,
        input_tokens: response.usage?.prompt_tokens ?? 0,
        output_tokens: response.usage?.completion_tokens ?? 0,
      };
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new Error(
          `${this.providerName} API error (${error.status}): ${error.message}`,
        );
      }
      throw error;
    }
  }
}
