import { Sidebar } from "../../components/Sidebar";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100">
      <div className="mx-auto grid max-w-[1480px] gap-8 px-5 py-8 lg:grid-cols-[280px_1fr] lg:px-10">
        <Sidebar />

        <main className="space-y-8">
          <section className="rounded-3xl border border-white/10 bg-zinc-900/80 p-8 shadow-xl shadow-black/20">
            <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">Admin</p>
            <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">
              AURA Admin Console
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
              Monitor model bias, application usage, and user trust signals from the admin side of the hackathon demo.
            </p>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
              <h2 className="text-xl font-semibold text-white">Bias alerts</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">Number of times AURA flagged a medium or high bias response today.</p>
              <p className="mt-6 text-4xl font-semibold text-cyan-300">14</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
              <h2 className="text-xl font-semibold text-white">Active users</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">Users who interacted with AURA during the current demo session.</p>
              <p className="mt-6 text-4xl font-semibold text-cyan-300">27</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
              <h2 className="text-xl font-semibold text-white">Confidence average</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">Average confidence score across all AI responses today.</p>
              <p className="mt-6 text-4xl font-semibold text-cyan-300">78%</p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-zinc-900/80 p-8 shadow-lg shadow-black/20">
            <h2 className="text-2xl font-semibold text-white">Recent admin actions</h2>
            <div className="mt-5 space-y-4 text-sm text-slate-200">
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="font-medium text-white">Bias threshold updated</p>
                <p className="mt-1 text-slate-400">Admin lowered the high-bias alert threshold to 65% to catch more risky responses.</p>
              </div>
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="font-medium text-white">User report review</p>
                <p className="mt-1 text-slate-400">Reviewed one flagged item from the trust badge system and confirmed correct model behavior.</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
