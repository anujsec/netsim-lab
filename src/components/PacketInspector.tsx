import { Package } from "lucide-react";
import type { SimPacket } from "../types";

export default function PacketInspector({ packet }: { packet: SimPacket | null | undefined }) {
  if (!packet) {
    return (
      <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center text-sm text-slate-500">
        <Package className="mb-2 h-6 w-6 text-slate-600" />
        No packet in flight. Press play or step forward to inspect protocol headers.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Package className="h-4 w-4" style={{ color: packet.color }} />
        <h3 className="text-sm font-bold text-slate-200">{packet.label}</h3>
      </div>
      <div className="space-y-2">
        {packet.layers.map((layer) => (
          <div
            key={layer.key}
            className="overflow-hidden rounded-lg border"
            style={{ borderColor: `${layer.color}55` }}
          >
            <div
              className="flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
              style={{ backgroundColor: `${layer.color}22`, color: layer.color }}
            >
              <span>{layer.name}</span>
              <span className="opacity-70">{layer.short}</span>
            </div>
            {layer.fields.length > 0 && (
              <div className="divide-y divide-slate-800 bg-slate-950/60">
                {layer.fields.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 px-3 py-1 text-[11px]"
                  >
                    <span className="text-slate-500">{f.label}</span>
                    <span className="truncate font-mono text-slate-300">{f.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
