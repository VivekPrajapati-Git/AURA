import { Sidebar } from "../../components/Sidebar";

export default function UserPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100">
      <div className="mx-auto grid max-w-[1480px] gap-8 px-5 py-8 lg:grid-cols-[280px_1fr] lg:px-10">
        <Sidebar />

        <main className="space-y-8">
          <section className="rounded-3xl border border-white/10 bg-zinc-900/80 p-8 shadow-xl shadow-black/20">
            <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">User Profile</p>
            <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">
              AURA User Page
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
              This page demonstrates how a user can track their trust progress, earned badges, and recent AURA conversations.
            </p>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-500/15 text-cyan-300">
                  U
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Current user</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Aria Sharma</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">AI learner, hackathon participant, and AURA early tester.</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-3xl bg-white/5 p-4 text-sm text-slate-200">
                  Trust level: <strong className="text-white">Advanced</strong>
                </div>
                <div className="rounded-3xl bg-white/5 p-4 text-sm text-slate-200">
                  Total XP: <strong className="text-white">240</strong>
                </div>
                <div className="rounded-3xl bg-white/5 p-4 text-sm text-slate-200">
                  Recent bias alerts: <strong className="text-white">3</strong>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">Badges</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {['Explorer', 'Bias Hunter', 'Trust Builder'].map((badge) => (
                  <span key={badge} className="rounded-2xl bg-white/5 px-4 py-2 text-sm text-slate-200">
                    {badge}
                  </span>
                ))}
              </div>
              <div className="mt-6 rounded-3xl bg-white/5 p-4 text-sm leading-6 text-slate-400">
                Badges show the user’s progress in understanding AI bias, explainability, and responsible decision-making.
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
            <h2 className="text-2xl font-semibold text-white">Recent conversations</h2>
            <div className="mt-5 space-y-4">
              {[
                { question: "Is this job post inclusive?", result: "Reviewed with bias-aware wording." },
                { question: "How do I ask about salary fairly?", result: "Suggested neutral phrasing and context." },
              ].map((item) => (
                <div key={item.question} className="rounded-3xl bg-white/5 p-4 text-sm text-slate-200">
                  <p className="font-medium text-white">{item.question}</p>
                  <p className="mt-2 text-slate-400">{item.result}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
