"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function ProjectPage({ params }: { params: { id: string } }) {
  const { data: project, refetch } = trpc.project.get.useQuery({ id: params.id });
  const intent = trpc.intent.fromText.useMutation();
  const design = trpc.design.generate.useMutation({ onSuccess: () => refetch() });

  const [text, setText] = useState("");
  const [lotW, setLotW] = useState(10);
  const [lotD, setLotD] = useState(8);
  const [lastProgram, setLastProgram] = useState<unknown>(null);
  const [alternatives, setAlternatives] = useState<
    Awaited<ReturnType<typeof design.mutateAsync>>["alternatives"]
  >([]);

  if (!project) return <p>A carregar…</p>;

  return (
    <div>
      <div className="card">
        <h1>{project.name}</h1>
        <p>
          {project.type} · {project.municipality ?? "—"} · <em>{project.status}</em>
        </p>
        <p>{project.description}</p>
      </div>

      <div className="card">
        <h2>1. Intenção</h2>
        <textarea
          rows={4}
          placeholder='Descreve o que queres. Ex: "quero transformar a sala atual num T1 para arrendar, com kitchenette, casa de banho completa e zona de trabalho, orçamento 25k€"'
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <p>
          <button
            className="btn"
            disabled={!text || intent.isLoading}
            onClick={async () => {
              const r = await intent.mutateAsync({ projectId: project.id, text });
              setLastProgram(r.requirementsJson);
            }}
          >
            {intent.isLoading ? "A extrair…" : "Extrair programa"}
          </button>
        </p>
        {lastProgram != null && (
          <pre style={{ background: "#f3f3f3", padding: 10, overflow: "auto" }}>
            {JSON.stringify(lastProgram, null, 2)}
          </pre>
        )}
      </div>

      <div className="card">
        <h2>2. Lote</h2>
        <div className="row">
          <label>
            Largura (m)
            <input type="number" value={lotW} onChange={(e) => setLotW(Number(e.target.value))} />
          </label>
          <label>
            Profundidade (m)
            <input type="number" value={lotD} onChange={(e) => setLotD(Number(e.target.value))} />
          </label>
        </div>
        <p>
          <button
            className="btn"
            disabled={!lastProgram || design.isLoading}
            onClick={async () => {
              if (!lastProgram) return;
              const r = await design.mutateAsync({
                projectId: project.id,
                program: lastProgram as Parameters<typeof design.mutateAsync>[0]["program"],
                lotWidth: lotW,
                lotDepth: lotD,
                count: 3,
              });
              setAlternatives(r.alternatives);
            }}
          >
            {design.isLoading ? "A gerar…" : "Gerar alternativas"}
          </button>
        </p>
      </div>

      {alternatives.length > 0 && (
        <div className="card">
          <h2>3. Alternativas</h2>
          <div className="alt-grid">
            {alternatives.map((alt) => {
              const scores = (alt.scoreJson as { scores: { overall: number; legal: number } }).scores;
              const summary =
                (alt.scoreJson as { validationSummary: { blocks: number; warns: number } })
                  .validationSummary;
              return (
                <div key={alt.id} className="card">
                  <h4>{alt.name}</h4>
                  <div dangerouslySetInnerHTML={{ __html: alt.svgPreview ?? "" }} />
                  <p>
                    <span className={`pill ${summary.blocks > 0 ? "block" : summary.warns > 0 ? "warn" : "ok"}`}>
                      {summary.blocks > 0
                        ? `${summary.blocks} bloqueios`
                        : summary.warns > 0
                          ? `${summary.warns} avisos`
                          : "conforme"}
                    </span>
                  </p>
                  <p>
                    Score global: <strong>{(scores.overall * 100).toFixed(0)}%</strong>
                    <br />
                    Legal: {(scores.legal * 100).toFixed(0)}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
