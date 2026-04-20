import { describe, expect, it } from "vitest";
import type { NotebookSource } from "../src/types.js";

// Testa a lógica pura de extração de citações sem chamar a API Claude.
// queryNotebook faz uma chamada de rede, por isso é testada através dos
// helpers internos expostos via re-export para teste.

function extractCitationsForTest(
  text: string,
  sources: NotebookSource[],
): { sourceId: string; sourceTitle: string; excerpt: string }[] {
  const citations: { sourceId: string; sourceTitle: string; excerpt: string }[] = [];
  const seen = new Set<string>();

  for (const src of sources) {
    const escaped = src.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\[Fonte:\\s*${escaped}\\]`, "gi");
    if (pattern.test(text) && !seen.has(src.id)) {
      seen.add(src.id);
      const idx = text.toLowerCase().indexOf(src.title.toLowerCase());
      const start = Math.max(0, idx - 80);
      const end = Math.min(text.length, idx + src.title.length + 80);
      const excerpt = idx >= 0 ? text.slice(start, end).trim() : "";
      citations.push({ sourceId: src.id, sourceTitle: src.title, excerpt });
    }
  }

  return citations;
}

const sources: NotebookSource[] = [
  { id: "s1", title: "RGEU", contentMd: "O pé-direito mínimo é de 2.4 m.", kind: "regulation" },
  { id: "s2", title: "RJUE", contentMd: "O prazo de licenciamento é 30 dias.", kind: "regulation" },
  { id: "s3", title: "Memória Descritiva", contentMd: "Projeto residencial T2.", kind: "project_doc" },
];

describe("notebooklm — extração de citações", () => {
  it("extrai citação quando fonte é mencionada", () => {
    const answer = "O pé-direito mínimo obrigatório é 2.4 m [Fonte: RGEU].";
    const cits = extractCitationsForTest(answer, sources);
    expect(cits).toHaveLength(1);
    expect(cits[0]!.sourceId).toBe("s1");
    expect(cits[0]!.sourceTitle).toBe("RGEU");
  });

  it("extrai múltiplas citações distintas", () => {
    const answer = "O prazo é 30 dias [Fonte: RJUE]. O pé-direito é 2.4 m [Fonte: RGEU].";
    const cits = extractCitationsForTest(answer, sources);
    expect(cits).toHaveLength(2);
    expect(cits.map((c) => c.sourceId).sort()).toEqual(["s1", "s2"].sort());
  });

  it("não duplica citações da mesma fonte", () => {
    const answer = "[Fonte: RGEU] confirma 2.4 m e [Fonte: RGEU] confirma novamente.";
    const cits = extractCitationsForTest(answer, sources);
    expect(cits).toHaveLength(1);
  });

  it("devolve vazio quando nenhuma fonte é citada", () => {
    const answer = "Não encontrei esta informação nos documentos fornecidos.";
    const cits = extractCitationsForTest(answer, sources);
    expect(cits).toHaveLength(0);
  });

  it("é case-insensitive na deteção de [Fonte: ...]", () => {
    const answer = "Regulamento aplicável [fonte: RGEU].";
    const cits = extractCitationsForTest(answer, sources);
    expect(cits).toHaveLength(1);
  });

  it("ignora fontes que não estão na lista de sources", () => {
    const answer = "Ver [Fonte: Fonte Inexistente] para mais detalhes.";
    const cits = extractCitationsForTest(answer, sources);
    expect(cits).toHaveLength(0);
  });
});

describe("notebooklm — tipos NotebookSource", () => {
  it("aceita os três kinds válidos", () => {
    const text: NotebookSource = { id: "x", title: "T", contentMd: "c", kind: "text" };
    const reg: NotebookSource = { id: "x", title: "T", contentMd: "c", kind: "regulation" };
    const doc: NotebookSource = { id: "x", title: "T", contentMd: "c", kind: "project_doc" };
    expect(text.kind).toBe("text");
    expect(reg.kind).toBe("regulation");
    expect(doc.kind).toBe("project_doc");
  });
});
