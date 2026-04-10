import Link from "next/link";

type SectionCardProps = {
  title: string;
  description: string;
  href: string;
};

export function SectionCard({ title, description, href }: SectionCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-white/10 bg-zinc-900/80 p-6 transition hover:border-cyan-400/30 hover:bg-zinc-900"
    >
      <h3 className="text-xl font-semibold text-white transition group-hover:text-cyan-300">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
      <span className="mt-5 inline-flex text-xs uppercase tracking-[0.24em] text-cyan-300/80">
        Open page →
      </span>
    </Link>
  );
}
