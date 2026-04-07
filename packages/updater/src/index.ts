import { prisma } from "@arquiteure/db";
import { callClaude, COORDINATOR_SYSTEM } from "@arquiteure/ai";
import { audit } from "@arquiteure/audit";

/**
 * Fontes legais portuguesas a verificar periodicamente. O crawler real
 * usa fetch HTTP; em fallback usa o LLM para resumir a diferença.
 */
export const SOURCES = [
  { id: "dre-rgeu", name: "RGEU", url: "https://dre.pt/dre/legislacao-consolidada/decreto/1951-34492075" },
  { id: "dre-rjue", name: "RJUE", url: "https://dre.pt/dre/legislacao-consolidada/decreto-lei/1999-34537075" },
  { id: "dre-dl163", name: "DL 163/2006 (acessibilidade)", url: "https://dre.pt/dre/legislacao-consolidada/decreto-lei/2006-73760575" },
  { id: "dre-scie", name: "RJ-SCIE", url: "https://dre.pt/dre/legislacao-consolidada/decreto-lei/2008-34507575" },
];

/**
 * Executa o ciclo de atualização: para cada regra, verifica se houve
 * alteração na fonte e, em caso afirmativo, cria um RuleUpdate e um
 * evento de auditoria. Não mexe na regra existente até revisão humana.
 */
export async function runUpdateCycle(): Promise<{ checked: number; changes: number }> {
  const rules = await prisma.rule.findMany({ where: { jurisdiction: "PT" } });
  let changes = 0;

  for (const rule of rules) {
    try {
      const sourceUrl = sourceUrlFor(rule.source);
      const remoteText = await fetchSource(sourceUrl);
      if (!remoteText) continue;

      const diff = await detectDiff(rule.textMd, remoteText, rule.title);
      if (diff.hasChanges) {
        await prisma.ruleUpdate.create({
          data: {
            ruleId: rule.id,
            sourceUrl,
            diffJson: diff as object,
            impactNote: diff.impactNote,
          },
        });
        await audit({
          actor: "system:updater",
          action: "RULE_UPDATE_DETECTED",
          entity: "Rule",
          entityId: rule.id,
          after: { impact: diff.impactNote },
        });
        changes++;
      }
    } catch (err) {
      await audit({
        actor: "system:updater",
        action: "RULE_UPDATE_ERROR",
        entity: "Rule",
        entityId: rule.id,
        after: { error: String(err) },
      });
    }
  }

  return { checked: rules.length, changes };
}

function sourceUrlFor(sourceRef: string): string {
  const s = SOURCES.find((x) => sourceRef.toLowerCase().includes(x.name.toLowerCase().split(" ")[0]!));
  return s?.url ?? "https://dre.pt/";
}

async function fetchSource(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Arquiteure-Updater/0.1" } });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 50_000); // limite para prompt
  } catch {
    return null;
  }
}

interface DiffResult {
  hasChanges: boolean;
  impactNote: string;
  summary: string;
}

async function detectDiff(
  currentText: string,
  remoteText: string,
  title: string,
): Promise<DiffResult> {
  const raw = await callClaude({
    system: COORDINATOR_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Título da regra: ${title}

Texto atual na plataforma:
"""
${currentText}
"""

Texto remoto (HTML da fonte oficial, pode conter markup):
"""
${remoteText.slice(0, 8000)}
"""

Compara. Devolve JSON estrito:
{ "hasChanges": boolean, "summary": string, "impactNote": string }

- hasChanges: true apenas se houver alteração normativa material.
- summary: resumo textual da diferença.
- impactNote: qual o impacto potencial em projetos anteriores.`,
      },
    ],
    temperature: 0,
  });
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return { hasChanges: false, impactNote: "", summary: "" };
  try {
    return JSON.parse(m[0]) as DiffResult;
  } catch {
    return { hasChanges: false, impactNote: "", summary: "" };
  }
}
