"use client";
import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";

type Notebook = {
  id: string;
  name: string;
  description?: string | null;
  _count: { sources: number; entries: number };
};

type Source = { id: string; title: string; contentMd: string; kind: string };
type Entry = {
  id: string;
  question: string;
  answer: string;
  citationsJson: unknown;
  createdAt: string | Date;
};
type Citation = { sourceId: string; sourceTitle: string; excerpt: string };

export default function NotebookPage({ params }: { params: { id: string } }) {
  const projectId = params.id;

  const { data: notebooks, refetch: refetchList } = trpc.notebook.list.useQuery({ projectId });
  const createNb = trpc.notebook.create.useMutation({ onSuccess: () => refetchList() });
  const addSrc = trpc.notebook.addSource.useMutation({ onSuccess: () => refetchNb() });
  const removeSrc = trpc.notebook.removeSource.useMutation({ onSuccess: () => refetchNb() });
  const ask = trpc.notebook.ask.useMutation({ onSuccess: () => refetchNb() });

  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: activeNb, refetch: refetchNb } = trpc.notebook.get.useQuery(
    { id: activeId! },
    { enabled: !!activeId },
  );

  const [nbName, setNbName] = useState("");
  const [srcTitle, setSrcTitle] = useState("");
  const [srcContent, setSrcContent] = useState("");
  const [srcKind, setSrcKind] = useState<"text" | "regulation" | "project_doc">("text");
  const [question, setQuestion] = useState("");

  return (
    <div>
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href={`/projects/${projectId}`} className="btn secondary" style={{ textDecoration: "none" }}>
          ← Projeto
        </Link>
        <h1 style={{ margin: 0 }}>NotebookLM</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
        {/* Coluna esquerda: lista de notebooks */}
        <div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Notebooks</h3>
            {notebooks?.map((nb: Notebook) => (
              <div
                key={nb.id}
                onClick={() => setActiveId(nb.id)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: activeId === nb.id ? "#111" : "#f6f6f7",
                  color: activeId === nb.id ? "#fff" : "#111",
                  marginBottom: 6,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{nb.name}</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>
                  {nb._count.sources} fontes · {nb._count.entries} perguntas
                </div>
              </div>
            ))}

            <div style={{ marginTop: 12 }}>
              <input
                placeholder="Nome do notebook"
                value={nbName}
                onChange={(e) => setNbName(e.target.value)}
                style={{ marginBottom: 6 }}
              />
              <button
                className="btn"
                style={{ width: "100%" }}
                disabled={!nbName.trim() || createNb.isLoading}
                onClick={async () => {
                  await createNb.mutateAsync({ projectId, name: nbName.trim() });
                  setNbName("");
                }}
              >
                {createNb.isLoading ? "A criar…" : "+ Criar notebook"}
              </button>
            </div>
          </div>
        </div>

        {/* Coluna direita: conteúdo do notebook ativo */}
        {activeNb ? (
          <div>
            <div className="card">
              <h2 style={{ marginTop: 0 }}>{activeNb.name}</h2>

              {/* Fontes */}
              <h3>Fontes ({activeNb.sources.length})</h3>
              {activeNb.sources.map((src: Source) => (
                <div
                  key={src.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 10px",
                    background: "#f6f6f7",
                    borderRadius: 6,
                    marginBottom: 6,
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 13 }}>{src.title}</strong>
                    <span
                      className="pill ok"
                      style={{ marginLeft: 8, fontSize: 10 }}
                    >
                      {src.kind}
                    </span>
                  </div>
                  <button
                    className="btn secondary"
                    style={{ padding: "2px 8px", fontSize: 12 }}
                    onClick={() => removeSrc.mutate({ sourceId: src.id })}
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Adicionar fonte */}
              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 8 }}>
                  + Adicionar fonte
                </summary>
                <input
                  placeholder="Título"
                  value={srcTitle}
                  onChange={(e) => setSrcTitle(e.target.value)}
                  style={{ marginBottom: 6 }}
                />
                <select
                  value={srcKind}
                  onChange={(e) => setSrcKind(e.target.value as typeof srcKind)}
                  style={{ marginBottom: 6 }}
                >
                  <option value="text">Texto geral</option>
                  <option value="regulation">Regulamento</option>
                  <option value="project_doc">Documento de projeto</option>
                </select>
                <textarea
                  rows={6}
                  placeholder="Cola aqui o conteúdo do documento…"
                  value={srcContent}
                  onChange={(e) => setSrcContent(e.target.value)}
                  style={{ marginBottom: 6 }}
                />
                <button
                  className="btn"
                  disabled={!srcTitle.trim() || !srcContent.trim() || addSrc.isLoading}
                  onClick={async () => {
                    await addSrc.mutateAsync({
                      notebookId: activeNb.id,
                      title: srcTitle.trim(),
                      contentMd: srcContent,
                      kind: srcKind,
                    });
                    setSrcTitle("");
                    setSrcContent("");
                  }}
                >
                  {addSrc.isLoading ? "A adicionar…" : "Adicionar"}
                </button>
              </details>
            </div>

            {/* Perguntas */}
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Fazer uma pergunta</h3>
              {activeNb.sources.length === 0 && (
                <p style={{ color: "#856404", background: "#fff3cd", padding: "8px 12px", borderRadius: 6 }}>
                  Adiciona pelo menos uma fonte antes de fazer perguntas.
                </p>
              )}
              <textarea
                rows={3}
                placeholder='Ex: "Qual a área mínima de um quarto segundo o RGEU?"'
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <button
                className="btn"
                disabled={!question.trim() || activeNb.sources.length === 0 || ask.isLoading}
                onClick={async () => {
                  await ask.mutateAsync({ notebookId: activeNb.id, question: question.trim() });
                  setQuestion("");
                }}
              >
                {ask.isLoading ? "A consultar fontes…" : "Perguntar"}
              </button>
            </div>

            {/* Histórico de Q&A */}
            {activeNb.entries.map((entry: Entry) => {
              const citations = (entry.citationsJson as Citation[]) ?? [];
              return (
                <div key={entry.id} className="card">
                  <p style={{ fontWeight: 600, margin: "0 0 8px" }}>
                    Q: {entry.question}
                  </p>
                  <p style={{ whiteSpace: "pre-wrap", margin: "0 0 8px" }}>{entry.answer}</p>
                  {citations.length > 0 && (
                    <div style={{ borderTop: "1px solid #e3e3e5", paddingTop: 8, marginTop: 8 }}>
                      <strong style={{ fontSize: 12 }}>Fontes citadas:</strong>
                      {citations.map((c: Citation, i: number) => (
                        <div
                          key={i}
                          style={{
                            fontSize: 12,
                            color: "#555",
                            background: "#f6f6f7",
                            padding: "4px 8px",
                            borderRadius: 4,
                            marginTop: 4,
                          }}
                        >
                          <strong>{c.sourceTitle}</strong>
                          {c.excerpt && ` — "…${c.excerpt}…"`}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#999", marginTop: 8 }}>
                    {new Date(entry.createdAt).toLocaleString("pt-PT")}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, color: "#999" }}>
            Seleciona ou cria um notebook
          </div>
        )}
      </div>
    </div>
  );
}
