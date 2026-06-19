import type { LLMAdapter, LLMConfig, LLMProvider } from "./types";
import { OpenAIAdapter } from "./openai-adapter";
import { AnthropicAdapter } from "./anthropic-adapter";

export type { LLMConfig, LLMProvider, LLMAdapter } from "./types";

let cachedAdapter: LLMAdapter | null = null;
let cachedConfigHash: string | null = null;

function configHash(config: LLMConfig): string {
  return `${config.provider}:${config.apiKey}:${config.model ?? ""}`;
}

export function createLLMAdapter(config: LLMConfig): LLMAdapter {
  const hash = configHash(config);
  if (cachedAdapter && cachedConfigHash === hash) return cachedAdapter;

  let adapter: LLMAdapter;
  switch (config.provider) {
    case "openai":
      adapter = new OpenAIAdapter(config.apiKey, config.model);
      break;
    case "anthropic":
      adapter = new AnthropicAdapter(config.apiKey, config.model);
      break;
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }

  cachedAdapter = adapter;
  cachedConfigHash = hash;
  return adapter;
}

export function getStoredConfig(): LLMConfig | null {
  try {
    const raw = localStorage.getItem("pran-llm-config");
    if (!raw) return null;
    return JSON.parse(raw) as LLMConfig;
  } catch {
    return null;
  }
}

export function storeConfig(config: LLMConfig): void {
  localStorage.setItem("pran-llm-config", JSON.stringify(config));
}

export function clearStoredConfig(): void {
  localStorage.removeItem("pran-llm-config");
}

export function getStoredAdapter(): LLMAdapter | null {
  const config = getStoredConfig();
  if (!config) return null;
  return createLLMAdapter(config);
}
