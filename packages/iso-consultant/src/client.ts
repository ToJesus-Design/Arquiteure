import OpenAI from "openai";
import type { ChatMessage, ConversationContext, StreamChunk } from "./types.js";
import { buildSystemWithContext } from "./prompts.js";

export function resolveProvider(): { baseURL: string; apiKey: string; model: string } {
  if (process.env.GROQ_API_KEY) {
    return {
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL ?? "llama-3.1-70b-versatile",
    };
  }
  // Default: Ollama (local, free, no API key required)
  return {
    baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
    apiKey: "ollama",
    model: process.env.OLLAMA_MODEL ?? "llama3.1:8b",
  };
}

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    const { baseURL, apiKey } = resolveProvider();
    _client = new OpenAI({ baseURL, apiKey });
  }
  return _client;
}

export async function chatCompletion(
  messages: ChatMessage[],
  context: ConversationContext = {},
): Promise<string> {
  const { model } = resolveProvider();
  const system = buildSystemWithContext(context);
  const response = await getClient().chat.completions.create({
    model,
    messages: [{ role: "system", content: system }, ...messages],
    temperature: 0.4,
    max_tokens: 4096,
  });
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
