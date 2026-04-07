import type { Layout, ValidationResult } from "@arquiteure/core";
import type { Predicate } from "@arquiteure/knowledge";

export interface ValidationContext {
  projectType: string;
  layout: Layout;
  /** Razão entre área de implantação e área do lote (0..1). */
  buildingFootprintRatio?: number;
  /** Zona urbanística aplicável. */
  zone?: string;
  /** Larguras de corredor identificadas (em m). */
  corridorWidthsM?: number[];
}

export interface RuleLike {
  id: string;
  code: string;
  machineJson: unknown;
}

/**
 * Avalia um conjunto de regras (cada uma com um Predicate em machineJson)
 * contra o contexto fornecido. Devolve uma lista de ValidationResult.
 */
export function validate(rules: RuleLike[], ctx: ValidationContext): ValidationResult[] {
  const results: ValidationResult[] = [];
  for (const rule of rules) {
    const pred = rule.machineJson as Predicate;
    if (pred.appliesTo && !pred.appliesTo.includes(ctx.projectType)) continue;
    results.push(...evaluate(rule, pred, ctx));
  }
  return results;
}

function evaluate(rule: RuleLike, pred: Predicate, ctx: ValidationContext): ValidationResult[] {
  switch (pred.type) {
    case "min":
      return [evalMin(rule, pred, ctx)];
    case "max":
      return [evalMax(rule, pred, ctx)];
    case "roomMinArea":
      return evalRoomMinArea(rule, pred, ctx);
    case "requiresWindow":
      return evalRequiresWindow(rule, pred, ctx);
    case "requiresAccessRoute":
      return [evalAccessRoute(rule, pred, ctx)];
    case "useAllowed":
      return [evalUseAllowed(rule, pred, ctx)];
  }
}

function evalMin(rule: RuleLike, pred: Extract<Predicate, { type: "min" }>, ctx: ValidationContext): ValidationResult {
  const observed = ctx.layout.ceilingHeight;
  const passed = observed >= pred.value;
  return {
    ruleId: rule.id,
    ruleCode: rule.code,
    passed,
    severity: pred.severity,
    message: passed ? `OK: pé-direito ${observed} m ≥ ${pred.value} m.` : pred.message,
    field: pred.field,
    observed,
    expected: `≥ ${pred.value}`,
  };
}

function evalMax(rule: RuleLike, pred: Extract<Predicate, { type: "max" }>, ctx: ValidationContext): ValidationResult {
  const observed = ctx.buildingFootprintRatio ?? 0;
  const passed = observed <= pred.value;
  return {
    ruleId: rule.id,
    ruleCode: rule.code,
    passed,
    severity: pred.severity,
    message: passed ? `OK: índice ${observed.toFixed(2)} ≤ ${pred.value}.` : pred.message,
    field: pred.field,
    observed,
    expected: `≤ ${pred.value}`,
  };
}

function evalRoomMinArea(
  rule: RuleLike,
  pred: Extract<Predicate, { type: "roomMinArea" }>,
  ctx: ValidationContext,
): ValidationResult[] {
  const matching = ctx.layout.rooms.filter((r) => r.kind === pred.roomKind);
  if (matching.length === 0) return [];
  return matching.map((r) => ({
    ruleId: rule.id,
    ruleCode: rule.code,
    passed: r.areaM2 >= pred.minAreaM2,
    severity: pred.severity,
    message:
      r.areaM2 >= pred.minAreaM2
        ? `OK: ${r.label} com ${r.areaM2.toFixed(1)} m².`
        : `${pred.message} (${r.label}: ${r.areaM2.toFixed(1)} m²)`,
    observed: r.areaM2,
    expected: `≥ ${pred.minAreaM2} m²`,
  }));
}

function evalRequiresWindow(
  rule: RuleLike,
  pred: Extract<Predicate, { type: "requiresWindow" }>,
  ctx: ValidationContext,
): ValidationResult[] {
  // Para cada compartimento que precisa de janela, verifica se há
  // alguma abertura WINDOW associada a uma das paredes que o limitam.
  const windowed = new Set<string>();
  for (const op of ctx.layout.openings) {
    if (op.kind !== "WINDOW") continue;
    const wall = ctx.layout.walls.find((w) => w.id === op.wallId);
    if (!wall) continue;
    for (const room of ctx.layout.rooms) {
      if (wallTouchesRoom(wall, room.polygon)) windowed.add(room.id);
    }
  }
  const targets = ctx.layout.rooms.filter((r) => pred.roomKinds.includes(r.kind));
  return targets.map((r) => ({
    ruleId: rule.id,
    ruleCode: rule.code,
    passed: windowed.has(r.id),
    severity: pred.severity,
    message: windowed.has(r.id) ? `OK: ${r.label} tem janela.` : `${pred.message} (${r.label})`,
  }));
}

function evalAccessRoute(
  rule: RuleLike,
  pred: Extract<Predicate, { type: "requiresAccessRoute" }>,
  ctx: ValidationContext,
): ValidationResult {
  const widths = ctx.corridorWidthsM ?? [];
  if (widths.length === 0) {
    return {
      ruleId: rule.id,
      ruleCode: rule.code,
      passed: false,
      severity: "INFO",
      message: "Sem corredores identificados — verificação de acessibilidade adiada.",
    };
  }
  const min = Math.min(...widths);
  return {
    ruleId: rule.id,
    ruleCode: rule.code,
    passed: min >= pred.minWidthM,
    severity: pred.severity,
    message: min >= pred.minWidthM ? `OK: corredor mínimo ${min} m.` : pred.message,
    observed: min,
    expected: `≥ ${pred.minWidthM} m`,
  };
}

function evalUseAllowed(
  rule: RuleLike,
  pred: Extract<Predicate, { type: "useAllowed" }>,
  ctx: ValidationContext,
): ValidationResult {
  if (!ctx.zone || ctx.zone !== pred.zone) {
    return {
      ruleId: rule.id,
      ruleCode: rule.code,
      passed: true,
      severity: "INFO",
      message: `Zona ${ctx.zone ?? "?"} não corresponde a esta regra (${pred.zone}); ignorada.`,
    };
  }
  const passed = pred.allowedTypes.includes(ctx.projectType);
  return {
    ruleId: rule.id,
    ruleCode: rule.code,
    passed,
    severity: pred.severity,
    message: passed ? `OK: tipo ${ctx.projectType} permitido em ${pred.zone}.` : pred.message,
  };
}

function wallTouchesRoom(
  wall: { from: [number, number]; to: [number, number] },
  polygon: Array<[number, number]>,
): boolean {
  // Heurística: a parede toca o compartimento se ambos os endpoints
  // coincidem (com tolerância) com vértices consecutivos do polígono.
  const eq = (a: [number, number], b: [number, number]) =>
    Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    if ((eq(a, wall.from) && eq(b, wall.to)) || (eq(a, wall.to) && eq(b, wall.from))) return true;
  }
  return false;
}

/** Resumo agregado: número de bloqueios, avisos, OKs. */
export function summarize(results: ValidationResult[]) {
  const blocks = results.filter((r) => !r.passed && r.severity === "BLOCK").length;
  const warns = results.filter((r) => !r.passed && r.severity === "WARN").length;
  const oks = results.filter((r) => r.passed).length;
  return { blocks, warns, oks, total: results.length, legalScore: oks / Math.max(1, results.length) };
}
