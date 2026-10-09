import { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";

export default function EventLog({ log }: { log: string[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log]);

  return (
    <div className="flex h-48 flex-col rounded-2xl border border-slate-800 bg-slate-950/70">
      <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2">
        <Terminal className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Event Log
        </span>
      </div>
      <div ref={ref} className="flex-1 space-y-1 overflow-y-auto px-3 py-2 font-mono text-[11px]">
        {log.length === 0 && <div className="text-slate-600">Waiting for simulation to start…</div>}
        {log.map((l, i) => (
          <div key={i} className="flex gap-2 text-slate-400">
            <span className="text-emerald-500/70">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-slate-300">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
