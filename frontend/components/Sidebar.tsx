import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/chat", label: "Chat UI" },
  { href: "/user", label: "User Page" },
  { href: "/admin", label: "Admin Page" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-72 flex-col gap-4 rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-xl shadow-black/30 xl:flex">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">AURA Navigation</p>
        <h2 className="text-2xl font-semibold text-white">Project Pages</h2>
      </div>
      <nav className="grid gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-cyan-400/25 hover:bg-white/10"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto rounded-3xl bg-white/5 p-4 text-sm text-slate-400">
        Use the sidebar to explore the new pages for the hackathon demo.
      </div>
    </aside>
  );
}
