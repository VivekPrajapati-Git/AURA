"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "../../components/Sidebar";

type Influence = {
  term: string;
  impact: number;
};

type ChatItem = {
  id: string;
  role: "user" | "assistant";
  text: string;
  bias: number;
  confidence: number;
  influences: Influence[];
};

const initialChat: ChatItem[] = [
  {
    id: "welcome",
    role: "assistant",
    text: "Welcome to AURA. Ask a question and I’ll show you the response, confidence, bias score, and why I made that call.",
    bias: 0.12,
    confidence: 0.94,
    influences: [
      { term: "transparency", impact: 0.22 },
      { term: "accountability", impact: 0.18 },
      { term: "bias", impact: 0.12 },
      { term: "confidence", impact: 0.08 },
    ],
  },
];

const biasNotes = [
  "Low bias: AURA is confident and fair.",
  "Medium bias: Ask more carefully to avoid subtle stereotypes.",
  "High bias: The answer may reflect stereotypes or incomplete context.",
];

const generateResponse = (query: string): ChatItem => {
  const normalized = query.toLowerCase();
  const sensitiveTopics = ["job", "career", "salary", "hiring", "gender", "race", "college", "age", "interview"];
  const biasMultiplier = sensitiveTopics.reduce((score, term) => (normalized.includes(term) ? score + 0.16 : score), 0);
  const bias = Math.min(0.94, 0.1 + biasMultiplier + Math.random() * 0.18);
  const confidence = Math.max(0.62, 0.98 - bias + (Math.random() - 0.5) * 0.12);

  const responseText = normalized.includes("job") || normalized.includes("career")
    ? "AURA suggests focusing on your skills and not making assumptions based on identity. I also note that some questions can invite biased impressions."
    : normalized.includes("school") || normalized.includes("college")
    ? "I recommend reviewing both objective criteria and inclusive language when discussing education or admissions."
    : "This answer draws on the most relevant context, and I highlight areas where bias may appear so you can decide with confidence.";

  const influencePool = [
    { term: "language", impact: 0.18 },
    { term: "identity", impact: 0.15 },
    { term: "context", impact: 0.12 },
    { term: "assumption", impact: 0.1 },
    { term: "keywords", impact: 0.08 },
    { term: "tone", impact: 0.07 },
  ];

  const influences = influencePool
    .map((item, index) => ({
      term: item.term,
      impact: Math.max(0.05, item.impact - index * 0.02 + (Math.random() - 0.5) * 0.03),
    }))
    .slice(0, 4)
    .sort((a, b) => b.impact - a.impact);

  return {
    id: `${Date.now()}`,
    role: "assistant",
    text: responseText,
    bias,
    confidence,
    influences,
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatItem[]>(initialChat);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [xp, setXp] = useState(140);
  const [badges, setBadges] = useState<string[]>(["Explorer"]);
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
          body: JSON.stringify({ userId, title: "AURA Demo Chat" }),
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
      } catch (err) {
        setError("Unable to initialize chat. Please try again.");
      }
    };

    initializeChat();
  }, []);

  const latestAssistant = useMemo(
    () => messages.slice().reverse().find((item) => item.role === "assistant"),
    [messages]
  );

  const bias = latestAssistant?.bias ?? 0;
  const confidence = latestAssistant?.confidence ?? 0;
  const biasLevel = bias < 0.3 ? 0 : bias < 0.6 ? 1 : 2;
  const biasColor = biasLevel === 0 ? "bg-emerald-500" : biasLevel === 1 ? "bg-amber-400" : "bg-rose-500";
  const biasLabel = biasLevel === 0 ? "Low" : biasLevel === 1 ? "Medium" : "High";

  const handleSend = async () => {
    if (!draft.trim() || isSending) return;
    const userText = draft.trim();
    const userMessage: ChatItem = {
      id: `user-${Date.now()}`,
      role: "user",
      text: userText,
      bias: 0,
      confidence: 0,
      influences: [],
    };

    setError(null);
    setDraft("");
    setIsSending(true);
    setMessages((prev) => [...prev, userMessage]);

    if (!chatId) {
      setError("Chat session is not ready yet. Please wait a moment.");
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
      setXp((current) => clamp(current + 14 + Math.round((1 - payload.assistantMessage.bias) * 6), 0, 300));
      setBadges((current) => {
        const next = new Set(current);
        if (payload.assistantMessage.bias < 0.25) next.add("Bias Hunter");
        if (messages.length > 5) next.add("Trust Builder");
        return Array.from(next);
      });
    } catch (err) {
      setError("Network error while sending your message.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100">
      <div className={`mx-auto grid min-h-screen max-w-[1480px] gap-6 px-5 py-6 lg:px-10 ${sidebarOpen ? "xl:grid-cols-[320px_1.8fr]" : "xl:grid-cols-1"}`}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="space-y-6">
          <header className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6 shadow-xl shadow-black/20 backdrop-blur-lg">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">AURA</p>
                <h1 className="text-4xl font-semibold text-white sm:text-5xl">
                  Adaptive, Understandable, Responsible AI
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                  Demo UI for a chat assistant that explains its reasoning, shows bias in real time, and helps users learn when AI is uncertain.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen((open) => !open)}
                className="inline-flex items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/40 hover:bg-white/10"
              >
                {sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              </button>
            </div>
          </header>

          <main className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
            <section className="rounded-3xl border border-white/10 bg-zinc-900/80 p-5 shadow-lg shadow-black/20">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">Chat Demo</p>
                  <h2 className="text-2xl font-semibold text-white">Ask AURA anything</h2>
                </div>
                <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-300">
                  Try asking about hiring, college admissions, or workplace fairness.
                </div>
              </div>

              <div className="flex min-h-[520px] flex-col gap-4 overflow-hidden rounded-[2rem] border border-white/5 bg-black/30 p-4">
                <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-2 pb-2 scrollbar-thin scrollbar-thumb-cyan-500/60 scrollbar-track-white/5">
                  {messages.map((item) => (
                    <div
                      key={item.id}
                      className={`group rounded-3xl px-5 py-4 shadow-sm transition-all duration-200 ${
                        item.role === "assistant"
                          ? "bg-white/5 text-slate-100"
                          : "self-end bg-cyan-500/15 text-cyan-100"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.22em] text-slate-400">
                        <span>{item.role === "assistant" ? "AURA" : "You"}</span>
                        {item.role === "assistant" && (
                          <span className="text-[11px] text-slate-500">Bias {Math.round(item.bias * 100)}%</span>
                        )}
                      </div>
                      <p className="mt-3 leading-7 text-slate-100">{item.text}</p>
                      {item.role === "assistant" && item.influences.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.influences.slice(0, 2).map((influence) => (
                            <span
                              key={influence.term}
                              className="rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300"
                            >
                              {influence.term} +{Math.round(influence.impact * 100)}%
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <form
                  className="mt-4 flex flex-col gap-3 rounded-3xl bg-zinc-950/80 p-4 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleSend();
                  }}
                >
                  <label className="sr-only" htmlFor="prompt">
                    Ask AURA a question
                  </label>
                  <input
                    id="prompt"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Type a question about fairness, bias, or trust..."
                    className="flex-1 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center rounded-3xl bg-cyan-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!draft.trim() || isSending}
                  >
                    {isSending ? "Analyzing…" : "Send"}
                  </button>
                </form>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
                <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">Explainability Panel</p>
                <h3 className="mt-4 text-2xl font-semibold text-white">Why AURA answered this way</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  AURA uses an explanation layer to show which terms had the most influence on the current response.
                </p>
                <div className="mt-6 space-y-4">
                  {latestAssistant?.influences.map((influence) => (
                    <div key={influence.term}>
                      <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                        <span>{influence.term}</span>
                        <span>{Math.round(influence.impact * 100)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-cyan-400" style={{ width: `${Math.round(influence.impact * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">Bias insight</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">Current guidance</h3>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${biasColor} text-slate-950`}>
                    {biasLabel}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-400">{biasNotes[biasLevel]}</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
                <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">Badges</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {badges.map((badge) => (
                    <span key={badge} className="rounded-2xl bg-white/5 px-4 py-2 text-sm text-slate-200">
                      {badge}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-400">
                  Badges unlock as you interact with AURA and learn how bias and confidence affect responses.
                </p>
              </div>
            </aside>
          </main>
        </div>
      </div>
    </div>
  );
}
