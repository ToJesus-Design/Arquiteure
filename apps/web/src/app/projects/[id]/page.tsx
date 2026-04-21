"use client";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import type { ProgramRequirements, ValidationResult } from "@arquiteure/core";

interface SessionAlt {
  id: string;
  versionId: string;
  name: string;
  svgPreview: string | null;
  scoreJson: unknown;
  validations?: ValidationResult[];
  descriptionMd: string;
  createdAt: Date;
}

const GATE_LABELS: Record<string, string> = {
  LEGAL: "Legal",
  STRUCTURAL: "Estrutural",
  URBAN: "Urbanístico",
  SAFETY: "Segurança",
  ACCESSIBILITY: "Acessibilidade",
};

const GATES = ["LEGAL", "STRUCTURAL", "URBAN", "SAFETY", "ACCESSIBILITY"] as const;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const { data: project, refetch } = trpc.project.get.useQuery({ id: params.id });
  const intentMut = trpc.intent.fromText.useMutation();
  const designMut = trpc.design.generate.useMutation({ onSuccess: () => refetch() });
  const uploadMut = trpc.project.uploadAsset.useMutation({ onSuccess: () => refetch() });
  const approveMut = trpc.approval.approve.useMutation({
    onSuccess: () => {
      void refetch();
      void gatesQuery.refetch();
    },
  });
  const pdfMut = trpc.export.dossierPdf.useMutation();
  const dxfMut = trpc.export.dxf.useMutation();

  const [text, setText] = useState("");
  const [lotW, setLotW] = useState(10);
  const [lotD, setLotD] = useState(8);
  const [lastProgram, setLastProgram] = useState<ProgramRequirements | null>(null);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [sessionAlts, setSessionAlts] = useState<SessionAlt[]>([]);
  const [expandedAlt, setExpandedAlt] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadKind, setUploadKind] = useState<"PHOTO" | "PLAN" | "DOC">("PHOTO");

  useEffect(() => {
    if (project?.versions[0]?.id && !activeVersionId) {
      setActiveVersionId(project.versions[0].id);
    }
  }, [project, activeVersionId]);

  const altsQuery = trpc.design.listAlternatives.useQuery(
    { versionId: activeVersionId! },
    { enabled: !!activeVersionId && sessionAlts.length === 0 },
  );
  const gatesQuery = trpc.approval.listGates.useQuery(
    { versionId: activeVersionId! },
    { enabled: !!activeVersionId },
  );

  const alts = sessionAlts.length > 0 ? sessionAlts : (altsQuery.data ?? []);

  if (!project) return <p style={{ padding: 24 }}>A carregar…</p>;

  const handleUpload = async () => {
    if (!uploadFile) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await uploadMut.mutateAsync({
        projectId: project.id,
        kind: uploadKind,
        uri: reader.result as string,
        meta: { filename: uploadFile.name, size: uploadFile.size },
      });
      setUploadFile(null);
    };
    reader.readAsDataURL(uploadFile);
  };

  const handleDownloadPdf = async (versionId: string, alternativeId: string) => {
    const { base64 } = await pdfMut.mutateAsync({ versionId, alternativeId });
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), `${project.name}.pdf`);
  };

  const handleDownloadDxf = async (alternativeId: string) => {
    const { dxf } = await dxfMut.mutateAsync({ alternativeId });
    downloadBlob(new Blob([dxf], { type: "application/dxf" }), `${project.name}.dxf`);
  };

  return (
    <div>
      {/* Cabeçalho do projeto */}
      <div className="card">
        <h1 style={{ margin: 0 }}>{project.name}</h1>
        <p style={{ margin: "6px 0 0", color: "#555", fontSize: 14 }}>
          <strong>{project.type}</strong> · {project.municipality ?? "município não definido"} ·{" "}
          <em>{project.status}</em>
        </p>
        {project.description && (
          <p style={{ margin: "8px 0 0", fontSize: 14 }}>{project.description}</p>
        )}
      </div>

      {/* 1. Intenção */}
      <div className="card">
        <h2>1. Intenção</h2>
        <textarea
          rows={4}
          placeholder='Descreve o que queres construir. Ex: "quero um T2 com sala open-space, cozinha separada, 2 casas de banho e zona de trabalho, orçamento 80 000 €"'
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <p>
          <button
            className="btn"
            disabled={!text || intentMut.isLoading}
            onClick={async () => {
              const r = await intentMut.mutateAsync({ projectId: project.id, text });
              setLastProgram(r.requirementsJson as unknown as ProgramRequirements);
            }}
          >
            {intentMut.isLoading ? "A extrair…" : "Extrair programa"}
          </button>
        </p>
        {lastProgram && (
          <details>
            <summary style={{ cursor: "pointer", fontSize: 13, color: "#555" }}>
              Programa extraído ({lastProgram.rooms.length} compartimentos)
            </summary>
            <pre className="code-block">{JSON.stringify(lastProgram, null, 2)}</pre>
          </details>
        )}
        {intentMut.error && <p className="error-msg">{intentMut.error.message}</p>}
      </div>

      {/* 2. Lote e geração */}
      <div className="card">
        <h2>2. Lote e geração</h2>
        <div className="row">
          <label>
            Largura do lote (m)
            <input
              type="number"
              value={lotW}
              min={3}
              max={200}
              step={0.5}
              onChange={(e) => setLotW(Number(e.target.value))}
            />
          </label>
          <label>
            Profundidade do lote (m)
            <input
              type="number"
              value={lotD}
              min={3}
              max={200}
              step={0.5}
              onChange={(e) => setLotD(Number(e.target.value))}
            />
          </label>
        </div>
        <p style={{ fontSize: 13, color: "#555", margin: "8px 0" }}>
          Área do lote: <strong>{(lotW * lotD).toFixed(0)} m²</strong>
        </p>
        <p>
          <button
            className="btn"
            disabled={!lastProgram || designMut.isLoading}
            onClick={async () => {
              if (!lastProgram) return;
              const r = await designMut.mutateAsync({
                projectId: project.id,
                program: lastProgram,
                lotWidth: lotW,
                lotDepth: lotD,
                count: 3,
              });
              setSessionAlts(r.alternatives as SessionAlt[]);
              setActiveVersionId(r.versionId);
            }}
          >
            {designMut.isLoading ? "A gerar…" : "Gerar 3 alternativas"}
          </button>
          {!lastProgram && (
            <span style={{ fontSize: 12, color: "#888", marginLeft: 10 }}>
              Extrai o programa primeiro
            </span>
          )}
        </p>
        {designMut.error && <p className="error-msg">{designMut.error.message}</p>}
      </div>

      {/* 3. Alternativas */}
      {(alts.length > 0 || altsQuery.isFetching) && (
        <div className="card">
          <h2>3. Alternativas</h2>
          {altsQuery.isFetching && <p style={{ color: "#888" }}>A carregar alternativas…</p>}
          <div className="alt-grid">
            {alts.map((alt) => {
              const sc = (
                alt.scoreJson as { scores: Record<string, number> }
              ).scores;
              const vs = (
                alt.scoreJson as {
                  validationSummary: { blocks: number; warns: number; oks: number };
                }
              ).validationSummary;
              const validations: ValidationResult[] =
                (alt as { validations?: ValidationResult[] }).validations ??
                (
                  alt.scoreJson as { validations?: ValidationResult[] }
                ).validations ??
                [];
              const isExp = expandedAlt === alt.id;

              return (
                <div key={alt.id} className="card alt-card">
                  <div className="alt-header">
                    <h4 style={{ margin: 0 }}>{alt.name}</h4>
                    <span
                      className={`pill ${
                        vs.blocks > 0 ? "block" : vs.warns > 0 ? "warn" : "ok"
                      }`}
                    >
                      {vs.blocks > 0
                        ? `${vs.blocks} bloqueios`
                        : vs.warns > 0
                          ? `${vs.warns} avisos`
                          : "conforme"}
                    </span>
                  </div>

                  <div
                    className="svg-wrap"
                    dangerouslySetInnerHTML={{ __html: alt.svgPreview ?? "" }}
                  />

                  <div className="score-grid">
                    {Object.entries(sc).map(([k, v]) => (
                      <div key={k} className="score-item">
                        <div className="score-label">
                          {k === "overall"
                            ? "global"
                            : k === "legal"
                              ? "legal"
                              : k === "functional"
                                ? "funcional"
                                : k === "aesthetic"
                                  ? "estético"
                                  : "económico"}
                        </div>
                        <div className="score-bar-wrap">
                          <div
                            className="score-bar-fill"
                            style={{
                              width: `${(v as number) * 100}%`,
                              background: k === "overall" ? "#111" : "#4ea3ff",
                            }}
                          />
                        </div>
                        <div className="score-pct">{((v as number) * 100).toFixed(0)}%</div>
                      </div>
                    ))}
                  </div>

                  <div className="alt-actions">
                    <button
                      className="btn secondary"
                      style={{ fontSize: 12 }}
                      onClick={() => setExpandedAlt(isExp ? null : alt.id)}
                    >
                      {isExp ? "Fechar" : "Validações"}
                    </button>
                    <button
                      className="btn secondary"
                      style={{ fontSize: 12 }}
                      disabled={pdfMut.isLoading}
                      onClick={() =>
                        void handleDownloadPdf(
                          (alt as { versionId?: string }).versionId ?? activeVersionId!,
                          alt.id,
                        )
                      }
                    >
                      ↓ PDF
                    </button>
                    <button
                      className="btn secondary"
                      style={{ fontSize: 12 }}
                      disabled={dxfMut.isLoading}
                      onClick={() => void handleDownloadDxf(alt.id)}
                    >
                      ↓ DXF
                    </button>
                  </div>

                  {isExp && validations.length > 0 && (
                    <div className="validations-list">
                      {validations.map((v, i) => (
                        <div
                          key={i}
                          className={`val-row ${
                            v.passed ? "ok" : v.severity === "BLOCK" ? "block" : "warn"
                          }`}
                        >
                          <code className="rule-code">{v.ruleCode}</code>
                          <span>{v.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Portões de aprovação */}
      {activeVersionId && (
        <div className="card">
          <h2>4. Portões de aprovação</h2>
          <p style={{ fontSize: 13, color: "#555", marginTop: 0 }}>
            Aprovação multi-domínio da versão activa.
          </p>
          <div className="gates-grid">
            {GATES.map((gate) => {
              const g = gatesQuery.data?.find((x) => x.gate === gate);
              return (
                <div key={gate} className={`gate-card ${g?.granted ? "gate-ok" : "gate-pending"}`}>
                  <div className="gate-label">{GATE_LABELS[gate]}</div>
                  {g?.granted ? (
                    <div className="gate-status">
                      <span style={{ color: "#155724" }}>✓ Aprovado</span>
                      <br />
                      <span style={{ fontSize: 11, color: "#888" }}>
                        {g.grantedAt
                          ? new Date(g.grantedAt).toLocaleDateString("pt-PT")
                          : ""}
                      </span>
                      {g.notes && (
                        <p style={{ fontSize: 11, margin: "4px 0 0", fontStyle: "italic" }}>
                          {g.notes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="gate-status">
                      <span style={{ color: "#888", fontSize: 13 }}>Pendente</span>
                      <br />
                      <button
                        className="btn"
                        style={{ fontSize: 11, padding: "4px 10px", marginTop: 6 }}
                        disabled={approveMut.isLoading}
                        onClick={() =>
                          void approveMut.mutateAsync({ versionId: activeVersionId, gate })
                        }
                      >
                        Aprovar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {approveMut.error && <p className="error-msg">{approveMut.error.message}</p>}
        </div>
      )}

      {/* 5. Ficheiros */}
      <div className="card">
        <h2>5. Ficheiros do projeto</h2>

        {project.assets.length > 0 && (
          <div className="assets-list">
            {project.assets.map((a) => (
              <div key={a.id} className="asset-row">
                <span className={`asset-kind kind-${a.kind.toLowerCase()}`}>{a.kind}</span>
                <span className="asset-name">
                  {(a.metaJson as { filename?: string } | null)?.filename ??
                    a.uri.slice(0, 50) + (a.uri.length > 50 ? "…" : "")}
                </span>
                <span className="asset-date">
                  {new Date(a.createdAt).toLocaleDateString("pt-PT")}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="upload-form">
          <select
            value={uploadKind}
            onChange={(e) => setUploadKind(e.target.value as typeof uploadKind)}
            style={{ width: "auto" }}
          >
            <option value="PHOTO">Fotografia</option>
            <option value="PLAN">Planta</option>
            <option value="DOC">Documento</option>
          </select>
          <input
            type="file"
            accept={
              uploadKind === "PHOTO" || uploadKind === "PLAN" ? "image/*" : "*/*"
            }
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            style={{ width: "auto", flex: 1 }}
          />
          <button
            className="btn"
            disabled={!uploadFile || uploadMut.isLoading}
            onClick={() => void handleUpload()}
          >
            {uploadMut.isLoading ? "A enviar…" : "Carregar"}
          </button>
        </div>
        {uploadMut.isSuccess && (
          <p style={{ color: "#155724", fontSize: 13 }}>Ficheiro carregado com sucesso.</p>
        )}
        {uploadMut.error && <p className="error-msg">{uploadMut.error.message}</p>}
      </div>

      {/* 6. Histórico de versões */}
      {project.versions.length > 0 && (
        <div className="card">
          <h2>6. Histórico de versões</h2>
          <table className="versions-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fase</th>
                <th>Data</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {project.versions.map((v) => (
                <tr key={v.id} className={v.id === activeVersionId ? "active-row" : ""}>
                  <td>
                    <code style={{ fontSize: 12 }}>{v.id.slice(0, 8)}…</code>
                  </td>
                  <td>{v.stage}</td>
                  <td style={{ fontSize: 13 }}>
                    {new Date(v.createdAt).toLocaleDateString("pt-PT")}
                  </td>
                  <td>
                    {v.id !== activeVersionId && (
                      <button
                        className="btn secondary"
                        style={{ fontSize: 11, padding: "3px 10px" }}
                        onClick={() => {
                          setActiveVersionId(v.id);
                          setSessionAlts([]);
                        }}
                      >
                        Carregar
                      </button>
                    )}
                    {v.id === activeVersionId && (
                      <span style={{ fontSize: 12, color: "#155724" }}>activa</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
