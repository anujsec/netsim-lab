import { useState } from "react";
import { Zap } from "lucide-react";
import SimulatorLayout from "../components/SimulatorLayout";
import ModuleHeader from "../components/ModuleHeader";
import ScenarioTabs from "../components/ScenarioTabs";
import SidePanel from "../components/SidePanel";
import { L, mk, pkt } from "../utils/packets";
import { cn } from "../utils/cn";
import type { SimStep, TopoEdge, TopoNode } from "../types";

type Mode = "flood" | "cookies";
type Slot = "legit" | "spoof" | null;

const nodes: TopoNode[] = [
  { id: "client", label: "Legit user", sublabel: "198.51.100.7", x: 10, y: 78, icon: "laptop" },
  { id: "evil", label: "Attacker / botnet", sublabel: "sends spoofed SYNs", x: 10, y: 22, icon: "laptop" },
  { id: "server", label: "Web Server", sublabel: "backlog: 8 half-open slots", x: 62, y: 50, icon: "server" },
  { id: "ghost", label: "Spoofed IPs", sublabel: "nobody replies", x: 92, y: 50, icon: "cloud" },
];
const edges: TopoEdge[] = [
  { from: "client", to: "server" },
  { from: "evil", to: "server" },
  { from: "server", to: "ghost", dashed: true },
];

const E = (n: number): Slot[] => Array.from({ length: 8 }, (_, i) => (i < n ? "spoof" : null));
const spoofSyn = (ip: string) => [L.ip(ip, "203.0.113.10"), L.tcp("1025", "80", "SYN", [["Src IP", "spoofed!"]])];

function build(mode: Mode): { steps: SimStep[]; slots: Slot[][] } {
  const steps: SimStep[] = [];
  const slots: Slot[][] = [];
  const add = (s: SimStep, sl: Slot[]) => {
    steps.push(s);
    slots.push(sl);
  };
  const legitHalf: Slot[] = ["legit", null, null, null, null, null, null, null];
  const noSlots: Slot[] = Array(8).fill(null);

  add(
    mk({
      id: "syn",
      title: "Normal life: a legitimate user sends SYN",
      desc: "For each SYN the server allocates a slot in its backlog queue (a half-open connection, state SYN_RECEIVED) and replies with SYN-ACK.",
      from: "client",
      to: "server",
      badge: "SYN",
      packet: pkt("SYN", "#38bdf8", [L.ip("198.51.100.7", "203.0.113.10"), L.tcp("50412", "80", "SYN")]),
      log: "[User → Server] SYN. Backlog 1/8.",
    }),
    legitHalf
  );
  add(
    mk({
      id: "synack",
      title: "Server answers SYN-ACK and waits for the final ACK",
      desc: "The slot stays reserved while the server waits (typically ~60 s with retries).",
      from: "server",
      to: "client",
      badge: "SYN-ACK",
      packet: pkt("SYN-ACK", "#a78bfa", [L.ip("203.0.113.10", "198.51.100.7"), L.tcp("80", "50412", "SYN, ACK")]),
      log: "[Server → User] SYN-ACK. Waiting for ACK…",
    }),
    legitHalf
  );
  add(
    mk({
      id: "ack",
      title: "The user's ACK arrives — the slot is freed",
      desc: "The connection is ESTABLISHED and moves out of the backlog. In normal use half-open slots are freed within milliseconds.",
      from: "client",
      to: "server",
      badge: "ACK",
      packet: pkt("ACK", "#22c55e", [L.ip("198.51.100.7", "203.0.113.10"), L.tcp("50412", "80", "ACK")]),
      log: "[User → Server] ACK. Connection established. Backlog 0/8.",
    }),
    noSlots
  );
  add(
    mk({
      id: "spoof1",
      title: "Attack: a SYN with a FAKE source IP",
      desc: "The attacker never intends to finish the handshake, so he forges the source address.",
      from: "evil",
      to: "server",
      badge: "Spoofed SYN",
      packet: pkt("SYN (spoofed)", "#f43f5e", spoofSyn("192.0.2.123")),
      log: mode === "flood" ? "[Attacker → Server] SYN from 192.0.2.123 (fake). Backlog 1/8." : "[Attacker → Server] SYN from 192.0.2.123 (fake).",
    }),
    mode === "flood" ? E(1) : noSlots
  );
  add(
    mk({
      id: "synack-ghost",
      title: mode === "flood" ? "The SYN-ACK goes to a host that never asked" : "SYN cookies: the server answers WITHOUT storing anything",
      desc:
        mode === "flood"
          ? "The spoofed address won't reply with an ACK (it either doesn't exist or ignores the unexpected packet). The slot stays occupied until it times out."
          : "Instead of allocating a slot, the server encodes the connection details + a secret + timestamp into the Initial Sequence Number (the 'cookie') and forgets the SYN. No memory is used.",
      from: "server",
      to: "ghost",
      badge: mode === "flood" ? "SYN-ACK → void" : "SYN-ACK (cookie)",
      packet: pkt("SYN-ACK", mode === "flood" ? "#f97316" : "#22c55e", [L.ip("203.0.113.10", "192.0.2.123"), L.tcp("80", "1025", "SYN, ACK", mode === "cookies" ? [["ISN", "cookie = hash(IPs, ports, secret, time)"]] : [])]),
      log: mode === "flood" ? "[Server → 192.0.2.123] SYN-ACK… no ACK will ever come." : "[Server] Sent SYN-ACK with cookie. Backlog stays 0/8.",
    }),
    mode === "flood" ? E(1) : noSlots
  );
  add(
    {
      ...mk({
        id: "burst",
        title: "The attacker sends thousands of spoofed SYNs per second",
        desc:
          mode === "flood"
            ? "Each one claims a backlog slot. Within moments all 8 slots are held by dead half-open connections."
            : "Every spoofed SYN gets a cookie reply — but the server stores nothing, so the flood cannot fill any queue.",
        from: "evil",
        to: "server",
        badge: "Flood",
        packet: pkt("SYN ×1000", "#f43f5e", spoofSyn("random IPs")),
        log: mode === "flood" ? "[Attacker → Server] 1000 SYN/s from random IPs. Backlog 8/8 FULL." : "[Attacker → Server] 1000 SYN/s. Backlog 0/8 — no state kept.",
      }),
    },
    mode === "flood" ? E(8) : noSlots
  );
  if (mode === "flood") {
    add(
      mk({
        id: "legit-drop",
        title: "A real user tries to connect — the server can't accept it",
        desc: "The backlog is full, so the new SYN is dropped. The website seems 'down' even though the server's CPU and bandwidth are barely used. That's a denial of service.",
        from: "client",
        to: "server",
        badge: "Dropped",
        packet: pkt("SYN", "#f43f5e", [L.ip("198.51.100.7", "203.0.113.10"), L.tcp("50499", "80", "SYN")]),
        log: "[Server] Backlog full → SYN from 198.51.100.7 dropped.",
      }),
      E(8)
    );
    add(
      mk({
        id: "timeout",
        title: "The user's browser shows: 'connection timed out'",
        desc: "Mitigations: SYN cookies, a larger backlog, shorter SYN_RECEIVED timeouts, rate limiting and upstream DDoS scrubbing. Try the 'SYN cookies' tab to see the defence.",
        from: "client",
        badge: "Timeout",
        log: "[User] ERR_CONNECTION_TIMED_OUT",
      }),
      E(8)
    );
  } else {
    add(
      mk({
        id: "legit-syn",
        title: "A real user connects during the attack",
        desc: "The user's SYN is answered with a cookie SYN-ACK like any other.",
        from: "client",
        to: "server",
        badge: "SYN",
        packet: pkt("SYN", "#38bdf8", [L.ip("198.51.100.7", "203.0.113.10"), L.tcp("50499", "80", "SYN")]),
        log: "[User → Server] SYN. Server replies with cookie SYN-ACK.",
      }),
      noSlots
    );
    add(
      mk({
        id: "legit-ack",
        title: "The real user's ACK carries the cookie back",
        desc: "The server recomputes the hash from the ACK's addresses/ports + its secret. If it matches, the connection is genuine — only now is memory allocated. Spoofed senders never ACK, so they cost the server nothing.",
        from: "client",
        to: "server",
        badge: "ACK ✔ valid",
        packet: pkt("ACK", "#22c55e", [L.ip("198.51.100.7", "203.0.113.10"), L.tcp("50499", "80", "ACK", [["Ack number", "cookie + 1"]])]),
        log: "[Server] Cookie valid → connection established for the real user.",
      }),
      noSlots
    );
  }
  return { steps, slots };
}

