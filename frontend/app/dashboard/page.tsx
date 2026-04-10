"use client";

import { useState } from "react";
import { Sidebar } from "../../components/Sidebar";

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100">
      <div className={`mx-auto grid max-w-[1480px] gap-8 px-5 py-8 lg:px-10 ${sidebarOpen ? "lg:grid-cols-[280px_1fr]" : "lg:grid-cols-1"}`}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="space-y-8">
          <section className="rounded-3xl border border-white/10 bg-zinc-900/80 p-8 shadow-xl shadow-black/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">Dashboard</p>
                <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">
                  AURA Project Dashboard
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
              This page gives judges a quick overview of your hackathon core metrics, including bias health, conversation volume, trust progress, and actionable user outcomes.
            </p>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
              <article className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
                <h2 className="text-xl font-semibold text-white">Bias health</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Track how often AURA returns low, medium, and high bias answers across user sessions.
                </p>
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Low bias</span>
                    <span className="text-emerald-400">68%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[68%] bg-emerald-400" />
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Medium bias</span>
                    <span className="text-amber-400">22%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[22%] bg-amber-400" />
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>High bias</span>
                    <span className="text-rose-400">10%</span>
                  </div>
                </div>
              </article>

              <article className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
                <h2 className="text-xl font-semibold text-white">Engagement</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  See how users interact with AURA, from questions asked to trust badges earned.
                </p>
                <div className="mt-6 grid gap-4">
                  <div className="rounded-3xl bg-white/5 p-4 text-sm text-slate-200">
                    Sessions: <strong className="text-white">128</strong>
                  </div>
                  <div className="rounded-3xl bg-white/5 p-4 text-sm text-slate-200">
                    Questions: <strong className="text-white">342</strong>
                  </div>
                  <div className="rounded-3xl bg-white/5 p-4 text-sm text-slate-200">
                    Badges earned: <strong className="text-white">84</strong>
                  </div>
                </div>
              </article>
            </div>

            <article className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">User actions</p>
              <h2 className="mt-4 text-2xl font-semibold text-white">What users can do</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Present judges with a roadmap of the experience, not just metrics.
              </p>
              <div className="mt-6 space-y-4 text-slate-300">
                {[
                  "Compare AI confidence with bias risk in every response.",
                  "Review explainability notes to understand why answers were chosen.",
                  "Save fairness recommendations and track trust progress.",
                  "Earn badges by choosing safer and more inclusive language.",
                ].map((item) => (
                  <div key={item} className="rounded-3xl bg-white/5 p-4">
                    <p className="text-sm leading-6">{item}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
