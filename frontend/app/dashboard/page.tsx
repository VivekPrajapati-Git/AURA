import { Sidebar } from "../../components/Sidebar";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100">
      <div className="mx-auto grid max-w-[1480px] gap-8 px-5 py-8 lg:grid-cols-[280px_1fr] lg:px-10">
        <Sidebar />
        <main className="space-y-8">
          <section className="rounded-3xl border border-white/10 bg-zinc-900/80 p-8 shadow-xl shadow-black/20">
            <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">Dashboard</p>
            <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">
              AURA Project Dashboard
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
              This page gives judges a quick overview of your hackathon core metrics, including bias health, conversation volume, and trust progress.
            </p>
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
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
                See how users interact with the AURA UI, from questions asked to trust badges earned.
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
            <article className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
              <h2 className="text-xl font-semibold text-white">Trust score</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                The trust score summarizes model confidence, bias, and explainability together.
              </p>
              <div className="mt-6 space-y-4">
                <div className="rounded-3xl bg-white/5 p-5">
                  <p className="text-5xl font-semibold text-white">89</p>
                  <p className="mt-2 text-sm text-slate-400">Overall trust index</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[89%] bg-cyan-400" />
                </div>
              </div>
            </article>
          </div>
        </main>
      </div>
    </div>
  );
}
