"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}

export default function IsoChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: convo, isLoading, refetch } = trpc.isoConsultant.getConversation.useQuery({ id });
  const updateMutation = trpc.isoConsultant.updateConversation.useMutation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (convo) {
      setMessages(convo.messages as Message[]);
      setTitleInput(convo.title);
    }
  }, [convo]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const sendMessage = useCallback(async () => {
    const content = input.trim();
    if (!content || streaming) return;
    setInput("");
    setStreaming(true);
    setStreamingContent("");

    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch("/api/iso-consultant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id, content }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Erro ao contactar o servidor");
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = dec.decode(value);
        const lines = text.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6)) as { delta?: string; done?: boolean; error?: string };
            if (parsed.delta) {
              accumulated += parsed.delta;
              setStreamingContent(accumulated);
            } else if (parsed.done) {
              const assistantMsg: Message = {
                id: `tmp-assist-${Date.now()}`,
                role: "assistant",
                content: accumulated,
                createdAt: new Date(),
              };
              setMessages((prev) => [...prev, assistantMsg]);
              setStreamingContent("");
            } else if (parsed.error) {
              setMessages((prev) => [
                ...prev,
                { id: `err-${Date.now()}`, role: "assistant", content: `Erro: ${parsed.error}`, createdAt: new Date() },
              ]);
              setStreamingContent("");
            }
          } catch {
            // ignore parse errors for incomplete SSE chunks
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: "assistant", content: `Erro de comunicação: ${err instanceof Error ? err.message : "Desconhecido"}`, createdAt: new Date() },
      ]);
      setStreamingContent("");
    } finally {
      setStreaming(false);
    }
  }, [id, input, streaming]);

  async function saveTitle() {
    await updateMutation.mutateAsync({ id, title: titleInput });
    setEditingTitle(false);
    refetch();
  }

  if (isLoading) return <p>A carregar conversa…</p>;
  if (!convo) return <p>Conversa não encontrada.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn secondary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => router.push("/iso-consultant")}>
          ← Voltar
        </button>
        {editingTitle ? (
          <div style={{ display: "flex", gap: 8, flex: 1 }}>
            <input value={titleInput} onChange={(e) => setTitleInput(e.target.value)} style={{ flex: 1 }} onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); }} autoFocus />
            <button className="btn" style={{ fontSize: 12, padding: "4px 10px" }} onClick={saveTitle}>Guardar</button>
            <button className="btn secondary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => setEditingTitle(false)}>Cancelar</button>
          </div>
        ) : (
          <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setEditingTitle(true)}>
            <strong>{convo.title}</strong>
            {(convo.norm || convo.industry) && (
              <span style={{ fontSize: 12, color: "#666", marginLeft: 8 }}>
                {[convo.norm, convo.industry].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
        )}
        <div style={{ fontSize: 12, color: "#888" }}>
          Powered by Ollama / Groq (IA gratuita)
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          paddingBottom: 8,
        }}
      >
        {messages.length === 0 && !streaming && (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "#666" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🏭</div>
            <p style={{ margin: 0, fontWeight: 600 }}>Consultor ISO pronto a ajudar</p>
            <p style={{ margin: "8px 0 0", fontSize: 13 }}>
              Descreva a sua empresa, setor e objetivos. Por exemplo:<br />
              <em>«Somos uma empresa de produção alimentar com 50 trabalhadores e queremos certificar a ISO 22000 de raiz.»</em>
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble key={msg.id} role={msg.role} content={msg.content} />
        ))}

        {streamingContent && (
          <ChatBubble role="assistant" content={streamingContent} streaming />
        )}

        {streaming && !streamingContent && (
          <div className="card" style={{ alignSelf: "flex-start", padding: "10px 16px", background: "#f0f0f2" }}>
            <span style={{ color: "#666", fontSize: 13 }}>Consultor a processar…</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="card" style={{ marginTop: 8, padding: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Escreva a sua questão ISO… (Enter para enviar, Shift+Enter para nova linha)"
            rows={3}
            style={{ flex: 1, resize: "none", fontFamily: "inherit" }}
            disabled={streaming}
          />
          <button
            className="btn"
            onClick={sendMessage}
            disabled={streaming || !input.trim()}
            style={{ minWidth: 90, alignSelf: "stretch" }}
          >
            {streaming ? "…" : "Enviar"}
          </button>
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 11, color: "#aaa" }}>
          Este consultor virtual orienta e estrutura — não substitui o Responsável interno pela norma nem o Auditor Certificador.
        </p>
      </div>
    </div>
  );
}

function ChatBubble({ role, content, streaming }: { role: string; content: string; streaming?: boolean }) {
  const isUser = role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "80%",
          padding: "12px 16px",
          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          background: isUser ? "#111" : "#fff",
          color: isUser ? "#fff" : "#111",
          border: isUser ? "none" : "1px solid #e3e3e5",
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        <MarkdownContent content={content} />
        {streaming && <span style={{ opacity: 0.5 }}>▌</span>}
      </div>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  // Minimal markdown rendering: bold, code blocks, tables as plain text
  const lines = content.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith("### ")) return <h4 key={i} style={{ margin: "8px 0 4px" }}>{line.slice(4)}</h4>;
        if (line.startsWith("## ")) return <h3 key={i} style={{ margin: "8px 0 4px" }}>{line.slice(3)}</h3>;
        if (line.startsWith("# ")) return <h2 key={i} style={{ margin: "8px 0 4px" }}>{line.slice(2)}</h2>;
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return <div key={i} style={{ paddingLeft: 16 }}>• {renderInline(line.slice(2))}</div>;
        }
        if (/^\d+\. /.test(line)) {
          const match = line.match(/^(\d+)\. (.*)/);
          if (match) return <div key={i} style={{ paddingLeft: 16 }}>{match[1]}. {renderInline(match[2] ?? "")}</div>;
        }
        if (line.startsWith("|") && line.endsWith("|")) {
          return (
            <div key={i} style={{ fontFamily: "monospace", fontSize: 12, overflowX: "auto", padding: "1px 0" }}>
              {line}
            </div>
          );
        }
        if (line.trim() === "") return <br key={i} />;
        return <p key={i} style={{ margin: "2px 0" }}>{renderInline(line)}</p>;
      })}
    </>
  );
}

function renderInline(text: string): React.ReactNode {
  // **bold**
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} style={{ background: "#f0f0f2", padding: "1px 4px", borderRadius: 3 }}>{part.slice(1, -1)}</code>;
    return part;
  });
}
