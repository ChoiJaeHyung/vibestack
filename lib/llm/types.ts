export interface LLMProvider {
  readonly providerName: string;
  readonly modelName: string;
  analyze(input: AnalysisInput): Promise<AnalysisOutput>;
  chat(input: ChatInput): Promise<ChatOutput>;
}

export interface AnalysisInput {
  files: Array<{ name: string; content: string; type: string }>;
  techHints: TechHint[];
  /** When provided, skip buildAnalysisPrompt and use this prompt directly. */
  promptOverride?: string;
}

export interface TechHint {
  name: string;
  version?: string;
  source: string;
  confidence: number;
}

export interface TechnologyResult {
  name: string;
  category: string;
  version?: string;
  confidence: number;
  description: string;
  importance: "core" | "supporting" | "dev_dependency";
  relationships?: {
    depends_on?: string[];
    used_with?: string[];
  };
}

export interface AnalysisOutput {
  technologies: TechnologyResult[];
  architecture_summary: string;
  input_tokens: number;
  output_tokens: number;
}

export interface ChatInput {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  systemPrompt?: string;
  /** Override the default max_tokens for this request. */
  maxTokens?: number;
}

export interface ChatOutput {
  content: string;
  input_tokens: number;
  output_tokens: number;
}
