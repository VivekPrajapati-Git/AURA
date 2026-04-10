import { SectionCard } from "../components/SectionCard";
import { Sidebar } from "../components/Sidebar";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100">
      <div className="mx-auto grid max-w-[1480px] gap-8 px-5 py-8 lg:grid-cols-[280px_1fr] lg:px-10">
        <Sidebar />

        <main className="space-y-8">
          <section className="rounded-3xl border border-white/10 bg-zinc-900/80 p-8 shadow-xl shadow-black/20">
            <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">AURA Hackathon</p>
            <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">
              Dashboard for Explainable AI Demo
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
              Explore the main pages for your hackathon demo: dashboard metrics, GPT-style chat, user profile, and admin overview.
              This structure makes the app easier to present and shows judges a clean project organization.
            </p>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <SectionCard
              title="Dashboard"
              description="View project health, bias score trends, and key hackathon metrics for AURA."
              href="/dashboard"
            />
            <SectionCard
              title="Chat UI"
              description="Open the GPT-style conversation interface with bias meter, confidence score, and explainability hints."
              href="/chat"
            />
            <SectionCard
              title="User Page"
              description="See the polished user profile page with trust progress and learning badges."
              href="/user"
            />
            <SectionCard
              title="Admin Page"
              description="Open the admin console for monitoring model bias, usage, and trust signals."
              href="/admin"
            />
          </section>
        </main>
      </div>
    </div>
  );
}
