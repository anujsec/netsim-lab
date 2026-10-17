import type { ReactNode } from "react";

export default function SidePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">{title}</h4>
      {children}
    </div>
  );
}