export default function SynFlood() {
  const [mode, setMode] = useState<Mode>("flood");
  const { steps, slots } = build(mode);

  return (
    <div className="flex flex-col gap-4">
      <ModuleHeader
        icon={Zap}
        color="amber"
        title="SYN Flood & SYN Cookie Defence"
        subtitle="Watch the half-open connection queue fill up — and see how SYN cookies keep a server alive."
      />
      <SimulatorLayout
        nodes={nodes}
        edges={edges}
        steps={steps}
        resetKey={`syn-${mode}`}
        topologyHeight={320}
        topBar={
          <ScenarioTabs
            label="Server"
            value={mode}
            onChange={setMode}
            options={[
              { id: "flood", label: "No protection" },
              { id: "cookies", label: "With SYN cookies" },
            ]}
          />
        }
        sideExtra={({ index }) => {
          const sl = slots[index] ?? slots[slots.length - 1];
          const used = sl.filter(Boolean).length;
          return (
            <SidePanel title="Server SYN backlog queue (8 slots)">
              <div className="grid grid-cols-4 gap-1.5">
                {sl.map((x, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-md border text-[10px] font-bold",
                      x === "spoof" && "border-rose-500/60 bg-rose-500/30 text-rose-200",
                      x === "legit" && "border-emerald-500/60 bg-emerald-500/30 text-emerald-200",
                      x === null && "border-slate-800 bg-slate-950/60 text-slate-700"
                    )}
                  >
                    {x === "spoof" ? "fake" : x === "legit" ? "user" : "free"}
                  </div>
                ))}
              </div>
              <p className="mt-2">
                Used: <b className={used === 8 ? "text-rose-300" : "text-slate-200"}>{used}/8</b>
                {used === 8 && <span className="text-rose-300"> — FULL, new users rejected</span>}
              </p>
            </SidePanel>
          );
        }}
      />
    </div>
  );
}
