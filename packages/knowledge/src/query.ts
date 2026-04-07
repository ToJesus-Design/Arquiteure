import { prisma } from "@arquiteure/db";
import type { Predicate } from "./predicates.js";

/** Devolve regras aplicáveis a um tipo de projeto. */
export async function rulesForProjectType(projectType: string) {
  const all = await prisma.rule.findMany({ where: { jurisdiction: "PT" } });
  return all.filter((r) => {
    const p = r.machineJson as unknown as Predicate;
    return !p.appliesTo || p.appliesTo.includes(projectType);
  });
}

export async function rulesByCategory(category: string) {
  return prisma.rule.findMany({ where: { category } });
}
