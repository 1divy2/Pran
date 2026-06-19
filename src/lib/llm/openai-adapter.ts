import type {
  LLMAdapter,
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMStreamChunk,
} from "./types";

const DEFAULT_OPENAI_MODEL = "gpt-4o";

export class OpenAIAdapter implements LLMAdapter {
  readonly provider = "openai" as const;

  constructor(
    private apiKey: string,
    private model: string = DEFAULT_OPENAI_MODEL,
  ) {}

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        max_tokens: request.maxTokens ?? 2048,
        temperature: request.temperature ?? 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content ?? "",
      model: data.model ?? this.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      finishReason: mapFinishReason(choice?.finish_reason),
    };
  }

  async *stream(request: LLMCompletionRequest): AsyncGenerator<LLMStreamChunk, void, unknown> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        max_tokens: request.maxTokens ?? 2048,
        temperature: request.temperature ?? 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          yield { delta: "", done: true };
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            yield { delta, done: false };
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }
  }
}

function mapFinishReason(reason: string | undefined): LLMCompletionResponse["finishReason"] {
  switch (reason) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "content_filter":
      return "content_filter";
    default:
      return "unknown";
  }
}
