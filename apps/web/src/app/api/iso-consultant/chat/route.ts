import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@arquiteure/db";
import { chatCompletionStream } from "@arquiteure/iso-consultant";
import type { ChatMessage, ConversationContext } from "@arquiteure/iso-consultant";

// Resolve userId from demo cookie (mirrors trpc-context.ts)
function getUserId(req: NextRequest): string | null {
  const cookie = req.cookies.get("arquiteure-demo")?.value;
  return cookie ?? null;
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json() as { conversationId: string; content: string };
  const { conversationId, content } = body;
  if (!conversationId || !content?.trim()) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const convo = await prisma.isoConversation.findFirst({
    where: { id: conversationId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!convo) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  // Persist user message
  await prisma.isoMessage.create({
    data: { conversationId: convo.id, role: "user", content },
  });

  const history: ChatMessage[] = convo.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  history.push({ role: "user", content });

  const context: ConversationContext = {
    norm: convo.norm ?? undefined,
    industry: convo.industry ?? undefined,
    companySize: (convo.companySize ?? undefined) as ConversationContext["companySize"],
    maturityLevel: (convo.maturityLevel ?? undefined) as ConversationContext["maturityLevel"],
  };

  let fullReply = "";

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        for await (const chunk of chatCompletionStream(history, context)) {
          if (chunk.type === "delta" && chunk.content) {
            fullReply += chunk.content;
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ delta: chunk.content })}\n\n`));
          } else if (chunk.type === "done") {
            // Persist assistant reply
            await prisma.isoMessage.create({
              data: { conversationId: convo.id, role: "assistant", content: fullReply },
            });
            await prisma.isoConversation.update({
              where: { id: convo.id },
              data: { updatedAt: new Date() },
            });
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          } else if (chunk.type === "error") {
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: chunk.error })}\n\n`));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
