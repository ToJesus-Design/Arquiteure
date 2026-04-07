import { describe, expect, it } from "vitest";
import { generateAlternatives, generateLayout } from "../src/layout.js";
import { score } from "../src/score.js";

const program = {
  rooms: [
    { kind: "livingroom", count: 1, minAreaM2: 20 },
    { kind: "kitchen", count: 1, minAreaM2: 8 },
    { kind: "bedroom", count: 2, minAreaM2: 12 },
    { kind: "bathroom", count: 1, minAreaM2: 5 },
  ],
  constraints: [],
  goals: ["T2 familiar"],
};

describe("generator", () => {
  it("gera layout que cabe no lote", () => {
    const l = generateLayout(program, { lotWidth: 10, lotDepth: 10 });
    expect(l).not.toBeNull();
    expect(l!.rooms.length).toBe(5);
  });

  it("recusa quando programa > lote", () => {
    const l = generateLayout(program, { lotWidth: 3, lotDepth: 3 });
    expect(l).toBeNull();
  });

  it("gera múltiplas alternativas distintas", () => {
    const alts = generateAlternatives(program, { lotWidth: 12, lotDepth: 10 }, 3);
    expect(alts.length).toBe(3);
  });

  it("pontua alternativa", () => {
    const l = generateLayout(program, { lotWidth: 12, lotDepth: 10 })!;
    const s = score(l, program, []);
    expect(s.overall).toBeGreaterThanOrEqual(0);
    expect(s.overall).toBeLessThanOrEqual(1);
  });
});
