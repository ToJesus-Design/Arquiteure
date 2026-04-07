import { callStructured, INTENT_EXTRACTION_SYSTEM } from "@arquiteure/ai";
import { ProgramRequirementsSchema, type ProgramRequirements } from "@arquiteure/core";

export interface IntentInput {
  text?: string;
  transcript?: string;
  imageDescriptions?: string[];
}

/**
 * Extrai programa funcional a partir de texto, transcrição e descrições de imagens.
 * Devolve estrutura validada ou lança erro.
 */
export async function extractIntent(input: IntentInput): Promise<ProgramRequirements> {
  const parts: string[] = [];
  if (input.text) parts.push(`Texto do utilizador:\n${input.text}`);
  if (input.transcript) parts.push(`Transcrição áudio:\n${input.transcript}`);
  if (input.imageDescriptions?.length) {
    parts.push(`Descrições de imagens:\n- ${input.imageDescriptions.join("\n- ")}`);
  }
  const userContent =
    parts.join("\n\n") +
    '\n\nDevolve JSON ProgramRequirements: { rooms:[{kind,minAreaM2?,count?,notes?}], budgetEur?, constraints:[], goals:[], occupants?, accessibilityRequired? }';

  return callStructured(ProgramRequirementsSchema, {
    system: INTENT_EXTRACTION_SYSTEM,
    messages: [{ role: "user", content: userContent }],
    temperature: 0.1,
  });
}
