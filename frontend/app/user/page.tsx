"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────

type Badge = { name: string; desc: string };
type RecentChat = { id: string; title: string; messageCount: number; lastActive: string };
type UserProfile = {
  user: {
    id: string;
    username: string;
    email: string;
    xp: number;
    level: number;
    trustLevel: string;
    created_at: string;
  };
  stats: {
    chatCount: number;
    totalMessages: number;
    overallBias: number;
    biasAlerts: number;
  };
  badges: Badge[];
  recentChats: RecentChat[];
};

// ── Badge icon mapping ───────────────────────────────────────────────────────

const badgeIcons: Record<string, string> = {
  Explorer: "🧭",
  "Bias Hunter": "🎯",
  "Trust Builder": "🛡️",
  "XP Rising": "⚡",
  "Power User": "🚀",
};

const badgeColors: Record<string, string> = {
  Explorer: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
  "Bias Hunter": "from-amber-500/20 to-amber-600/10 border-amber-500/30",
  "Trust Builder": "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
  "XP Rising": "from-violet-500/20 to-violet-600/10 border-violet-500/30",
  "Power User": "from-rose-500/20 to-rose-600/10 border-rose-500/30",
};

// ── Trust level styling ──────────────────────────────────────────────────────

const trustStyles: Record<string, { color: string; bg: string }> = {
  Beginner: { color: "text-slate-300", bg: "bg-slate-500/20 border-slate-500/30" },
  Intermediate: { color: "text-cyan-300", bg: "bg-cyan-500/20 border-cyan-500/30" },
  Advanced: { color: "text-amber-300", bg: "bg-amber-500/20 border-amber-500/30" },
  Expert: { color: "text-emerald-300", bg: "bg-emerald-500/20 border-emerald-500/30" },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function UserPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/user/profile?t=${Date.now()}`);
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        setProfile(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const trust = trustStyles[profile?.user.trustLevel || "Beginner"] || trustStyles.Beginner;

  // XP progress bar (next level at multiples of 100)
  const xp = profile?.user.xp || 0;
  const nextLevel = Math.ceil((xp + 1) / 100) * 100;
  const xpProgress = nextLevel > 0 ? (xp % 100) / 100 : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100">
      <div className="mx-auto grid max-w-[1480px] gap-8 px-5 py-8 lg:grid-cols-[280px_1fr] lg:px-10">
        <Sidebar />

        <main className="space-y-6">

          {/* ── Hero / Header ── */}
          <section className="rounded-3xl border border-white/10 bg-zinc-900/80 p-8 shadow-xl shadow-black/20 relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80 relative z-10">User Profile</p>
            <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl relative z-10">
              AURA User Page
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 relative z-10">
              Track your trust progress, earned badges, and recent AURA conversations. 
              Your journey towards understanding AI bias and explainability.
            </p>
          </section>

          {/* ── Loading / Error ── */}
          {loading && (
            <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-12 text-center">
              <div className="flex justify-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
              </div>
              <p className="text-sm text-slate-500">Loading your profile…</p>
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-sm text-rose-300">
              ⚠ {error}
            </div>
          )}

          {profile && (
            <>
              {/* ── User Card + Stats ── */}
              <section className="grid gap-6 lg:grid-cols-2">

                {/* Profile card */}
                <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
                  <div className="flex items-start gap-5">
                    {/* Avatar */}
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/30 to-violet-500/30 text-2xl font-bold text-cyan-300 border border-white/10">
                      {profile.user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Current user</p>
                      <h2 className="mt-1 text-2xl font-semibold text-white truncate">{profile.user.username}</h2>
                      <p className="mt-1 text-sm text-slate-400">{profile.user.email}</p>
                    </div>
                  </div>

                  {/* Stats cards */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className={`rounded-2xl border ${trust.bg} p-4`}>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">Trust Level</p>
                      <p className={`mt-1 text-lg font-semibold ${trust.color}`}>{profile.user.trustLevel}</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">Total XP</p>
                      <p className="mt-1 text-lg font-semibold text-white">{xp}</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">Messages</p>
                      <p className="mt-1 text-lg font-semibold text-white">{profile.stats.totalMessages}</p>
                    </div>
                    <div className={`rounded-2xl border p-4 ${
                      profile.stats.biasAlerts > 0 
                        ? "border-amber-500/30 bg-amber-500/10" 
                        : "border-white/5 bg-white/5"
                    }`}>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">Bias Alerts</p>
                      <p className={`mt-1 text-lg font-semibold ${
                        profile.stats.biasAlerts > 0 ? "text-amber-300" : "text-white"
                      }`}>{profile.stats.biasAlerts}</p>
                    </div>
                  </div>

                  {/* XP progress bar */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                      <span>XP progress to next milestone</span>
                      <span>{xp} / {nextLevel}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 transition-all duration-1000"
                        style={{ width: `${Math.round(xpProgress * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">Badges</p>
                  <div className="mt-5 space-y-3">
                    {profile.badges.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">No badges earned yet. Start chatting with AURA!</p>
                    ) : (
                      profile.badges.map((badge) => (
                        <div
                          key={badge.name}
                          className={`flex items-center gap-4 rounded-2xl border bg-gradient-to-r p-4 transition-all hover:scale-[1.02] ${
                            badgeColors[badge.name] || "from-white/5 to-white/[0.02] border-white/10"
                          }`}
                        >
                          <span className="text-2xl">{badgeIcons[badge.name] || "🏆"}</span>
                          <div>
                            <p className="text-sm font-semibold text-white">{badge.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{badge.desc}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-5 rounded-2xl bg-white/5 border border-white/5 p-4 text-xs leading-5 text-slate-500">
                    Badges show your progress in understanding AI bias, explainability, and responsible decision-making.
                  </div>
                </div>
              </section>

              {/* ── Recent Conversations ── */}
              <section className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-semibold text-white">Recent Conversations</h2>
                  <Link
                    href="/chat"
                    className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition uppercase tracking-wider"
                  >
                    View All →
                  </Link>
                </div>
                {profile.recentChats.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-500">No conversations yet.</p>
                    <Link
                      href="/chat"
                      className="mt-3 inline-block rounded-xl bg-cyan-500/20 border border-cyan-500/30 px-5 py-2.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/30 transition"
                    >
                      Start a Chat
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {profile.recentChats.map((chat) => (
                      <Link
                        key={chat.id}
                        href={`/chat?id=${chat.id}`}
                        className="group rounded-2xl border border-white/5 bg-white/5 p-4 transition hover:border-cyan-500/30 hover:bg-white/[0.08]"
                      >
                        <p className="text-sm font-medium text-white truncate group-hover:text-cyan-300 transition">
                          {chat.title}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                          <span>{chat.messageCount} messages</span>
                          <span>{new Date(chat.lastActive).toLocaleDateString()}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* ── Account Info ── */}
              <section className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80 mb-4">Account</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Member since</p>
                    <p className="mt-1 text-sm font-medium text-white">
                      {new Date(profile.user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Total chats</p>
                    <p className="mt-1 text-sm font-medium text-white">{profile.stats.chatCount}</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Level</p>
                    <p className="mt-1 text-sm font-medium text-white">Level {profile.user.level}</p>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
