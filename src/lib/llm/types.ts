// ─────────────────────────────────────────────────────────────────────────────
// LLM Service — provider-agnostic abstraction for OpenAI, Anthropic, etc.
// Supports streaming responses for real-time courtroom debates.
// API keys are provided by the user at runtime (never stored in code).
// ─────────────────────────────────────────────────────────────────────────────

export type LLMProvider = "openai" | "anthropic";

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCompletionRequest {
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface LLMCompletionResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: "stop" | "length" | "content_filter" | "unknown";
}

export interface LLMStreamChunk {
  delta: string;
  done: boolean;
}

export interface LLMAdapter {
  readonly provider: LLMProvider;
  complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse>;
  stream(request: LLMCompletionRequest): AsyncGenerator<LLMStreamChunk, void, unknown>;
}
