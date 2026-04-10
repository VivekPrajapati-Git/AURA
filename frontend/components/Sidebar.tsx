"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api-client";
import { DEFAULT_USER_ID } from "@/lib/constants";

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/chat", label: "Chat UI" },
  { href: "/user", label: "User Page" },
  { href: "/admin", label: "Admin Page" },
];

type ChatSummary = {
  id: string;
  title: string;
  created_at: string;
  message_count: number;
};

export function Sidebar({ open = true, onClose }: SidebarProps) {
  const [chatList, setChatList] = useState<ChatSummary[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const userId = DEFAULT_USER_ID;

  useEffect(() => {
    const loadChatList = async () => {
      try {
        const response = await fetch(apiUrl(`/chat/list/${userId}`));
        if (!response.ok) {
          setListError("Unable to load recent chats.");
          return;
        }
        const data = await response.json();
        setChatList(Array.isArray(data) ? data : []);
      } catch {
        setListError("Unable to load recent chats.");
      }
    };

    loadChatList();
  }, []);

  if (!open) return null;

  return (
    <aside className="relative flex w-full max-w-[320px] flex-col gap-6 rounded-3xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl xl:flex">
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-white/10 bg-zinc-950/80 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Hide sidebar"
        >
          ×
        </button>
      ) : null}

      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">AURA workspace</p>
        <h2 className="text-2xl font-semibold text-white">Navigation & insights</h2>
        <p className="text-sm leading-6 text-slate-400">
          Quickly jump between pages and keep the experience focused with a clean, reusable sidebar.
        </p>
      </div>

      <nav className="grid gap-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-cyan-400/25 hover:bg-white/10"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
        <p className="font-medium text-white">Recent chats</p>
        {listError ? (
          <p className="mt-3 text-sm text-rose-300">{listError}</p>
        ) : chatList.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Loading recent chats…</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {chatList.slice(0, 4).map((chat) => (
              <li key={chat.id} className="rounded-3xl bg-zinc-950/80 p-3">
                <p className="text-sm font-semibold text-white truncate">{chat.title || "Untitled chat"}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {chat.message_count} messages · {new Date(chat.created_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
        <p className="font-medium text-white">What you can do</p>
        <ul className="mt-4 space-y-3 text-slate-300">
          <li className="flex items-start gap-3">
            <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-cyan-400" />
            See bias and confidence in every response.
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-cyan-400" />
            Review explainability details for safer decisions.
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-cyan-400" />
            Explore trust metrics and user progress.
          </li>
        </ul>
      </div>

      <div className="rounded-3xl bg-cyan-500/10 p-5 text-sm text-slate-200">
        <p className="font-semibold text-cyan-200">Live demo tip</p>
        <p className="mt-2 text-slate-300">
          Hide the sidebar to focus on chat, or reopen it to navigate between dashboard, admin, and user pages.
        </p>
      </div>
    </aside>
  );
}
