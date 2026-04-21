import type { Layout } from "@arquiteure/core";

const LAYERS = [
  { name: "ROOMS", color: 3 },
  { name: "WALLS", color: 7 },
  { name: "LABELS", color: 1 },
  { name: "OPENINGS", color: 5 },
];

function dxfHeader(): string[] {
  return [
    "0", "SECTION",
    "2", "HEADER",
    "9", "$ACADVER",
    "1", "AC1015",
    "9", "$INSUNITS",
    "70", "4",
    "0", "ENDSEC",
  ];
}

function dxfTables(): string[] {
  const lines: string[] = ["0", "SECTION", "2", "TABLES", "0", "TABLE", "2", "LAYER"];
  for (const layer of LAYERS) {
    lines.push(
      "0", "LAYER",
      "2", layer.name,
      "70", "0",
      "62", String(layer.color),
      "6", "CONTINUOUS",
    );
  }
  lines.push("0", "ENDTAB", "0", "ENDSEC");
  return lines;
}

function dxfPolyline(pts: Array<[number, number]>, layer: string): string[] {
  const lines: string[] = ["0", "LWPOLYLINE", "8", layer, "90", String(pts.length), "70", "1"];
  for (const [x, y] of pts) {
    lines.push("10", x.toFixed(4), "20", y.toFixed(4));
  }
  return lines;
}

function dxfLine(from: [number, number], to: [number, number], layer: string): string[] {
  return [
    "0", "LINE",
    "8", layer,
    "10", from[0].toFixed(4), "20", from[1].toFixed(4), "30", "0",
    "11", to[0].toFixed(4), "21", to[1].toFixed(4), "31", "0",
  ];
}

function dxfText(text: string, x: number, y: number, height: number, layer: string): string[] {
  return [
    "0", "TEXT",
    "8", layer,
    "10", x.toFixed(4), "20", y.toFixed(4), "30", "0",
    "40", String(height),
    "1", text,
    "72", "1",
  ];
}

export function layoutToDxf(layout: Layout): string {
  const lines: string[] = [];

  lines.push(...dxfHeader());
  lines.push(...dxfTables());

  lines.push("0", "SECTION", "2", "ENTITIES");

  // Room outlines as closed polylines
  for (const room of layout.rooms) {
    lines.push(...dxfPolyline(room.polygon, "ROOMS"));

    const cx = room.polygon.reduce((s, p) => s + p[0], 0) / room.polygon.length;
    const cy = room.polygon.reduce((s, p) => s + p[1], 0) / room.polygon.length;
    lines.push(...dxfText(`${room.label}`, cx, cy + 0.15, 0.25, "LABELS"));
    lines.push(...dxfText(`${room.areaM2.toFixed(1)} m2`, cx, cy - 0.15, 0.18, "LABELS"));
  }

  // Walls as lines
  for (const wall of layout.walls) {
    lines.push(...dxfLine(wall.from, wall.to, "WALLS"));
  }

  // Openings as circles (approximated with point markers)
  for (const op of layout.openings) {
    const wall = layout.walls.find((w) => w.id === op.wallId);
    if (!wall) continue;
    const x = wall.from[0] + (wall.to[0] - wall.from[0]) * op.position;
    const y = wall.from[1] + (wall.to[1] - wall.from[1]) * op.position;
    lines.push(
      "0", "CIRCLE",
      "8", "OPENINGS",
      "10", x.toFixed(4), "20", y.toFixed(4), "30", "0",
      "40", (op.widthM / 2).toFixed(4),
    );
    lines.push(...dxfText(op.kind === "DOOR" ? "P" : "J", x, y, 0.15, "LABELS"));
  }

  lines.push("0", "ENDSEC", "0", "EOF");
  return lines.join("\n");
}
