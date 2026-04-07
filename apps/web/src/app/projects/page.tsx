"use client";
import Link from "next/link";
import { trpc } from "@/lib/trpc";

export default function ProjectsPage() {
  const { data, isLoading } = trpc.project.list.useQuery();
  if (isLoading) return <p>A carregar…</p>;
  return (
    <div>
      <div className="card">
        <h1>Projetos</h1>
        <Link href="/projects/new" className="btn">Novo projeto</Link>
      </div>
      {(data ?? []).map((p) => (
        <div key={p.id} className="card">
          <h3>
            <Link href={`/projects/${p.id}`}>{p.name}</Link>
          </h3>
          <p>
            {p.type} · {p.municipality ?? "—"} · <em>{p.status}</em>
          </p>
        </div>
      ))}
      {data?.length === 0 && <p>Sem projetos ainda.</p>}
    </div>
  );
}
