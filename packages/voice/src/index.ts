import { transcribeAudio } from "@arquiteure/ai";

/**
 * Entrada de voz: recebe ficheiro áudio e devolve transcrição PT.
 * Wrapper para isolar o package consumidor do SDK concreto.
 */
export async function speechToText(buffer: Buffer, filename = "audio.mp3"): Promise<string> {
  return transcribeAudio(buffer, filename);
}
