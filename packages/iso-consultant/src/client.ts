import OpenAI from "openai";
import type { ChatMessage, ConversationContext, StreamChunk } from "./types.js";
import { buildSystemWithContext } from "./prompts.js";

export type ProviderConfig = { baseURL: string; apiKey: string; model: string; name: string };

export function resolveProvider(): ProviderConfig {
  if (process.env.GROQ_API_KEY) {
    return {
      name: "groq",
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
    };
  }
  return {
    name: "ollama",
    baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
    apiKey: "ollama",
    model: process.env.OLLAMA_MODEL ?? "llama3.1:8b",
  };
}

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    const { baseURL, apiKey } = resolveProvider();
    _client = new OpenAI({ baseURL, apiKey, timeout: 120_000 });
  }
  return _client;
}

// Verifica se o Ollama está acessível e o modelo está disponível.
export async function checkHealth(): Promise<{ ok: boolean; provider: string; model: string; error?: string }> {
  const provider = resolveProvider();
  try {
    const res = await fetch(`${provider.baseURL.replace("/v1", "")}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, provider: provider.name, model: provider.model, error: `HTTP ${res.status}` };
    const data = await res.json() as { models?: Array<{ name: string }> };
    const available = data.models?.map((m) => m.name) ?? [];
    const modelReady = available.some((n) => n.startsWith(provider.model.split(":")[0] ?? ""));
    if (!modelReady) {
      return { ok: false, provider: provider.name, model: provider.model, error: `Modelo "${provider.model}" não encontrado. Modelos disponíveis: ${available.join(", ") || "nenhum"}` };
    }
    return { ok: true, provider: provider.name, model: provider.model };
  } catch (err) {
    return { ok: false, provider: provider.name, model: provider.model, error: err instanceof Error ? err.message : "Inacessível" };
  }
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < retries) await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

export async function chatCompletion(
  messages: ChatMessage[],
  context: ConversationContext = {},
): Promise<string> {
  const { model } = resolveProvider();
  const system = buildSystemWithContext(context);
  const response = await withRetry(() =>
    getClient().chat.completions.create({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.4,
      max_tokens: 4096,
    }),
  );
  return response.choices[0]?.message?.content ?? "";
}

export async function* chatCompletionStream(
  messages: ChatMessage[],
  context: ConversationContext = {},
): AsyncGenerator<StreamChunk> {
  const { model } = resolveProvider();
  const system = buildSystemWithContext(context);
  try {
    const stream = await getClient().chat.completions.create({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.4,
      max_tokens: 4096,
      stream: true,
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield { type: "delta", content: delta };
    }
    yield { type: "done" };
  } catch (err) {
    yield { type: "error", error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}
