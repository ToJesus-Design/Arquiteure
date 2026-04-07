import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { AIResponseError } from "@arquiteure/core";

export const PRIMARY_MODEL = process.env.ANTHROPIC_MODEL_PRIMARY ?? "claude-opus-4-6";
export const FAST_MODEL = process.env.ANTHROPIC_MODEL_FAST ?? "claude-haiku-4-5-20251001";

let _client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export interface CallOptions {
  model?: string;
  system: string;
  messages: Anthropic.Messages.MessageParam[];
  maxTokens?: number;
  temperature?: number;
}

export async function callClaude(opts: CallOptions): Promise<string> {
  const res = await anthropic().messages.create({
    model: opts.model ?? PRIMARY_MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0.2,
    system: opts.system,
    messages: opts.messages,
  });
  const text = res.content
    .filter((c): c is Anthropic.Messages.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("\n");
  if (!text.trim()) throw new AIResponseError("Resposta vazia do modelo");
  return text;
}

/**
 * Chama Claude e força a saída a respeitar um schema Zod via re-prompt em caso
 * de falha. Aceita até 2 tentativas.
 */
export async function callStructured<T>(
  schema: z.ZodType<T>,
  opts: CallOptions,
): Promise<T> {
  const sys =
    opts.system +
    "\n\nResponde SEMPRE em JSON válido, sem texto adicional, conforme o schema indicado.";
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await callClaude({ ...opts, system: sys });
    const json = extractJson(text);
    const parsed = schema.safeParse(json);
    if (parsed.success) return parsed.data;
    lastError = parsed.error;
    opts.messages = [
      ...opts.messages,
      { role: "assistant", content: text },
      {
        role: "user",
        content: `O JSON anterior não respeita o schema. Erros: ${JSON.stringify(
          parsed.error.issues,
        )}. Devolve novo JSON corrigido.`,
      },
    ];
  }
  throw new AIResponseError("Não foi possível obter resposta estruturada", lastError);
}

function extractJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence?.[1] ?? text;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new AIResponseError("Resposta não contém JSON parseável");
  }
}
