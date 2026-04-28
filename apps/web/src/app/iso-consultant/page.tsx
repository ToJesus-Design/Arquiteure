"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

const NORMAS = [
  "ISO 9001 – Qualidade",
  "ISO 22000 – Segurança Alimentar",
  "ISO 14001 – Ambiente",
  "ISO 45001 – Segurança e Saúde no Trabalho",
  "ISO 50001 – Energia",
  "ISO 13485 – Dispositivos Médicos",
  "ISO/IEC 27001 – Segurança da Informação",
  "ISO 17025 – Laboratórios",
  "Outra",
];

const SETORES = [
  "Indústria Alimentar",
  "Bebidas",
  "Indústria Transformadora",
  "Logística / Transporte",
  "Saúde",
  "Serviços",
  "Construção",
  "Tecnologia",
  "Retalho",
  "Outro",
];

export default function IsoConsultantPage() {
  const router = useRouter();
  const { data: conversations, isLoading, refetch } = trpc.isoConsultant.listConversations.useQuery();
  const createMutation = trpc.isoConsultant.createConversation.useMutation();
  const deleteMutation = trpc.isoConsultant.deleteConversation.useMutation();

  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", norm: "", industry: "", companySize: "", maturityLevel: "" });

  async function handleCreate() {
    const convo = await createMutation.mutateAsync({
      title: form.title.trim() || undefined,
      norm: form.norm || undefined,
      industry: form.industry || undefined,
      companySize: form.companySize || undefined,
      maturityLevel: form.maturityLevel || undefined,
    });
    router.push(`/iso-consultant/${convo.id}`);
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar esta conversa?")) return;
    await deleteMutation.mutateAsync({ id });
    refetch();
  }

  if (isLoading) return <p>A carregar…</p>;

  return (
    <div>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Consultor ISO</h1>
          <p style={{ margin: "4px 0 0", color: "#555", fontSize: 14 }}>
            Apoio virtual para implementação, manutenção e melhoria de sistemas de gestão certificáveis.
          </p>
        </div>
        <button className="btn" onClick={() => setShowNew(true)}>+ Nova Consulta</button>
      </div>

      {showNew && (
        <div className="card" style={{ border: "2px solid #111" }}>
          <h3 style={{ marginTop: 0 }}>Configurar nova consulta</h3>
          <div className="row" style={{ marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Título (opcional)</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex.: Implementação ISO 9001 — Empresa X"
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Norma ISO</label>
              <select value={form.norm} onChange={(e) => setForm({ ...form, norm: e.target.value })}>
                <option value="">Selecionar norma…</option>
                {NORMAS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="row" style={{ marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Setor Industrial</label>
              <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
                <option value="">Selecionar setor…</option>
                {SETORES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Porte da empresa</label>
              <select value={form.companySize} onChange={(e) => setForm({ ...form, companySize: e.target.value })}>
                <option value="">Selecionar…</option>
                <option value="micro">Micro (&lt; 10 trabalhadores)</option>
                <option value="pequena">Pequena (10–49)</option>
                <option value="media">Média (50–249)</option>
                <option value="grande">Grande (≥ 250)</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Maturidade do sistema existente</label>
            <select
              value={form.maturityLevel}
              onChange={(e) => setForm({ ...form, maturityLevel: e.target.value })}
              style={{ maxWidth: 360 }}
            >
              <option value="">Selecionar…</option>
              <option value="inicial">Inicial — pouca ou nenhuma documentação</option>
              <option value="parcial">Parcial — sistema incompleto ou desatualizado</option>
              <option value="avancado">Avançado — quase pronto para auditoria</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={handleCreate} disabled={createMutation.isLoading}>
              {createMutation.isLoading ? "A criar…" : "Iniciar Consulta"}
            </button>
            <button className="btn secondary" onClick={() => setShowNew(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {!conversations?.length && !showNew && (
        <div className="card" style={{ textAlign: "center", padding: 48, color: "#666" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <p style={{ margin: 0 }}>Ainda não tem consultas ISO.</p>
          <p style={{ margin: "4px 0 16px", fontSize: 14 }}>Clique em <strong>+ Nova Consulta</strong> para começar.</p>
        </div>
      )}

      {conversations?.map((c) => (
        <div key={c.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, cursor: "pointer" }} onClick={() => router.push(`/iso-consultant/${c.id}`)}>
            <strong>{c.title}</strong>
            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              {c.norm && <span className="pill ok">{c.norm}</span>}
              {c.industry && <span className="pill warn">{c.industry}</span>}
              {c.companySize && <span className="pill" style={{ background: "#e8eaf6", color: "#3949ab" }}>{c.companySize}</span>}
            </div>
            {c.messages[0] && (
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 600 }}>
                {c.messages[0].role === "assistant" ? "Consultor: " : "Você: "}
                {c.messages[0].content}
              </p>
            )}
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#aaa" }}>
              {new Date(c.updatedAt).toLocaleString("pt-PT")}
            </p>
          </div>
          <button
            className="btn secondary"
            style={{ fontSize: 12, padding: "4px 10px", marginLeft: 12 }}
            onClick={() => handleDelete(c.id)}
          >
            Eliminar
          </button>
        </div>
      ))}
    </div>
  );
}
