"use client";

import { useEffect, useRef, useMemo, useState, Suspense } from "react";
import { Sidebar } from "../../components/Sidebar";
import { useSearchParams, useRouter } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────

type Influence = { term: string; impact: number };

type ChatItem = {
  id: string;
  role: "user" | "assistant";
  text: string;
  bias: number;
  confidence: number;
  influences: Influence[];
  intent?: string;
  reasoning?: string;
  neutralizedResponse?: string | null;
  caveat?: string | null;
  reliabilityLabel?: string;
  factualGrounding?: number;
  contextContributions?: { label: string; score: number }[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const relLabel = (label?: string) => {
  if (label === "green")  return { color: "bg-emerald-500", text: "Reliable" };
  if (label === "amber")  return { color: "bg-amber-400",   text: "Uncertain" };
  if (label === "red")    return { color: "bg-rose-500",    text: "Risky" };
  return { color: "bg-slate-600", text: "—" };
};

const biasLabel = (b: number) =>
  b < 0.3 ? { color: "bg-emerald-500 text-slate-950", text: "Low" }
  : b < 0.6 ? { color: "bg-amber-400 text-slate-950", text: "Medium" }
  : { color: "bg-rose-500 text-white", text: "High" };

// ── Welcome message ───────────────────────────────────────────────────────────

const initialWelcome: ChatItem[] = [{
  id: "welcome",
  role: "assistant",
  text: "Welcome to AURA. Start typing to begin a new session. I display live bias scores, confidence, reliability, intent classification and explainability data for every response.",
  bias: 0,
  confidence: 1,
  influences: [],
  reliabilityLabel: "green",
}];

// ── Main UI ───────────────────────────────────────────────────────────────────

function ChatUI() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeChatId = searchParams.get("id");

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<ChatItem[]>(initialWelcome);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Load session when chatId changes
  useEffect(() => {
    const loadSession = async () => {
      if (!activeChatId) { setMessages(initialWelcome); return; }
      try {
        const res = await fetch(`/api/chat/${activeChatId}`);
        if (!res.ok) throw new Error("Chat not found");
        const { chat } = await res.json();
        setMessages(chat?.messages?.length > 0 ? chat.messages : []);
      } catch {
        setError("Unable to load chat history.");
      }
    };
    loadSession();
  }, [activeChatId]);

  // ── Latest assistant message (for the metrics panel) ─────────────────────
  const latestAI = useMemo(
    () => [...messages].reverse().find((m) => m.role === "assistant"),
    [messages]
  );

  const bLabel = biasLabel(latestAI?.bias ?? 0);
  const rel    = relLabel(latestAI?.reliabilityLabel);
  const conf   = latestAI?.confidence ?? 0;

  // ── Send / Stream ─────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!draft.trim() || isSending) return;
    const userText = draft.trim();
    setDraft("");
    setError(null);
    setIsSending(true);

    // Optimistically add user bubble
    const optimisticUser: ChatItem = {
      id: `opt-${Date.now()}`,
      role: "user",
      text: userText,
      bias: 0,
      confidence: 0,
      influences: [],
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setStreamingText(""); // signal that assistant bubble is being filled

    try {
      let targetChatId = activeChatId;

      // Create a new chat if none is active
      if (!targetChatId) {
        const createRes = await fetch("/api/chat/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: userText.substring(0, 40) }),
        });
        if (!createRes.ok) throw new Error("Failed to create chat");
        const { chat } = await createRes.json();
        targetChatId = chat.id;
        router.push(`/chat?id=${targetChatId}`);
      }

      // Open the SSE stream from the Next.js proxy route
      const streamUrl = `/api/chat/stream/${targetChatId}?message=${encodeURIComponent(userText)}`;
      const eventSource = new EventSource(streamUrl);
      let accumulated = "";

      eventSource.onmessage = (e) => {
        const raw = e.data as string;
        if (raw === "[DONE]") {
          eventSource.close();
          setStreamingText(null);
          setIsSending(false);
          setSidebarRefreshKey((k) => k + 1);
          return;
        }
        if (raw === "[ERROR]") {
          eventSource.close();
          setStreamingText(null);
          setError("AI engine returned an error. Please try again.");
          setIsSending(false);
          return;
        }

        try {
          const parsed = JSON.parse(raw);
          if (parsed.error) {
            eventSource.close();
            setStreamingText(null);
            setError(parsed.error);
            setIsSending(false);
            return;
          }

          if (parsed.chunk !== undefined) {
            accumulated += parsed.chunk;
            setStreamingText(accumulated);
          }

          // Final metadata frame from Node backend
          if (parsed.done && parsed.metrics) {
            const { metrics, messageId } = parsed;
            const finalItem: ChatItem = {
              id: "sys-" + (messageId || Date.now()),
              role: "assistant",
              text: accumulated,
              bias:       (metrics.biasScore      || 0) / 100,
              confidence: (metrics.confidence?.overall || 0) / 100,
              influences: [],
              intent:           metrics.intent           || "",
              reliabilityLabel: metrics.reliabilityLabel || "",
            };
            setMessages((prev) => [...prev, finalItem]);
            setStreamingText(null);
            eventSource.close();
            setIsSending(false);
            setSidebarRefreshKey((k) => k + 1);
          }
        } catch {
          // plain text chunk (shouldn't happen but guard anyway)
          accumulated += raw;
          setStreamingText(accumulated);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setStreamingText(null);
        setError("Connection to AI engine lost. Please retry.");
        setIsSending(false);
      };

    } catch (err: any) {
      setStreamingText(null);
      setError(err.message || "Network error.");
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100">
      <div className={`mx-auto grid min-h-screen max-w-[1480px] gap-6 px-5 py-6 lg:px-10 transition-all duration-300 ${sidebarOpen ? "xl:grid-cols-[300px_1fr]" : "xl:grid-cols-1"}`}>

        {/* Sidebar picks up refresh key to re-fetch chat list after new messages */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} refreshKey={sidebarRefreshKey} />

        <div className="space-y-6 min-w-0">

          {/* ── Header ── */}
          <header className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6 shadow-xl shadow-black/20 backdrop-blur-lg">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">AURA Chat</p>
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">Secure AI with Explainability</h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-400">
                  Real-time bias scoring, confidence tracking, intent classification and XAI explanations from the Python AI engine.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen((o) => !o)}
                className="shrink-0 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/40 hover:bg-white/10"
              >
                {sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              </button>
            </div>
          </header>

          {/* ── Error banner ── */}
          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-sm text-rose-300">
              <span className="text-rose-400">⚠</span>
              {error}
              <button onClick={() => setError(null)} className="ml-auto text-rose-500 hover:text-rose-300">✕</button>
            </div>
          )}

          {/* ── Main grid: chat + metrics ── */}
          <main className="grid gap-6 xl:grid-cols-[1fr_340px]">

            {/* ─── Chat window ── */}
            <section className="flex flex-col rounded-3xl border border-white/10 bg-zinc-900/80 shadow-lg shadow-black/20 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">Message View</p>
                  <h2 className="text-lg font-semibold text-white">Active Session</h2>
                </div>
                {activeChatId && (
                  <span className="text-xs text-slate-500 font-mono truncate max-w-[160px]">{activeChatId}</span>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 min-h-[480px] max-h-[580px] overflow-y-auto flex flex-col gap-3 p-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {messages.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl px-5 py-4 text-sm leading-7 transition-all ${
                      item.role === "assistant"
                        ? "bg-white/5 text-slate-100 self-start max-w-[88%]"
                        : "bg-cyan-500/15 text-cyan-100 self-end max-w-[80%]"
                    }`}
                  >
                    {/* Role + inline tags */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                        {item.role === "assistant" ? "AURA" : "You"}
                      </span>
                      {item.role === "assistant" && item.intent && (
                        <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-cyan-300">{item.intent.replace(/_/g, " ")}</span>
                      )}
                      {item.role === "assistant" && item.reliabilityLabel && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${relLabel(item.reliabilityLabel).color} text-slate-950`}>
                          {relLabel(item.reliabilityLabel).text}
                        </span>
                      )}
                      {item.role === "assistant" && typeof item.bias === "number" && item.bias > 0 && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${biasLabel(item.bias).color}`}>
                          Bias {Math.round(item.bias * 100)}%
                        </span>
                      )}
                    </div>

                    {/* Text */}
                    <p className="whitespace-pre-wrap">{item.text}</p>

                    {/* Neutralized response warning */}
                    {item.neutralizedResponse && (
                      <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
                        <span className="font-semibold uppercase tracking-wider">Bias-corrected version: </span>
                        {item.neutralizedResponse}
                      </div>
                    )}

                    {/* Caveat */}
                    {item.caveat && (
                      <p className="mt-2 text-[11px] text-slate-500 italic">{item.caveat}</p>
                    )}

                    {/* XAI token pills */}
                    {item.role === "assistant" && Array.isArray(item.influences) && item.influences.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.influences.slice(0, 5).map((inf) => (
                          <span
                            key={inf.term}
                            className="rounded-full bg-white/10 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-300"
                          >
                            {inf.term} +{Math.round(inf.impact * 100)}%
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Live streaming bubble */}
                {streamingText !== null && (
                  <div className="rounded-2xl bg-white/5 px-5 py-4 text-sm leading-7 text-slate-100 self-start max-w-[88%]">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 mb-2">AURA</p>
                    <p className="whitespace-pre-wrap">
                      {streamingText}
                      <span className="inline-block w-1.5 h-4 ml-0.5 bg-cyan-400 rounded-sm animate-pulse align-middle" />
                    </p>
                  </div>
                )}

                {/* Thinking indicator */}
                {isSending && streamingText === "" && (
                  <div className="self-start rounded-2xl px-5 py-4 bg-white/5 text-slate-400 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
                    </span>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input area */}
              <form
                className="flex gap-3 rounded-b-3xl border-t border-white/5 bg-zinc-950/80 p-4"
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              >
                <label className="sr-only" htmlFor="prompt">Ask AURA a question</label>
                <textarea
                  id="prompt"
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                  className="flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 scrollbar-thin"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || isSending}
                  className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500 px-6 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSending ? "…" : "Send"}
                </button>
              </form>
            </section>

            {/* ─── Metrics Aside ── */}
            <aside className="space-y-5">

              {/* Reliability + Bias + Confidence */}
              <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20 space-y-5">
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">Live Metrics</p>

                {/* Reliability */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Reliability</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${rel.color} text-slate-950`}>
                    {rel.text}
                  </span>
                </div>

                {/* Bias */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">Bias score</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${bLabel.color}`}>
                      {bLabel.text} · {Math.round((latestAI?.bias ?? 0) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.round((latestAI?.bias ?? 0) * 100)}%`,
                        background: (latestAI?.bias ?? 0) < 0.3 ? "#10b981" : (latestAI?.bias ?? 0) < 0.6 ? "#fbbf24" : "#f43f5e",
                      }}
                    />
                  </div>
                </div>

                {/* Confidence */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">Confidence</span>
                    <span className="text-sm font-semibold text-white">{Math.round(conf * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-cyan-400 transition-all duration-700" style={{ width: `${Math.round(conf * 100)}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {conf >= 0.75 ? "High confidence — AURA is certain."
                      : conf >= 0.4 ? "Moderate — verify key claims."
                      : "Low — treat with caution."}
                  </p>
                </div>

                {/* Factual grounding */}
                {latestAI?.factualGrounding !== undefined && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Factual grounding</span>
                      <span className="text-sm font-semibold text-white">{Math.round((latestAI.factualGrounding) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-violet-400 transition-all duration-700" style={{ width: `${Math.round((latestAI.factualGrounding) * 100)}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Intent */}
              {latestAI?.intent && (
                <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80 mb-3">Detected Intent</p>
                  <span className="inline-block rounded-xl bg-cyan-500/15 border border-cyan-500/30 px-4 py-2 text-sm font-semibold text-cyan-300">
                    {latestAI.intent.replace(/_/g, " ")}
                  </span>
                </div>
              )}

              {/* Explainability — XAI tokens */}
              {Array.isArray(latestAI?.influences) && latestAI.influences.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80 mb-1">Explainability</p>
                  <h3 className="text-lg font-semibold text-white mb-4">Token Influence</h3>
                  <div className="space-y-3">
                    {latestAI.influences.slice(0, 6).map((inf) => (
                      <div key={inf.term}>
                        <div className="flex items-center justify-between text-sm text-slate-300 mb-1">
                          <span>{inf.term}</span>
                          <span className="text-slate-400">{Math.round(inf.impact * 100)}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-cyan-400 transition-all duration-500" style={{ width: `${Math.min(Math.round(inf.impact * 100), 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Context contributions */}
              {Array.isArray(latestAI?.contextContributions) && latestAI.contextContributions.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80 mb-1">Context Used</p>
                  <h3 className="text-lg font-semibold text-white mb-4">What influenced AURA</h3>
                  <div className="space-y-3">
                    {latestAI.contextContributions.map((c) => (
                      <div key={c.label}>
                        <div className="flex items-center justify-between text-sm text-slate-300 mb-1">
                          <span>{c.label}</span>
                          <span className="text-slate-400">{Math.round(c.score * 100)}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-violet-400 transition-all duration-500" style={{ width: `${Math.round(c.score * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reasoning */}
              {latestAI?.reasoning && (
                <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80 mb-2">AI Reasoning</p>
                  <p className="text-sm leading-6 text-slate-400 italic">{latestAI.reasoning}</p>
                </div>
              )}

            </aside>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="bg-zinc-950 min-h-screen grid items-center text-center text-white">Loading workspace…</div>}>
      <ChatUI />
    </Suspense>
  );
}
