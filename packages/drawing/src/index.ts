import type { Layout } from "@arquiteure/core";

/**
 * Converte um Layout para SVG. Escala em pixels, origem no canto superior
 * esquerdo (Y invertido face ao domínio em metros).
 */
export function layoutToSvg(layout: Layout, opts: { scale?: number } = {}): string {
  const scale = opts.scale ?? 30; // 30 px/m
  const w = layout.bbox.width * scale;
  const h = layout.bbox.height * scale;

  const rooms = layout.rooms
    .map((r) => {
      const pts = r.polygon.map(([x, y]) => `${x * scale},${h - y * scale}`).join(" ");
      const cx =
        (r.polygon.reduce((s, p) => s + p[0], 0) / r.polygon.length) * scale;
      const cy = h - (r.polygon.reduce((s, p) => s + p[1], 0) / r.polygon.length) * scale;
      return `<g>
  <polygon points="${pts}" fill="${colorFor(r.kind)}" stroke="#333" stroke-width="1"/>
  <text x="${cx}" y="${cy}" font-size="11" text-anchor="middle" fill="#111">${r.label}</text>
  <text x="${cx}" y="${cy + 14}" font-size="9" text-anchor="middle" fill="#555">${r.areaM2.toFixed(1)} m²</text>
</g>`;
    })
    .join("\n");

  const walls = layout.walls
    .map(
      (wl) =>
        `<line x1="${wl.from[0] * scale}" y1="${h - wl.from[1] * scale}" x2="${wl.to[0] * scale}" y2="${h - wl.to[1] * scale}" stroke="#000" stroke-width="${wl.thickness * scale * 0.2}" />`,
    )
    .join("\n");

  const openings = layout.openings
    .map((op) => {
      const wall = layout.walls.find((w) => w.id === op.wallId);
      if (!wall) return "";
      const x = (wall.from[0] + (wall.to[0] - wall.from[0]) * op.position) * scale;
      const y = h - (wall.from[1] + (wall.to[1] - wall.from[1]) * op.position) * scale;
      const color = op.kind === "DOOR" ? "#8b4513" : "#4ea3ff";
      return `<circle cx="${x}" cy="${y}" r="4" fill="${color}"><title>${op.kind} ${op.widthM}m</title></circle>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="#fafafa"/>
  ${rooms}
  ${walls}
  ${openings}
</svg>`;
}

function colorFor(kind: string): string {
  const palette: Record<string, string> = {
    bedroom: "#fff3c4",
    livingroom: "#d0f0c0",
    kitchen: "#ffd6a5",
    bathroom: "#c4e0ff",
    corridor: "#eee",
    office: "#e0d4ff",
  };
  return palette[kind] ?? "#f4f4f4";
}
