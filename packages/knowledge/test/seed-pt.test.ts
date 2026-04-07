import { describe, expect, it } from "vitest";
import { PT_RULES } from "../src/seed-pt.js";

describe("PT rule seed", () => {
  it("contém todas as categorias chave", () => {
    const cats = new Set(PT_RULES.map((r) => r.category));
    expect(cats.has("HABITABILIDADE")).toBe(true);
    expect(cats.has("AREA_MINIMA")).toBe(true);
    expect(cats.has("ACESSIBILIDADE")).toBe(true);
    expect(cats.has("URBANISMO")).toBe(true);
  });

  it("predicados têm ruleCode coerente com a regra", () => {
    for (const r of PT_RULES) {
      expect(r.predicate.ruleCode).toBe(r.code);
      expect(r.predicate.severity).toMatch(/INFO|WARN|BLOCK/);
    }
  });

  it("regra de pé-direito mínimo é BLOCK e 2.4 m", () => {
    const r = PT_RULES.find((x) => x.code === "RGEU-65");
    expect(r).toBeDefined();
    expect(r!.predicate.type).toBe("min");
    if (r!.predicate.type === "min") {
      expect(r!.predicate.value).toBe(2.4);
      expect(r!.predicate.severity).toBe("BLOCK");
    }
  });
});
