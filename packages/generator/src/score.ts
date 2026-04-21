import type { Layout, ProgramRequirements, ScoredAlternative, ValidationResult } from "@arquiteure/core";
import { summarize } from "@arquiteure/validator";

/**
 * Pontuação multi-critério. Valores em [0,1].
 * - legal: proporção de regras cumpridas.
 * - functional: quão bem o layout cobre os compartimentos pedidos.
 * - aesthetic: heurística baseada em rácios de aspeto.
 * - economic: penaliza área total elevada vs budget (quando disponível).
 */
export function score(
  layout: Layout,
  program: ProgramRequirements,
  validations: ValidationResult[],
): ScoredAlternative["scores"] {
  const legal = summarize(validations).legalScore;

  const requested = program.rooms.reduce((s, r) => s + (r.count ?? 1), 0);
  const provided = layout.rooms.length;
  const functional = Math.min(1, provided / Math.max(1, requested));

  const aesthetic = aestheticScore(layout);
  const economic = economicScore(layout, program);

  const overall = legal * 0.45 + functional * 0.25 + aesthetic * 0.15 + economic * 0.15;
  return { legal, functional, aesthetic, economic, overall };
}

function aestheticScore(layout: Layout): number {
  if (layout.rooms.length === 0) return 0;
  let acc = 0;
  for (const r of layout.rooms) {
    const xs = r.polygon.map((p) => p[0]);
    const ys = r.polygon.map((p) => p[1]);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    const ratio = Math.min(w, h) / Math.max(w, h);
    // Ideal ~ 0.6..1. Penaliza corredores esticados.
    acc += ratio >= 0.5 ? 1 : ratio * 2;
  }
  return acc / layout.rooms.length;
}

const COST_PER_M2: Record<string, number> = {
  NEW_BUILD: 1500,
  HOUSING: 1450,
  EXTENSION: 1200,
  REMODEL: 900,
  MIXED_USE: 1300,
  INDUSTRIAL: 750,
};

function economicScore(layout: Layout, program: ProgramRequirements): number {
  const totalArea = layout.rooms.reduce((s, r) => s + r.areaM2, 0);
  if (!program.budgetEur) return 0.75;
  const costPerM2 = COST_PER_M2[(layout as unknown as { projectType?: string }).projectType ?? "NEW_BUILD"] ?? 1200;
  const estimatedCost = totalArea * costPerM2;
  if (estimatedCost <= program.budgetEur) return 1;
  return Math.max(0, 1 - (estimatedCost - program.budgetEur) / program.budgetEur);
}
