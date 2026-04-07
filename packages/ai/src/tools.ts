import OpenAI from "openai";

let _openai: OpenAI | null = null;
function openai(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

/** Whisper STT — transcrição de ficheiros áudio. */
export async function transcribeAudio(fileBuffer: Buffer, filename: string): Promise<string> {
  const file = new File([fileBuffer], filename, { type: "audio/mpeg" });
  const res = await openai().audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "pt",
  });
  return res.text;
}
