import { useMemo, useState } from "react";
import { Radar } from "lucide-react";
import SimulatorLayout from "../components/SimulatorLayout";
import type { PacketLayer, SimStep, TopoEdge, TopoNode } from "../types";
import { cn } from "../utils/cn";

const CHAIN = [
  { id: "client", label: "Your PC", sublabel: "192.168.1.10", icon: "pc" as const },
  { id: "r1", label: "Home Router", sublabel: "10.0.0.1", icon: "router" as const },
  { id: "r2", label: "ISP Router", sublabel: "203.0.113.1", icon: "router" as const },
  { id: "r3", label: "Backbone Router", sublabel: "198.51.100.1", icon: "router" as const },
  { id: "server", label: "Destination", sublabel: "93.184.216.34", icon: "server" as const },
];

const nodes: TopoNode[] = CHAIN.map((c, i) => ({
  id: c.id,
  label: c.label,
  sublabel: c.sublabel,
  icon: c.icon,
  x: 6 + i * (88 / (CHAIN.length - 1)),
  y: 50,
}));

const edges: TopoEdge[] = CHAIN.slice(0, -1).map((c, i) => ({ from: c.id, to: CHAIN[i + 1].id }));

function icmp(type: string, code: string, fields: { label: string; value: string }[], color: string): PacketLayer[] {
  return [
    {
      key: "icmp",
      name: "Network — ICMP",
      short: type,
      color,
      fields: [{ label: "Type", value: type }, { label: "Code", value: code }, ...fields],
    },
  ];
}

interface HopResult {
  hop: number;
  ip: string;
  label: string;
  rtt: string;
  status: "ok" | "timeout" | "final";
}

function buildTraceroute(target: string) {
  const steps: SimStep[] = [];
  const tableStates: HopResult[][] = [];
  const table: HopResult[] = [];
  const totalHops = CHAIN.length - 1; // r1,r2,r3,server

  for (let ttl = 1; ttl <= totalHops; ttl++) {
    for (let h = 1; h <= ttl; h++) {
      const fromNode = CHAIN[h - 1].id;
      const toNode = CHAIN[h].id;
      const remainingTtl = ttl - h;
      const reachedTarget = h === ttl;
      const isFinalDestination = reachedTarget && h === totalHops;

      steps.push({
        id: `probe-${ttl}-${h}`,
        title: `Probe TTL=${ttl} → forwarded to hop ${h}`,
        description: `The client sends a UDP/ICMP probe with TTL=${ttl}. Each router decrements TTL by 1. ${
          reachedTarget
            ? isFinalDestination
              ? "TTL survives exactly long enough to reach the final destination!"
              : "TTL just hit 0 here — this router must discard the packet."
            : `TTL is now ${remainingTtl}, still alive, so it keeps forwarding.`
        }`,
        from: fromNode,
        to: toNode,
        activeNodes: [fromNode, toNode],
        activeEdges: [[fromNode, toNode]],
        badge: `TTL=${ttl}`,
        packet: {
          label: `TTL=${remainingTtl}`,
          color: reachedTarget ? (isFinalDestination ? "#22c55e" : "#f97316") : "#38bdf8",
          layers: icmp("8", "0", [{ label: "TTL remaining", value: String(remainingTtl) }, { label: "Target", value: target }], "#38bdf8"),
        },
        log: `[Probe TTL=${ttl}] ${fromNode} → ${toNode}, TTL now ${remainingTtl}.`,
        duration: 650,
      });
      tableStates.push([...table]);
    }

    const landedNode = CHAIN[ttl];
    const rtt = (8 + ttl * 7 + Math.random() * 12).toFixed(1);

    if (ttl < totalHops) {
      steps.push({
        id: `expire-${ttl}`,
        title: `${landedNode.label} sends "Time Exceeded"`,
        description: `Since TTL reached 0 at ${landedNode.label} (${landedNode.sublabel}), it cannot forward the packet any further. Instead it replies to the client with an ICMP "Time Exceeded" message, revealing its own IP address — this is exactly how traceroute discovers each hop!`,
        from: landedNode.id,
        to: "client",
        activeNodes: [landedNode.id, "client"],
        activeEdges: [[landedNode.id, "client"]],
        badge: `Hop ${ttl} found`,
        packet: {
          label: "TIME EXCEEDED",
          color: "#f97316",
          layers: icmp("11", "0", [{ label: "From", value: landedNode.sublabel! }, { label: "RTT", value: `${rtt} ms` }], "#f97316"),
        },
        log: `[${landedNode.label}] ICMP Time Exceeded → revealed as hop ${ttl}: ${landedNode.sublabel} (${rtt} ms).`,
        duration: 900,
      });
      table.push({ hop: ttl, ip: landedNode.sublabel!, label: landedNode.label, rtt: `${rtt} ms`, status: "timeout" });
      tableStates.push([...table]);
    } else {
      steps.push({
        id: `reply-${ttl}`,
        title: `${landedNode.label} sends "Echo Reply"`,
        description: `The packet finally reached its destination with TTL still alive. The destination server responds with an ICMP Echo Reply — traceroute is complete!`,
        from: landedNode.id,
        to: "client",
        activeNodes: [landedNode.id, "client"],
        activeEdges: [[landedNode.id, "client"]],
        badge: "Destination reached",
        packet: {
          label: "ECHO REPLY",
          color: "#22c55e",
          layers: icmp("0", "0", [{ label: "From", value: landedNode.sublabel! }, { label: "RTT", value: `${rtt} ms` }], "#22c55e"),
        },
        log: `[${landedNode.label}] ICMP Echo Reply → final hop reached: ${landedNode.sublabel} (${rtt} ms).`,
        duration: 900,
      });
      table.push({ hop: ttl, ip: landedNode.sublabel!, label: landedNode.label, rtt: `${rtt} ms`, status: "final" });
      tableStates.push([...table]);
    }
  }

  return { steps, tableStates };
}

