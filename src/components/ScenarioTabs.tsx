import { cn } from "../utils/cn";

export default function ScenarioTabs<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
      {label && (
        <span className="mr-1 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
      )}
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
            value === o.id
              ? "bg-cyan-500 text-slate-950"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
