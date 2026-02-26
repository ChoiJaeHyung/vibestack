export type LlmKeyError = "no_key" | "decryption_failed" | "env_error";

export type LlmProviderName =
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

export interface LlmKeyResult {
  data: { provider: LlmProviderName; apiKey: string } | null;
  error?: LlmKeyError;
}

export function llmKeyErrorMessage(error?: LlmKeyError): string {
  switch (error) {
    case "decryption_failed":
      return "LLM API 키를 복호화할 수 없습니다. 설정에서 API 키를 다시 등록해주세요.";
    case "env_error":
      return "서버 설정 오류입니다. 잠시 후 다시 시도하거나 관리자에게 문의하세요.";
    case "no_key":
    default:
      return "No LLM API key configured. Please add an API key in settings.";
  }
}