function buildPing(target: string) {
  const steps: SimStep[] = [];
  const rtts: number[] = [];
  for (let i = 1; i <= 4; i++) {
    const rtt = 12 + Math.random() * 40;
    rtts.push(rtt);
    steps.push({
      id: `req-${i}`,
      title: `Echo Request #${i} sent`,
      description: `Your PC sends an ICMP Echo Request (ping) packet to ${target}, asking it to simply respond so we can measure round-trip time.`,
      from: "client",
      to: "server",
      activeNodes: ["client", "server"],
      activeEdges: edges.map((e) => [e.from, e.to] as [string, string]),
      badge: `Ping ${i}/4`,
      packet: { label: "ECHO REQ", color: "#38bdf8", layers: icmp("8", "0", [{ label: "Seq", value: String(i) }, { label: "Target", value: target }], "#38bdf8") },
      log: `[Client → ${target}] ICMP Echo Request seq=${i}.`,
      duration: 1000,
    });
    steps.push({
      id: `rep-${i}`,
      title: `Echo Reply #${i} received`,
      description: `${target} responds immediately with an Echo Reply. The time between sending the request and receiving this reply is the Round-Trip Time (RTT).`,
      from: "server",
      to: "client",
      activeNodes: ["server", "client"],
      activeEdges: edges.map((e) => [e.from, e.to] as [string, string]),
      badge: `Reply ${i}/4`,
      packet: { label: `${rtt.toFixed(1)}ms`, color: "#22c55e", layers: icmp("0", "0", [{ label: "Seq", value: String(i) }, { label: "RTT", value: `${rtt.toFixed(1)} ms` }], "#22c55e") },
      log: `[${target} → Client] Reply seq=${i}, time=${rtt.toFixed(1)}ms.`,
      duration: 1000,
    });
  }
  steps.push({
    id: "summary",
    title: "Ping statistics",
    description: `4 packets sent, 4 received, 0% loss. min/avg/max = ${Math.min(...rtts).toFixed(1)}/${(rtts.reduce((a, b) => a + b, 0) / rtts.length).toFixed(1)}/${Math.max(...rtts).toFixed(1)} ms.`,
    from: "client",
    to: "client",
    activeNodes: ["client"],
    badge: "Summary",
    packet: null,
    log: `[Summary] 4 transmitted, 4 received, 0% packet loss.`,
    duration: 800,
  });
  return steps;
}

export default function PingTraceroute() {
  const [target, setTarget] = useState("93.184.216.34");
  const [committed, setCommitted] = useState("93.184.216.34");
  const [mode, setMode] = useState<"traceroute" | "ping">("traceroute");

  const trace = useMemo(() => buildTraceroute(committed), [committed]);
  const ping = useMemo(() => buildPing(committed), [committed]);
  const steps = mode === "traceroute" ? trace.steps : ping;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
          <Radar className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-100">Ping & Traceroute (TTL Explorer)</h2>
          <p className="text-sm text-slate-500">
            See exactly how TTL expiry reveals every router between you and a destination.
          </p>
        </div>
      </div>
      <SimulatorLayout
        nodes={nodes}
        edges={edges}
        steps={steps}
        resetKey={`${mode}-${committed}`}
        topologyHeight={320}
        topBar={
          <form
            className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              setCommitted(target.trim() || "93.184.216.34");
            }}
          >
            <div className="flex gap-1 rounded-lg bg-slate-950/80 p-1">
              {(["traceroute", "ping"] as const).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide",
                    mode === m ? "bg-orange-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                Target host / IP
              </label>
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-orange-400"
                placeholder="e.g. 93.184.216.34"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-orange-400"
            >
              {mode === "traceroute" ? "Trace" : "Ping"}
            </button>
          </form>
        }
        sideExtra={
          mode === "traceroute"
            ? ({ index }: { index: number }) => {
                const rows = trace.tableStates[Math.min(index, trace.tableStates.length - 1)] ?? [];
                return (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">
                      Traceroute results
                    </h4>
                    {rows.length === 0 ? (
                      <p className="text-xs text-slate-500">Hops will appear here as they're discovered…</p>
                    ) : (
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="pb-1 font-normal">#</th>
                            <th className="pb-1 font-normal">Router</th>
                            <th className="pb-1 font-normal">IP</th>
                            <th className="pb-1 font-normal">RTT</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono text-slate-300">
                          {rows.map((r) => (
                            <tr key={r.hop} className={r.status === "final" ? "text-emerald-400" : ""}>
                              <td className="py-0.5">{r.hop}</td>
                              <td className="py-0.5">{r.label}</td>
                              <td className="py-0.5">{r.ip}</td>
                              <td className="py-0.5">{r.rtt}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              }
            : undefined
        }
      />
    </div>
  );
}
