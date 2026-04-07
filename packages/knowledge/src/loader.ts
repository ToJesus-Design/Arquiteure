import { prisma } from "@arquiteure/db";
import { PT_RULES } from "./seed-pt.js";

/** Insere/atualiza as regras PT na base de dados. Idempotente por code. */
export async function loadPortugueseRules(): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;
  for (const r of PT_RULES) {
    const existing = await prisma.rule.findUnique({ where: { code: r.code } });
    if (existing) {
      await prisma.rule.update({
        where: { code: r.code },
        data: {
          source: r.source,
          category: r.category,
          title: r.title,
          textMd: r.textMd,
          machineJson: r.predicate as object,
        },
      });
      updated++;
    } else {
      await prisma.rule.create({
        data: {
          code: r.code,
          source: r.source,
          jurisdiction: "PT",
          category: r.category,
          title: r.title,
          textMd: r.textMd,
          machineJson: r.predicate as object,
        },
      });
      inserted++;
    }
  }
  return { inserted, updated };
}
