import { anthropic, PRIMARY_MODEL, VISION_ANALYSIS_SYSTEM } from "@arquiteure/ai";

export interface VisionAnalysis {
  summary: string;
  detectedRooms: string[];
  openings: string[];
  estimatedDimensions: string[];
  risks: string[];
  hypotheses: string[];
}

/**
 * Analisa uma imagem (foto do espaço ou planta digitalizada) através do
 * Claude vision. `imageMediaType` deve ser um mime type suportado.
 */
export async function analyzeImage(
  imageBase64: string,
  imageMediaType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg",
): Promise<VisionAnalysis> {
  const res = await anthropic().messages.create({
    model: PRIMARY_MODEL,
    max_tokens: 2048,
    system: VISION_ANALYSIS_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: imageMediaType, data: imageBase64 },
          },
          {
            type: "text",
            text: 'Analisa esta imagem e devolve JSON: { summary, detectedRooms:[], openings:[], estimatedDimensions:[], risks:[], hypotheses:[] }. Marca estimativas como [HIPÓTESE].',
          },
        ],
      },
    ],
  });
  const text = res.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text)
    .join("\n");
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) {
    return {
      summary: text,
      detectedRooms: [],
      openings: [],
      estimatedDimensions: [],
      risks: [],
      hypotheses: [],
    };
  }
  return JSON.parse(m[0]) as VisionAnalysis;
}
