import PDFDocument from "pdfkit";
import type { Layout, ValidationResult } from "@arquiteure/core";

export interface PdfDossierInput {
  projectName: string;
  ownerName: string;
  municipality: string;
  stage: string;
  layout: Layout;
  validations: ValidationResult[];
  memoriaDescritivaMd: string;
  ruleCitations: Array<{ code: string; title: string; source: string }>;
}

const ROOM_COLORS: Record<string, string> = {
  bedroom: "#FFF3C4",
  livingroom: "#D0F0C0",
  kitchen: "#FFD6A5",
  bathroom: "#C4E0FF",
  corridor: "#EEEEEE",
  office: "#E0D4FF",
};

function drawLayoutNative(doc: InstanceType<typeof PDFDocument>, layout: Layout): void {
  const margin = (doc as unknown as { page: { margins: { left: number } } }).page.margins.left;
  const pageWidth = (doc as unknown as { page: { width: number } }).page.width;
  const availW = pageWidth - 2 * margin;
  const availH = 260;
  const scaleX = availW / layout.bbox.width;
  const scaleY = availH / layout.bbox.height;
  const scale = Math.min(scaleX, scaleY, 40);
  const drawW = layout.bbox.width * scale;
  const drawH = layout.bbox.height * scale;
  const originX = margin + (availW - drawW) / 2;
  const originY = (doc as unknown as { y: number }).y + 8;

  const toX = (x: number) => originX + x * scale;
  const toY = (y: number) => originY + drawH - y * scale;

  // Background
  (doc as unknown as { rect: (x: number, y: number, w: number, h: number) => unknown })
    .rect(originX, originY, drawW, drawH);
  (doc as unknown as { fillColor: (c: string) => unknown }).fillColor("#FAFAFA");
  (doc as unknown as { fill: () => unknown }).fill();

  // Rooms
  for (const room of layout.rooms) {
    const pts = room.polygon.map(([x, y]): [number, number] => [toX(x), toY(y)]);
    const color = ROOM_COLORS[room.kind] ?? "#F4F4F4";
    (doc as unknown as { save: () => unknown }).save();
    (doc as unknown as { fillColor: (c: string) => unknown }).fillColor(color);
    (doc as unknown as { strokeColor: (c: string) => unknown }).strokeColor("#555555");
    (doc as unknown as { lineWidth: (w: number) => unknown }).lineWidth(0.6);
    const d = doc as unknown as {
      moveTo: (x: number, y: number) => unknown;
      lineTo: (x: number, y: number) => unknown;
      closePath: () => unknown;
      fillAndStroke: () => unknown;
    };
    d.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i++) d.lineTo(pts[i]![0], pts[i]![1]);
    d.closePath();
    d.fillAndStroke();
    (doc as unknown as { restore: () => unknown }).restore();
  }

  // Walls
  (doc as unknown as { save: () => unknown }).save();
  (doc as unknown as { strokeColor: (c: string) => unknown }).strokeColor("#111111");
  (doc as unknown as { lineWidth: (w: number) => unknown }).lineWidth(1.2);
  for (const wall of layout.walls) {
    const d = doc as unknown as {
      moveTo: (x: number, y: number) => unknown;
      lineTo: (x: number, y: number) => unknown;
      stroke: () => unknown;
    };
    d.moveTo(toX(wall.from[0]), toY(wall.from[1]));
    d.lineTo(toX(wall.to[0]), toY(wall.to[1]));
    d.stroke();
  }
  (doc as unknown as { restore: () => unknown }).restore();

  // Room labels
  for (const room of layout.rooms) {
    const cx = room.polygon.reduce((s, p) => s + p[0], 0) / room.polygon.length;
    const cy = room.polygon.reduce((s, p) => s + p[1], 0) / room.polygon.length;
    const px = toX(cx);
    const py = toY(cy);
    (doc as unknown as { fillColor: (c: string) => unknown }).fillColor("#111111");
    (doc as unknown as { fontSize: (n: number) => unknown }).fontSize(6);
    (doc as unknown as { text: (t: string, x: number, y: number, opts: object) => unknown })
      .text(room.label, px - 28, py - 8, { width: 56, align: "center", lineBreak: false });
    (doc as unknown as { fillColor: (c: string) => unknown }).fillColor("#555555");
    (doc as unknown as { fontSize: (n: number) => unknown }).fontSize(5);
    (doc as unknown as { text: (t: string, x: number, y: number, opts: object) => unknown })
      .text(`${room.areaM2.toFixed(1)} m²`, px - 28, py + 1, { width: 56, align: "center", lineBreak: false });
  }

  // Advance cursor past drawing
  (doc as unknown as { y: number }).y = originY + drawH + 12;
  (doc as unknown as { x: number }).x = margin;
  (doc as unknown as { fillColor: (c: string) => unknown }).fillColor("#000000");
  (doc as unknown as { fontSize: (n: number) => unknown }).fontSize(11);
}

export async function generateDossierPdf(input: PdfDossierInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Capa
    doc.fontSize(24).text("Arquiteure", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(18).text("Dossier de Projeto", { align: "center" });
    doc.moveDown(2);
    doc.fontSize(14).text(`Projeto: ${input.projectName}`);
    doc.text(`Requerente: ${input.ownerName}`);
    doc.text(`Município: ${input.municipality}`);
    doc.text(`Fase: ${input.stage}`);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-PT")}`);

    // Memória descritiva
    doc.addPage();
    doc.fontSize(16).text("1. Memória Descritiva", { underline: true });
    doc.moveDown();
    doc.fontSize(11).text(input.memoriaDescritivaMd, { align: "justify" });

    // Peças desenhadas com layout nativo
    doc.addPage();
    doc.fontSize(16).text("2. Peças Desenhadas", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).text(
      `Planta esquemática — ${input.layout.bbox.width} × ${input.layout.bbox.height} m | pé-direito ${input.layout.ceilingHeight} m`,
    );
    doc.moveDown(0.5);

    drawLayoutNative(doc, input.layout);

    doc.moveDown(0.5);
    doc.fontSize(11);
    for (const r of input.layout.rooms) {
      doc.text(`• ${r.label} (${r.kind}) — ${r.areaM2.toFixed(2)} m²`);
    }

    // Conformidade legal
    doc.addPage();
    doc.fontSize(16).text("3. Quadro de Conformidade Legal", { underline: true });
    doc.moveDown();
    for (const v of input.validations) {
      const mark = v.passed ? "✓" : v.severity === "BLOCK" ? "✗ BLOQUEIO" : "△ AVISO";
      doc.fontSize(10).text(`[${mark}] ${v.ruleCode}: ${v.message}`);
    }

    // Citações
    doc.addPage();
    doc.fontSize(16).text("4. Regras Aplicadas", { underline: true });
    doc.moveDown();
    for (const c of input.ruleCitations) {
      doc.fontSize(10).text(`${c.code} — ${c.title}`);
      doc.fontSize(9).fillColor("#666").text(c.source);
      doc.fillColor("#000").moveDown(0.3);
    }

    doc.end();
  });
}
