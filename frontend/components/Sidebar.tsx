"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
  refreshKey?: number; // increment to force a refetch
};

type ChatSummary = {
  id: string;
  title: string;
  lastMessage?: string;
  updatedAt: string;
  messageCount: number;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/chat",      label: "Chat UI"   },
  { href: "/user",      label: "Profile"   },
  { href: "/admin",     label: "Admin"     },
];

export function Sidebar({ open = true, onClose, refreshKey = 0 }: SidebarProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSummary[]>([]);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const searchParams  = useSearchParams();
  const activeChatId  = searchParams.get("id");

  // Re-fetch whenever activeChatId OR refreshKey changes
  useEffect(() => {
    let cancelled = false;
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/chat/list");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setSessions(data.chats || []);
        }
      } catch (err) {
        console.error("Failed to load chat sessions:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchSessions();
    return () => { cancelled = true; };
  }, [activeChatId, refreshKey]);

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (deleting) return;
    setDeleting(chatId);
    try {
      const res = await fetch(`/api/chat/${chatId}`, { method: "DELETE" });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== chatId));
        // If deleted chat was active, go back to blank chat
        if (activeChatId === chatId) router.push("/chat");
      }
    } finally {
      setDeleting(null);
    }
  };

  if (!open) return null;

  return (
    <aside className="relative flex w-full max-w-[300px] flex-col gap-5 rounded-3xl border border-white/10 bg-zinc-900/95 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl xl:flex h-fit">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-white/10 bg-zinc-950/80 p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Hide sidebar"
        >
          ✕
        </button>
      )}

      {/* Header + New Chat */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">AURA workspace</p>
        <h2 className="text-xl font-semibold text-white">Chat History</h2>
        <Link
          href="/chat"
          className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 px-4 py-2.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/30 transition"
        >
          <span className="text-base leading-none">＋</span> New Chat
        </Link>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[420px] pr-1 scrollbar-thin scrollbar-thumb-white/10">
        {loading ? (
          <p className="text-xs text-slate-500 px-2">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-slate-500 px-2">No past sessions. Start a new chat!</p>
        ) : (
          sessions.map((chat) => (
            <div key={chat.id} className="group relative">
              <Link
                href={`/chat?id=${chat.id}`}
                className={`block rounded-xl border px-4 py-3 text-sm transition pr-10 ${
                  activeChatId === chat.id
                    ? "border-cyan-500/50 bg-cyan-500/10 text-white"
                    : "border-white/5 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                <div className="font-medium truncate">{chat.title || "AURA Chat"}</div>
                <div className="mt-0.5 flex items-center justify-between text-xs text-slate-500">
                  <span>{chat.messageCount} msgs</span>
                  <span>{new Date(chat.updatedAt).toLocaleDateString()}</span>
                </div>
              </Link>

              {/* Delete button (hover-visible) */}
              <button
                onClick={(e) => handleDelete(e, chat.id)}
                disabled={deleting === chat.id}
                className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 text-xs transition hover:bg-rose-500/40 disabled:opacity-50"
                aria-label="Delete chat"
                title="Delete chat"
              >
                {deleting === chat.id ? "…" : "✕"}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Navigation */}
      <nav className="grid gap-1 border-t border-white/10 pt-4 mt-auto">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest px-2 mb-1">Navigation</p>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
