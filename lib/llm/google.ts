import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  LLMProvider,
  AnalysisInput,
  AnalysisOutput,
  ChatInput,
  ChatOutput,
} from "./types";
import { buildAnalysisPrompt } from "@/lib/prompts/tech-analysis";
import { parseAnalysisResponse } from "./parse-analysis";

const DEFAULT_MODEL = "gemini-2.0-flash";

export class GoogleProvider implements LLMProvider {
  readonly providerName = "google";
  readonly modelName: string;
  private client: GoogleGenerativeAI;

  constructor(apiKey: string, model?: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = model ?? DEFAULT_MODEL;
  }

  async analyze(input: AnalysisInput): Promise<AnalysisOutput> {
    const prompt = input.promptOverride ?? buildAnalysisPrompt(input.files, input.techHints);

    try {
      const model = this.client.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: {
          role: "model",
          parts: [
            {
              text: "You are a technology stack analysis expert. Respond ONLY with valid JSON. No explanations or markdown.",
            },
          ],
        },
      });

      const response = result.response;
      const text = response.text();
      const usageMetadata = response.usageMetadata;

      const inputTokens = usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = usageMetadata?.candidatesTokenCount ?? 0;

      return parseAnalysisResponse(text, inputTokens, outputTokens);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Google AI error: ${error.message}`);
      }
      throw error;
    }
  }

  async chat(input: ChatInput): Promise<ChatOutput> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.modelName,
        ...(input.maxTokens
          ? { generationConfig: { maxOutputTokens: input.maxTokens } }
          : {}),
      });

      const systemMessage =
        input.systemPrompt ??
        input.messages.find((m) => m.role === "system")?.content;

      const chatMessages = input.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? ("model" as const) : ("user" as const),
          parts: [{ text: m.content }],
        }));

      // For Gemini, separate the last message from history
      const lastMessage = chatMessages.pop();
      if (!lastMessage) {
        throw new Error("No messages provided for chat");
      }

      const chat = model.startChat({
        history: chatMessages,
        ...(systemMessage
          ? {
              systemInstruction: {
                role: "model" as const,
                parts: [{ text: systemMessage }],
              },
            }
          : {}),
      });

      const result = await chat.sendMessage(lastMessage.parts);
      const response = result.response;
      const text = response.text();
      const usageMetadata = response.usageMetadata;

      return {
        content: text,
        input_tokens: usageMetadata?.promptTokenCount ?? 0,
        output_tokens: usageMetadata?.candidatesTokenCount ?? 0,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Google AI error: ${error.message}`);
      }
      throw error;
    }
  }
}
