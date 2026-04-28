export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ConversationContext {
  norm?: string;
  industry?: string;
  companySize?: "micro" | "pequena" | "media" | "grande";
  maturityLevel?: "inicial" | "parcial" | "avancado";
}

export interface StreamChunk {
  type: "delta" | "done" | "error";
  content?: string;
  error?: string;
}
