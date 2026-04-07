"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

export default function NewProjectPage() {
  const router = useRouter();
  const create = trpc.project.create.useMutation({
    onSuccess: (p) => router.push(`/projects/${p.id}`),
  });
  const [name, setName] = useState("");
  const [type, setType] = useState<
    "REMODEL" | "EXTENSION" | "NEW_BUILD" | "INDUSTRIAL" | "HOUSING" | "MIXED_USE"
  >("HOUSING");
  const [municipality, setMunicipality] = useState("Lisboa");
  const [description, setDescription] = useState("");

  return (
    <div className="card">
      <h1>Novo projeto</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({ name, type, municipality, description });
        }}
      >
        <p>
          <label>Nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </p>
        <p>
          <label>Tipo</label>
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="HOUSING">Habitação</option>
            <option value="REMODEL">Remodelação</option>
            <option value="EXTENSION">Ampliação</option>
            <option value="NEW_BUILD">Construção nova</option>
            <option value="MIXED_USE">Uso misto</option>
            <option value="INDUSTRIAL">Industrial</option>
          </select>
        </p>
        <p>
          <label>Município</label>
          <input value={municipality} onChange={(e) => setMunicipality(e.target.value)} />
        </p>
        <p>
          <label>Descrição</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: remodelação de T2 na Graça para família de 4 pessoas com restrição de orçamento 60k€"
          />
        </p>
        <button className="btn" disabled={create.isLoading}>
          {create.isLoading ? "A criar…" : "Criar"}
        </button>
      </form>
    </div>
  );
}
