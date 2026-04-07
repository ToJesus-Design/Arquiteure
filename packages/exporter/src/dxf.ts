import type { Layout } from "@arquiteure/core";

/**
 * Emite DXF R12 mínimo — ENTITIES section com LINES para paredes e
 * TEXT para etiquetas. Suficiente para importar em AutoCAD/LibreCAD.
 */
export function layoutToDxf(layout: Layout): string {
  const lines: string[] = [];
  lines.push("0", "SECTION", "2", "ENTITIES");

  for (const w of layout.walls) {
    lines.push("0", "LINE", "8", "WALLS");
    lines.push("10", String(w.from[0]), "20", String(w.from[1]), "30", "0");
    lines.push("11", String(w.to[0]), "21", String(w.to[1]), "31", "0");
  }
  for (const r of layout.rooms) {
    const cx = r.polygon.reduce((s, p) => s + p[0], 0) / r.polygon.length;
    const cy = r.polygon.reduce((s, p) => s + p[1], 0) / r.polygon.length;
    lines.push("0", "TEXT", "8", "LABELS");
    lines.push("10", String(cx), "20", String(cy), "30", "0", "40", "0.3");
    lines.push("1", `${r.label} (${r.areaM2.toFixed(1)} m2)`);
  }

  lines.push("0", "ENDSEC", "0", "EOF");
  return lines.join("\n");
}
