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

/**
 * Gera dossier PDF A4 com capa, memória descritiva, peças desenhadas
 * (placeholder textual do layout) e quadro de conformidade legal.
 */
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

    // Peças desenhadas (resumo textual)
    doc.addPage();
    doc.fontSize(16).text("2. Peças Desenhadas", { underline: true });
    doc.moveDown();
    doc.fontSize(11).text(
      `Bbox: ${input.layout.bbox.width} × ${input.layout.bbox.height} m | pé-direito ${input.layout.ceilingHeight} m`,
    );
    doc.moveDown();
    for (const r of input.layout.rooms) {
      doc.text(`• ${r.label} (${r.kind}) — ${r.areaM2.toFixed(2)} m²`);
    }

    // Conformidade legal
    doc.addPage();
    doc.fontSize(16).text("3. Quadro de Conformidade Legal", { underline: true });
    doc.moveDown();
    for (const v of input.validations) {
      const mark = v.passed ? "OK" : v.severity === "BLOCK" ? "BLOQUEIO" : "AVISO";
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
