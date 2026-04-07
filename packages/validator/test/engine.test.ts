import { describe, expect, it } from "vitest";
import { validate, summarize } from "../src/engine.js";
import type { Layout } from "@arquiteure/core";

const rules = [
  {
    id: "r1",
    code: "RGEU-65",
    machineJson: {
      type: "min",
      field: "ceilingHeight",
      value: 2.4,
      unit: "m",
      ruleCode: "RGEU-65",
      severity: "BLOCK",
      message: "Pé-direito < 2.4",
    },
  },
  {
    id: "r2",
    code: "RGEU-66-QUARTO",
    machineJson: {
      type: "roomMinArea",
      roomKind: "bedroom",
      minAreaM2: 9,
      ruleCode: "RGEU-66-QUARTO",
      severity: "BLOCK",
      message: "Quarto < 9 m²",
    },
  },
];

function layout(opts: { ceiling: number; bedroomArea: number }): Layout {
  return {
    units: "m",
    bbox: { width: 10, height: 10 },
    ceilingHeight: opts.ceiling,
    walls: [],
    openings: [],
    rooms: [
      {
        id: "b1",
        kind: "bedroom",
        label: "Quarto 1",
        polygon: [
          [0, 0],
          [3, 0],
          [3, opts.bedroomArea / 3],
          [0, opts.bedroomArea / 3],
        ],
        areaM2: opts.bedroomArea,
      },
    ],
  };
}

describe("validator engine", () => {
  it("aprova layout conforme", () => {
    const res = validate(rules, { projectType: "HOUSING", layout: layout({ ceiling: 2.6, bedroomArea: 12 }) });
    const s = summarize(res);
    expect(s.blocks).toBe(0);
  });

  it("bloqueia pé-direito insuficiente", () => {
    const res = validate(rules, { projectType: "HOUSING", layout: layout({ ceiling: 2.1, bedroomArea: 12 }) });
    expect(res.some((r) => r.ruleCode === "RGEU-65" && !r.passed)).toBe(true);
  });

  it("bloqueia quarto com área insuficiente", () => {
    const res = validate(rules, { projectType: "HOUSING", layout: layout({ ceiling: 2.6, bedroomArea: 7 }) });
    expect(res.some((r) => r.ruleCode === "RGEU-66-QUARTO" && !r.passed)).toBe(true);
  });
});
