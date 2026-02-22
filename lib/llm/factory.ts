import type { LLMProvider } from "./types";
import { AnthropicProvider } from "./anthropic";
import { GoogleProvider } from "./google";
import { OpenAICompatibleProvider } from "./openai-compat";
import { CohereProvider } from "./cohere";

type LlmProviderName =
  | "anthropic"
  | "openai"
  | "google"
  | "groq"
  | "mistral"
  | "deepseek"
  | "cohere"
  | "together"
  | "fireworks"
  | "xai"
  | "openrouter";

const OPENAI_COMPAT_PROVIDERS = new Set([
  "openai",
  "groq",
  "mistral",
  "deepseek",
  "together",
  "fireworks",
  "xai",
  "openrouter",
]);

export function createLLMProvider(
  provider: LlmProviderName,
  apiKey: string,
): LLMProvider {
  if (provider === "anthropic") {
    return new AnthropicProvider(apiKey);
  }

  if (provider === "google") {
    return new GoogleProvider(apiKey);
  }

  if (provider === "cohere") {
    return new CohereProvider(apiKey);
  }

  if (OPENAI_COMPAT_PROVIDERS.has(provider)) {
    return new OpenAICompatibleProvider(
      provider as
        | "openai"
        | "groq"
        | "mistral"
        | "deepseek"
        | "together"
        | "fireworks"
        | "xai"
        | "openrouter",
      apiKey,
    );
  }

  throw new Error(`Unsupported LLM provider: ${provider}`);
}

export function getDefaultProvider(): LlmProviderName {
  return "anthropic";
}

export function getSupportedProviders(): LlmProviderName[] {
  return [
    "anthropic",
    "openai",
    "google",
    "groq",
    "mistral",
    "deepseek",
    "cohere",
    "together",
    "fireworks",
    "xai",
    "openrouter",
  ];
}
