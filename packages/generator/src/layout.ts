import type { Layout, LayoutRoom, LayoutWall, ProgramRequirements } from "@arquiteure/core";

/**
 * Gerador determinístico de layout retangular baseado em "slicing recursivo".
 * Não pretende ser ótimo; gera N alternativas válidas que depois são
 * pontuadas e confrontadas com o validator.
 *
 * Estratégia:
 * 1. Calcula bbox do lote disponível.
 * 2. Ordena compartimentos por área-alvo descendente.
 * 3. Corta faixas alternadamente horizontais/verticais.
 * 4. Emite paredes entre compartimentos.
 */
export interface GenerateOptions {
  lotWidth: number;
  lotDepth: number;
  ceilingHeight?: number;
  seed?: number;
}

interface RoomSpec {
  kind: string;
  label: string;
  targetAreaM2: number;
}

export function expandProgram(program: ProgramRequirements): RoomSpec[] {
  const out: RoomSpec[] = [];
  const defaults: Record<string, number> = {
    bedroom: 12,
    livingroom: 16,
    kitchen: 8,
    bathroom: 4,
    corridor: 4,
    office: 10,
  };
  let counters: Record<string, number> = {};
  for (const r of program.rooms) {
    const count = r.count ?? 1;
    const area = r.minAreaM2 ?? defaults[r.kind] ?? 10;
    for (let i = 0; i < count; i++) {
      counters[r.kind] = (counters[r.kind] ?? 0) + 1;
      out.push({
        kind: r.kind,
        label: `${capitalize(r.kind)} ${counters[r.kind]}`,
        targetAreaM2: area,
      });
    }
  }
  return out.sort((a, b) => b.targetAreaM2 - a.targetAreaM2);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Gera um layout. Retorna null se o programa não cabe no lote. */
export function generateLayout(program: ProgramRequirements, opts: GenerateOptions, variant = 0): Layout | null {
  const rooms = expandProgram(program);
  const totalArea = rooms.reduce((s, r) => s + r.targetAreaM2, 0);
  const lotArea = opts.lotWidth * opts.lotDepth;
  if (totalArea > lotArea * 0.95) return null;

  const layoutRooms: LayoutRoom[] = [];
  const walls: LayoutWall[] = [];

  // Slicing recursivo: horizontal/vertical baseado no variant.
  let regions: Array<{ x: number; y: number; w: number; d: number; rooms: RoomSpec[] }> = [
    { x: 0, y: 0, w: opts.lotWidth, d: opts.lotDepth, rooms },
  ];

  const placed: Array<{ id: string; spec: RoomSpec; x: number; y: number; w: number; d: number }> = [];
  let idx = 0;

  while (regions.length > 0) {
    const region = regions.shift()!;
    if (region.rooms.length === 0) continue;
    if (region.rooms.length === 1) {
      const r = region.rooms[0]!;
      placed.push({ id: `r${idx++}`, spec: r, x: region.x, y: region.y, w: region.w, d: region.d });
      continue;
    }
    // Divide lista ~ a meio pela área acumulada.
    const totalR = region.rooms.reduce((s, r) => s + r.targetAreaM2, 0);
    let acc = 0;
    let splitIdx = 0;
    for (let i = 0; i < region.rooms.length; i++) {
      acc += region.rooms[i]!.targetAreaM2;
      if (acc >= totalR / 2) {
        splitIdx = i + 1;
        break;
      }
    }
    const left = region.rooms.slice(0, splitIdx);
    const right = region.rooms.slice(splitIdx);
    const leftFrac = left.reduce((s, r) => s + r.targetAreaM2, 0) / totalR;

    const splitHorizontal = (region.w + variant) % 2 === 0;
    if (splitHorizontal && region.w > region.d) {
      const splitAt = region.w * leftFrac;
      regions.push({ x: region.x, y: region.y, w: splitAt, d: region.d, rooms: left });
      regions.push({ x: region.x + splitAt, y: region.y, w: region.w - splitAt, d: region.d, rooms: right });
    } else {
      const splitAt = region.d * leftFrac;
      regions.push({ x: region.x, y: region.y, w: region.w, d: splitAt, rooms: left });
      regions.push({ x: region.x, y: region.y + splitAt, w: region.w, d: region.d - splitAt, rooms: right });
    }
  }

  for (const p of placed) {
    layoutRooms.push({
      id: p.id,
      kind: p.spec.kind,
      label: p.spec.label,
      areaM2: Math.round(p.w * p.d * 100) / 100,
      polygon: [
        [p.x, p.y],
        [p.x + p.w, p.y],
        [p.x + p.w, p.y + p.d],
        [p.x, p.y + p.d],
      ],
    });
    const wallBase = `w${p.id}`;
    walls.push(
      { id: `${wallBase}-S`, from: [p.x, p.y], to: [p.x + p.w, p.y], thickness: 0.2 },
      { id: `${wallBase}-E`, from: [p.x + p.w, p.y], to: [p.x + p.w, p.y + p.d], thickness: 0.2 },
      { id: `${wallBase}-N`, from: [p.x + p.w, p.y + p.d], to: [p.x, p.y + p.d], thickness: 0.2 },
      { id: `${wallBase}-W`, from: [p.x, p.y + p.d], to: [p.x, p.y], thickness: 0.2 },
    );
  }

  return {
    units: "m",
    bbox: { width: opts.lotWidth, height: opts.lotDepth },
    rooms: layoutRooms,
    walls,
    openings: generateOpenings(layoutRooms, walls),
    ceilingHeight: opts.ceilingHeight ?? 2.6,
  };
}

/** Coloca uma janela em cada compartimento habitável (primeira parede). */
function generateOpenings(rooms: LayoutRoom[], walls: LayoutWall[]) {
  const habitable = ["bedroom", "livingroom", "kitchen", "office"];
  const openings = [];
  for (const r of rooms) {
    if (!habitable.includes(r.kind)) continue;
    const firstWall = walls.find((w) => w.id.startsWith(`w${r.id}-S`));
    if (firstWall) {
      openings.push({
        id: `op-${r.id}`,
        wallId: firstWall.id,
        kind: "WINDOW" as const,
        widthM: 1.2,
        heightM: 1.2,
        position: 0.5,
      });
    }
  }
  return openings;
}

/** Gera múltiplas alternativas (variações de slicing). */
export function generateAlternatives(
  program: ProgramRequirements,
  opts: GenerateOptions,
  count = 3,
): Layout[] {
  const out: Layout[] = [];
  for (let i = 0; i < count; i++) {
    const l = generateLayout(program, opts, i);
    if (l) out.push(l);
  }
  return out;
}
