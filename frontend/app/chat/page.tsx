"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Sidebar } from "../../components/Sidebar";

type ChatItem = {
  id: string;
  role: "user" | "assistant";
  text: string;
  bias: number;
  confidence: number;
};

const initialMessages: ChatItem[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    text: "Welcome to the AURA chat demo. Ask a question and see the bias score, confidence, and explainability summary.",
    bias: 0.12,
    confidence: 0.94,
  },
];

const simulateResponse = (question: string): ChatItem => {
  const lowBias = ["hello", "what", "how", "help", "guide"];
  const biasFactor = lowBias.some((term) => question.toLowerCase().includes(term)) ? 0.18 : 0.42;
  const confidence = Math.max(0.62, 0.96 - biasFactor + Math.random() * 0.08);
  return {
    id: `assistant-${Date.now()}`,
    role: "assistant",
    text: `AURA suggests a careful response with context and fairness. Your question about “${question}” highlights the need for transparent reasoning.`,
    bias: biasFactor,
    confidence,
  };
};

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<ChatItem[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userId = "demo-user";

  useEffect(() => {
    const initializeChat = async () => {
      try {
        const storedId = window.localStorage.getItem("aura-chat-id");

        if (storedId) {
          const response = await fetch(`/api/chat/${storedId}`);
          if (response.ok) {
            setChatId(storedId);
            const data = await response.json();
            if (Array.isArray(data.chat?.messages) && data.chat.messages.length > 0) {
              setMessages((prev) => [...prev, ...data.chat.messages]);
            }
            return;
          }
        }

        const createResponse = await fetch("/api/chat/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, title: "AURA Chat" }),
        });

        if (!createResponse.ok) {
          throw new Error("Unable to create chat.");
        }

        const payload = await createResponse.json();
        const createdChatId = payload.chat?.id;
        if (typeof createdChatId === "string") {
          setChatId(createdChatId);
          window.localStorage.setItem("aura-chat-id", createdChatId);
        }
      } catch {
        setError("Unable to initialize the chat session.");
      }
    };

    initializeChat();
  }, []);

  const latest = useMemo(
    () => messages.slice().reverse().find((item) => item.role === "assistant"),
    [messages]
  );

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) return;
    const userText = draft.trim();
    const userMessage: ChatItem = {
      id: `user-${Date.now()}`,
      role: "user",
      text: userText,
      bias: 0,
      confidence: 0,
    };

    setError(null);
    setIsSending(true);
    setMessages((prev) => [...prev, userMessage]);
    setDraft("");

    if (!chatId) {
      setError("Chat is not ready yet. Please wait a moment.");
      setIsSending(false);
      return;
    }

    try {
      const response = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message: userText }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Unable to send message.");
        setIsSending(false);
        return;
      }

      setMessages((prev) => [...prev, payload.assistantMessage]);
    } catch {
      setError("Network error while sending your message.");
    } finally {
      setIsSending(false);
    }
  };

  const biasLevel = latest?.bias ?? 0;
  const biasColor = biasLevel < 0.3 ? "bg-emerald-500" : biasLevel < 0.6 ? "bg-amber-400" : "bg-rose-500";

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100">
      <div className={`mx-auto grid max-w-[1480px] gap-8 px-5 py-8 lg:px-10 ${sidebarOpen ? "lg:grid-cols-[280px_1fr]" : "lg:grid-cols-1"}`}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="space-y-8">
          <section className="rounded-3xl border border-white/10 bg-zinc-900/80 p-8 shadow-xl shadow-black/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">Chat UI</p>
                <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">
                  AURA GPT-style Chat
                </h1>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen((open) => !open)}
                className="inline-flex items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/40 hover:bg-white/10"
              >
                {sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              </button>
            </div>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
              A conversational interface with a live bias meter, confidence score, and simple explainability output. Use it to demo the UI quickly.
            </p>
          </section>

          <section className="grid gap-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">Live scores</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">Bias {Math.round((latest?.bias ?? 0) * 100)}%</h2>
                </div>
                <div className="rounded-3xl bg-white/5 px-4 py-3 text-sm text-slate-300">
                  Confidence {Math.round((latest?.confidence ?? 0) * 100)}%
                </div>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                <div className={`${biasColor} h-full`} style={{ width: `${Math.round((latest?.bias ?? 0) * 100)}%` }} />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/30 p-4 shadow-lg shadow-black/20">
              <div className="flex flex-col gap-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-3xl p-5 ${
                      message.role === "assistant" ? "bg-white/5 text-slate-100" : "self-end bg-cyan-500/15 text-cyan-100"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{message.role === "assistant" ? "AURA" : "You"}</p>
                    <p className="mt-3 leading-7">{message.text}</p>
                  </div>
                ))}
              </div>

              <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={handleSend}>
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Type your question here..."
                  className="flex-1 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                />
                <button
                  type="submit"
                  disabled={isSending || !draft.trim()}
                  className="inline-flex h-12 items-center justify-center rounded-3xl bg-cyan-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSending ? "Thinking…" : "Send"}
                </button>
              </form>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
