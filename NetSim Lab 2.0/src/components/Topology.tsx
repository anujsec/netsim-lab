import {
  Cloud,
  Globe2,
  Laptop2,
  Monitor,
  Router as RouterIcon,
  Server,
  ShieldAlert,
  Smartphone,
  Wifi,
  Network,
} from "lucide-react";
import type { TopoEdge, TopoNode } from "../types";
import { cn } from "../utils/cn";

const ICONS: Record<TopoNode["icon"], React.ComponentType<{ className?: string }>> = {
  pc: Monitor,
  laptop: Laptop2,
  server: Server,
  router: RouterIcon,
  switch: Network,
  cloud: Cloud,
  dns: Globe2,
  firewall: ShieldAlert,
  phone: Smartphone,
  wifi: Wifi,
};

interface PacketVisual {
  fromId: string;
  toId: string;
  progress: number; // 0..1
  color: string;
  label: string;
}

interface TopologyProps {
  nodes: TopoNode[];
  edges: TopoEdge[];
  activeEdges?: Array<[string, string]>;
  activeNodes?: string[];
  packet?: PacketVisual | null;
  height?: number;
}

function findNode(nodes: TopoNode[], id: string) {
  return nodes.find((n) => n.id === id);
}

function isEdgeActive(active: Array<[string, string]> | undefined, a: string, b: string) {
  if (!active) return false;
  return active.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export default function Topology({
  nodes,
  edges,
  activeEdges,
  activeNodes,
  packet,
  height = 420,
}: TopologyProps) {
  const packetFrom = packet ? findNode(nodes, packet.fromId) : null;
  const packetTo = packet ? findNode(nodes, packet.toId) : null;
  const px =
    packetFrom && packetTo ? packetFrom.x + (packetTo.x - packetFrom.x) * packet!.progress : 0;
  const py =
    packetFrom && packetTo ? packetFrom.y + (packetTo.y - packetFrom.y) * packet!.progress : 0;

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-[radial-gradient(circle_at_20%_20%,#0f1a2e,transparent_60%),radial-gradient(circle_at_80%_80%,#0b1626,transparent_55%),#070c17]"
      style={{ height }}
    >
      {/* grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(56,189,248,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,189,248,0.07) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        {edges.map((e, i) => {
          const a = findNode(nodes, e.from);
          const b = findNode(nodes, e.to);
          if (!a || !b) return null;
          const active = isEdgeActive(activeEdges, e.from, e.to);
          return (
            <g key={i}>
              <line
                x1={`${a.x}%`}
                y1={`${a.y}%`}
                x2={`${b.x}%`}
                y2={`${b.y}%`}
                stroke={active ? "#38bdf8" : "#1e293b"}
                strokeWidth={active ? 2.5 : 1.5}
                strokeDasharray={e.dashed ? "5 5" : undefined}
                className={cn(active && "transition-all duration-300")}
              />
              {active && (
                <line
                  x1={`${a.x}%`}
                  y1={`${a.y}%`}
                  x2={`${b.x}%`}
                  y2={`${b.y}%`}
                  stroke="#38bdf8"
                  strokeWidth={5}
                  opacity={0.15}
                />
              )}
            </g>
          );
        })}
      </svg>

      {nodes.map((n) => {
        const Icon = ICONS[n.icon];
        const active = activeNodes?.includes(n.id);
        return (
          <div
            key={n.id}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          >
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-xl border bg-slate-900/90 shadow-lg transition-all duration-300",
                active
                  ? "scale-110 border-cyan-400 shadow-cyan-500/40 ring-4 ring-cyan-400/20"
                  : "border-slate-700"
              )}
            >
              <Icon className={cn("h-7 w-7", active ? "text-cyan-300" : "text-slate-400")} />
            </div>
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "whitespace-nowrap text-xs font-semibold",
                  active ? "text-cyan-300" : "text-slate-300"
                )}
              >
                {n.label}
              </span>
              {n.sublabel && (
                <span className="whitespace-nowrap text-[10px] text-slate-500">{n.sublabel}</span>
              )}
            </div>
          </div>
        );
      })}

      {packet && packetFrom && packetTo && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform"
          style={{ left: `${px}%`, top: `${py}%`, transitionDuration: "0ms" }}
        >
          <div
            className="flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide shadow-lg"
            style={{
              backgroundColor: `${packet.color}22`,
              borderColor: packet.color,
              color: packet.color,
              boxShadow: `0 0 16px ${packet.color}88`,
            }}
          >
            <span
              className="h-2 w-2 animate-pulse rounded-full"
              style={{ backgroundColor: packet.color }}
            />
            {packet.label}
          </div>
        </div>
      )}
    </div>
  );
}
