interface LlmMetricEntry {
  user_id: string;
  conversation_id: string | null;
  project_id: string;
  provider: string;
  model?: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  success: boolean;
  error_message?: string;
}

/**
 * Logs a structured JSON metric for an LLM call.
 * Vercel log drain collects stdout automatically — no external dependency needed.
 */
export function logLlmCall(entry: LlmMetricEntry): void {
  const record = {
    event: "llm_call",
    timestamp: new Date().toISOString(),
    ...entry,
  };
  console.log(JSON.stringify(record));
}
