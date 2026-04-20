import Anthropic from "@anthropic-ai/sdk";
import { anthropic, FAST_MODEL } from "@arquiteure/ai";
import { AIResponseError } from "@arquiteure/core";
import type { NotebookSource, NotebookAnswer, Citation } from "./types.js";

export const NOTEBOOKLM_SYSTEM = `És um assistente especializado em arquitetura e engenharia portuguesa.
O teu papel é responder perguntas com base EXCLUSIVAMENTE nos documentos fornecidos pelo utilizador.
Regras obrigatórias:
1. Cita sempre a fonte exata de cada afirmação usando o formato [Fonte: <título>].
2. Se a resposta não estiver nos documentos, diz claramente "Não encontrei esta informação nos documentos fornecidos."
3. Nunca inventas informação. Só usas o conteúdo das fontes fornecidas.
4. Responde em português europeu, com linguagem técnica correta.
5. Quando citas uma passagem, usa aspas e indica o título do documento.`;

/**
 * Responde a uma pergunta com base nas fontes de um notebook.
 * Devolve resposta em texto e lista de citações extraídas.
 */
export async function queryNotebook(
  question: string,
  sources: NotebookSource[],
): Promise<NotebookAnswer> {
  if (sources.length === 0) {
    throw new AIResponseError("O notebook não tem fontes. Adiciona documentos antes de fazer perguntas.");
  }

  const contentBlocks: Anthropic.Messages.MessageParam["content"] = sources.map((src) => ({
    type: "text" as const,
    text: `<document id="${src.id}" title="${src.title}">\n${src.contentMd}\n</document>`,
  }));

  contentBlocks.push({
    type: "text" as const,
    text: `Pergunta: ${question}\n\nResponde com base exclusiva nos documentos acima. Cita as fontes relevantes com [Fonte: <título>].`,
  });

  const client = anthropic();
  const res = await client.messages.create({
    model: FAST_MODEL,
    max_tokens: 2048,
    temperature: 0.1,
    system: NOTEBOOKLM_SYSTEM,
    messages: [{ role: "user", content: contentBlocks }],
  });

  const text = res.content
    .filter((c): c is Anthropic.Messages.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  if (!text.trim()) throw new AIResponseError("Resposta vazia do modelo");

  const citations = extractCitations(text, sources);
  return { answer: text, citations };
}

function extractCitations(text: string, sources: NotebookSource[]): Citation[] {
  const citations: Citation[] = [];
  const seen = new Set<string>();

  for (const src of sources) {
    const pattern = new RegExp(`\\[Fonte:\\s*${escapeRegex(src.title)}\\]`, "gi");
    if (pattern.test(text) && !seen.has(src.id)) {
      seen.add(src.id);
      const excerpt = extractExcerpt(text, src.title);
      citations.push({ sourceId: src.id, sourceTitle: src.title, excerpt });
    }
  }

  return citations;
}

function extractExcerpt(text: string, sourceTitle: string): string {
  const idx = text.toLowerCase().indexOf(sourceTitle.toLowerCase());
  if (idx < 0) return "";
  const start = Math.max(0, idx - 80);
  const end = Math.min(text.length, idx + sourceTitle.length + 80);
  return text.slice(start, end).trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
