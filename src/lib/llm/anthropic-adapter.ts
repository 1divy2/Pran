import type {
  LLMAdapter,
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMStreamChunk,
} from "./types";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

export class AnthropicAdapter implements LLMAdapter {
  readonly provider = "anthropic" as const;

  constructor(
    private apiKey: string,
    private model: string = DEFAULT_ANTHROPIC_MODEL,
  ) {}

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const { system, messages } = splitSystemMessages(request.messages);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens ?? 2048,
        temperature: request.temperature ?? 0.7,
        system: system ?? undefined,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    const contentBlock = data.content?.find((b: { type: string }) => b.type === "text");

    return {
      content: contentBlock?.text ?? "",
      model: data.model ?? this.model,
      usage: {
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
        totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      },
      finishReason: mapFinishReason(data.stop_reason),
    };
  }

  async *stream(request: LLMCompletionRequest): AsyncGenerator<LLMStreamChunk, void, unknown> {
    const { system, messages } = splitSystemMessages(request.messages);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens ?? 2048,
        temperature: request.temperature ?? 0.7,
        system: system ?? undefined,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
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

        try {
          const parsed = JSON.parse(trimmed.slice(6));

          if (parsed.type === "content_block_delta") {
            const delta = parsed.delta?.text ?? "";
            if (delta) {
              yield { delta, done: false };
            }
          } else if (parsed.type === "message_stop") {
            yield { delta: "", done: true };
            return;
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }
  }
}

function splitSystemMessages(messages: LLMCompletionRequest["messages"]): {
  system: string | null;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
} {
  const systemMsgs = messages.filter((m) => m.role === "system");
  const nonSystemMsgs = messages.filter(
    (m): m is { role: "user" | "assistant"; content: string } => m.role !== "system",
  );

  return {
    system: systemMsgs.map((m) => m.content).join("\n\n") || null,
    messages: nonSystemMsgs,
  };
}

function mapFinishReason(reason: string | undefined): LLMCompletionResponse["finishReason"] {
  switch (reason) {
    case "end_turn":
      return "stop";
    case "max_tokens":
      return "length";
    case "stop_sequence":
      return "stop";
    default:
      return "unknown";
  }
}
