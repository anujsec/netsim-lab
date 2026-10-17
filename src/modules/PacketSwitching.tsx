import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import SimulatorLayout from "../components/SimulatorLayout";
import ModuleHeader from "../components/ModuleHeader";
import SidePanel from "../components/SidePanel";
import { L, mk, pkt } from "../utils/packets";
import type { SimStep, TopoEdge, TopoNode } from "../types";

const nodes: TopoNode[] = [
  { id: "a", label: "Sender", sublabel: "10.0.0.1", x: 8, y: 50, icon: "pc" },
  { id: "r1", label: "R1", x: 32, y: 20, icon: "router" },
  { id: "r2", label: "R2", x: 32, y: 80, icon: "router" },
  { id: "r3", label: "R3", x: 62, y: 20, icon: "router" },
  { id: "r4", label: "R4", x: 62, y: 80, icon: "router" },
  { id: "b", label: "Receiver", sublabel: "10.0.9.9", x: 92, y: 50, icon: "server" },
];
const edges: TopoEdge[] = [
  { from: "a", to: "r1" },
  { from: "a", to: "r2" },
  { from: "r1", to: "r3" },
  { from: "r2", to: "r4" },
  { from: "r3", to: "b" },
  { from: "r4", to: "b" },
  { from: "r1", to: "r2", dashed: true },
  { from: "r3", to: "r4", dashed: true },
];

const COLORS = ["#38bdf8", "#a78bfa", "#f59e0b", "#22c55e", "#f43f5e"];

function build(message: string): { steps: SimStep[]; chunks: string[]; arrived: number[][] } {
  const text = message.slice(0, 20) || "HELLO NETWORK";
  const size = 4;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  const total = chunks.length;
  // Even packets use the fast upper path, odd packets the slower lower path → they arrive out of order.
  const order = [...chunks.keys()].filter((i) => i % 2 === 0).concat([...chunks.keys()].filter((i) => i % 2 === 1));

  const steps: SimStep[] = [];
  const arrived: number[][] = [];
  const got: number[] = [];
  const push = (s: SimStep) => {
    steps.push(s);
    arrived.push([...got]);
  };

  push(
    mk({
      id: "split",
      title: `The message is split into ${total} packet${total > 1 ? "s" : ""}`,
      desc: `"${text}" is cut into pieces of ${size} characters. Each piece gets its own header with a sequence number, so the receiver can put them back in order.`,
      from: "a",
      nodes: ["a"],
      badge: "Packetize",
      log: `[Sender] Split "${text}" into ${total} packets (seq 1–${total}).`,
    })
  );

  order.forEach((idx) => {
    const upper = idx % 2 === 0;
    const r1 = upper ? "r1" : "r2";
    const r2 = upper ? "r3" : "r4";
    const color = COLORS[idx % COLORS.length];
    const seq = idx + 1;
    const layers = [
      L.ip("10.0.0.1", "10.0.9.9", [["Seq", `${seq}/${total}`]]),
      L.app("Payload", "DATA", [["Data", `"${chunks[idx]}"`]], color),
    ];
    const label = `PKT ${seq}`;
    const route = upper ? "upper path (R1 → R3)" : "lower path (R2 → R4) — longer, so it arrives later";
    push(
      mk({
        id: `p${seq}-1`,
        title: `Packet ${seq} leaves the sender via the ${upper ? "upper" : "lower"} route`,
        desc: `Every router picks the next hop independently. Packet ${seq} takes the ${route}.`,
        from: "a",
        to: r1,
        badge: label,
        packet: pkt(label, color, layers),
        log: `[Sender → ${r1.toUpperCase()}] Packet ${seq} ("${chunks[idx]}").`,
      })
    );
    push(
      mk({
        id: `p${seq}-2`,
        title: `Packet ${seq} hops ${r1.toUpperCase()} → ${r2.toUpperCase()}`,
        desc: "Store-and-forward: the router receives the whole packet, reads the destination IP, and forwards it to the next router.",
        from: r1,
        to: r2,
        badge: label,
        packet: pkt(label, color, layers),
        log: `[${r1.toUpperCase()} → ${r2.toUpperCase()}] Packet ${seq} forwarded.`,
      })
    );
    got.push(seq);
    push(
      mk({
        id: `p${seq}-3`,
        title: `Packet ${seq} arrives at the receiver`,
        desc: `Arrival order so far: ${got.join(", ")}. ${
          got.length > 1 && got[got.length - 1] < got[got.length - 2]
            ? "This packet arrived BEFORE an earlier-numbered one — out of order!"
            : "The receiver stores it in a buffer."
        }`,
        from: r2,
        to: "b",
        badge: label,
        packet: pkt(label, color, layers),
        log: `[Receiver] Packet ${seq} received. Arrival order: ${got.join(", ")}.`,
      })
    );
  });

  push(
    mk({
      id: "reassemble",
      title: "The receiver reassembles the message by sequence number",
      desc: `Packets arrived as ${got.join(", ")}, but the sequence numbers let the receiver sort them: "${text}". This is why packet switching shares links efficiently and survives broken paths.`,
      from: "b",
      nodes: ["b"],
      badge: "Reassemble",
      log: `[Receiver] Reordered by seq → "${text}" ✔`,
    })
  );
  return { steps, chunks, arrived };
}

export default function PacketSwitching() {
  const [input, setInput] = useState("HELLO NETWORK");
  const [msg, setMsg] = useState("HELLO NETWORK");
  const { steps, chunks, arrived } = useMemo(() => build(msg), [msg]);

  return (
    <div className="flex flex-col gap-4">
      <ModuleHeader
        icon={Shuffle}
        color="teal"
        title="Packet Switching"
        subtitle="Watch a message get chopped into packets, take different routes, arrive out of order, and be reassembled."
      />
      <SimulatorLayout
        nodes={nodes}
        edges={edges}
        steps={steps}
        resetKey={`switching-${msg}`}
        topologyHeight={300}
        topBar={
          <form
            className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              setMsg(input.trim() || "HELLO NETWORK");
            }}
          >
            <div className="min-w-[200px] flex-1">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                Message to send (max 20 characters)
              </label>
              <input
                value={input}
                maxLength={20}
                onChange={(e) => setInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-400"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400"
            >
              Send
            </button>
          </form>
        }
        sideExtra={({ index }) => {
          const got = arrived[index] ?? [];
          return (
            <SidePanel title="Receiver buffer">
              <p className="mb-1 text-slate-500">Arrival order</p>
              <div className="mb-3 flex min-h-[28px] flex-wrap gap-1.5">
                {got.length === 0 && <span className="text-slate-600">(nothing yet)</span>}
                {got.map((s) => (
                  <span
                    key={s}
                    className="rounded-md px-2 py-1 font-mono text-[11px] font-bold text-slate-950"
                    style={{ backgroundColor: COLORS[(s - 1) % COLORS.length] }}
                  >
                    {s}:{chunks[s - 1]}
                  </span>
                ))}
              </div>
              <p className="mb-1 text-slate-500">After reordering by sequence number</p>
              <p className="rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1.5 font-mono text-[11px] text-emerald-300">
                {[...got].sort((x, y) => x - y).map((s) => chunks[s - 1]).join("") || "—"}
              </p>
            </SidePanel>
          );
        }}
      />
    </div>
  );
}
