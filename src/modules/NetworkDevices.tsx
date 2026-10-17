import { useState, type ReactNode } from "react";
import { Router as RouterIcon } from "lucide-react";
import SimulatorLayout from "../components/SimulatorLayout";
import ModuleHeader from "../components/ModuleHeader";
import ScenarioTabs from "../components/ScenarioTabs";
import SidePanel from "../components/SidePanel";
import { cn } from "../utils/cn";
import { L, mk, pkt } from "../utils/packets";
import type { SimStep, TopoEdge, TopoNode } from "../types";

type ScId = "switch" | "router" | "firewall";

interface Scenario {
  nodes: TopoNode[];
  edges: TopoEdge[];
  steps: SimStep[];
  side: (i: number) => ReactNode;
}

const MAC_A = "AA:AA:AA:AA:AA:01";
const MAC_B = "BB:BB:BB:BB:BB:02";
const MAC_C = "CC:CC:CC:CC:CC:03";

/* ---------------- Switch ---------------- */
const switchTables: Array<Array<[string, string]>> = [
  [],
  [[MAC_A, "Port 1"]],
  [[MAC_A, "Port 1"]],
  [[MAC_A, "Port 1"], [MAC_C, "Port 3"]],
  [[MAC_A, "Port 1"], [MAC_C, "Port 3"]],
  [[MAC_A, "Port 1"], [MAC_C, "Port 3"]],
  [[MAC_A, "Port 1"], [MAC_C, "Port 3"]],
];

const switchScenario: Scenario = {
  nodes: [
    { id: "a", label: "PC-A", sublabel: MAC_A, x: 14, y: 22, icon: "pc" },
    { id: "b", label: "PC-B", sublabel: MAC_B, x: 14, y: 78, icon: "pc" },
    { id: "sw", label: "Switch (Layer 2)", sublabel: "learns MAC → port", x: 50, y: 50, icon: "switch" },
    { id: "c", label: "PC-C", sublabel: MAC_C, x: 86, y: 50, icon: "pc" },
  ],
  edges: [
    { from: "a", to: "sw", label: "Port 1" },
    { from: "b", to: "sw", label: "Port 2" },
    { from: "c", to: "sw", label: "Port 3" },
  ],
  steps: [
    mk({
      id: "empty",
      title: "A switch starts with an empty MAC address table",
      desc: "A switch forwards frames using MAC addresses (Layer 2). When it boots, its MAC table is empty — it doesn't know which device sits behind which port yet.",
      from: "sw",
      nodes: ["sw"],
      badge: "Start",
      log: "[Switch] MAC table is empty.",
    }),
    mk({
      id: "a-sends",
      title: "PC-A sends a frame to PC-C",
      desc: "The frame arrives on Port 1. The switch reads the SOURCE MAC and learns: 'AA:…:01 lives on Port 1'.",
      from: "a",
      to: "sw",
      badge: "Learn",
      packet: pkt("FRAME A→C", "#f59e0b", [L.eth(MAC_A, MAC_C)]),
      log: "[Switch] Learned AA:AA:AA:AA:AA:01 → Port 1.",
    }),
    {
      ...mk({
        id: "flood",
        title: "Unknown destination → the switch FLOODS the frame",
        desc: "The switch has no entry for CC:…:03, so it copies the frame out of every port except the one it arrived on. PC-B receives it but ignores it (not its MAC).",
        from: "sw",
        to: "c",
        badge: "Flood",
        packet: pkt("FRAME (flooded)", "#f97316", [L.eth(MAC_A, MAC_C)]),
        log: "[Switch] Dst MAC unknown → flooding to Port 2 and Port 3. PC-B drops it.",
      }),
      activeNodes: ["sw", "b", "c"],
      activeEdges: [["sw", "b"], ["sw", "c"]],
    },
    mk({
      id: "c-replies",
      title: "PC-C replies — the switch learns its port",
      desc: "The reply arrives on Port 3. The switch records: 'CC:…:03 lives on Port 3'.",
      from: "c",
      to: "sw",
      badge: "Learn",
      packet: pkt("FRAME C→A", "#f59e0b", [L.eth(MAC_C, MAC_A)]),
      log: "[Switch] Learned CC:CC:CC:CC:CC:03 → Port 3.",
    }),
    mk({
      id: "unicast-back",
      title: "Reply is forwarded ONLY to PC-A",
      desc: "PC-A's MAC is already in the table, so the switch sends the frame out of Port 1 only. PC-B sees nothing.",
      from: "sw",
      to: "a",
      badge: "Unicast",
      packet: pkt("FRAME C→A", "#22c55e", [L.eth(MAC_C, MAC_A)]),
      log: "[Switch] Dst MAC known → forwarded to Port 1 only.",
    }),
    mk({
      id: "a-again",
      title: "Next frame A → C",
      desc: "Both MACs are known now, so the switch makes a precise forwarding decision.",
      from: "a",
      to: "sw",
      packet: pkt("FRAME A→C", "#f59e0b", [L.eth(MAC_A, MAC_C)]),
      log: "[Switch] Lookup: CC:…:03 → Port 3.",
    }),
    mk({
      id: "precise",
      title: "Switch forwards only to PC-C — no flooding",
      desc: "This is why switches are efficient: after learning, each frame goes only where it needs to go. A hub would have flooded every frame to every port.",
      from: "sw",
      to: "c",
      badge: "Unicast",
      packet: pkt("FRAME A→C", "#22c55e", [L.eth(MAC_A, MAC_C)]),
      log: "[Switch] Forwarded out of Port 3 only.",
    }),
  ],
  side: (i) => (
    <SidePanel title="Switch MAC address table">
      {switchTables[i].length === 0 ? (
        <p className="text-slate-600">(empty)</p>
      ) : (
        <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 font-mono text-[11px]">
          {switchTables[i].map(([mac, port]) => (
            <div key={mac} className="flex justify-between px-2 py-1">
              <span className="text-amber-300">{mac}</span>
              <span className="text-slate-300">{port}</span>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-slate-500">Switch = Layer 2, decides by MAC address.</p>
    </SidePanel>
  ),
};

/* ---------------- Router ---------------- */
const routes: Array<[string, string, string]> = [
  ["192.168.1.0/24", "eth0", "directly connected"],
  ["10.0.0.0/24", "eth1", "directly connected"],
  ["0.0.0.0/0", "eth2", "default → ISP"],
];
const ROUTER_MAC0 = "00:1A:2B:3C:4D:00";
const ROUTER_MAC1 = "00:1A:2B:3C:4D:01";
const PC_MAC = "AA:AA:AA:AA:AA:01";
const SRV_MAC = "DD:DD:DD:DD:DD:05";

const routerScenario: Scenario = {
  nodes: [
    { id: "pc", label: "PC", sublabel: "192.168.1.10/24", x: 12, y: 50, icon: "pc" },
    { id: "r", label: "Router (Layer 3)", sublabel: "192.168.1.1 | 10.0.0.1", x: 50, y: 50, icon: "router" },
    { id: "srv", label: "Server", sublabel: "10.0.0.5/24", x: 88, y: 50, icon: "server" },
  ],
  edges: [
    { from: "pc", to: "r", label: "192.168.1.0/24" },
    { from: "r", to: "srv", label: "10.0.0.0/24" },
  ],
  steps: [
    mk({
      id: "decide",
      title: "PC decides: is the destination on my own network?",
      desc: "10.0.0.5 is not inside 192.168.1.0/24, so the PC cannot deliver it directly. It sends the packet to its default gateway (the router) instead.",
      from: "pc",
      badge: "Local or remote?",
      log: "[PC] 10.0.0.5 is outside 192.168.1.0/24 → use default gateway 192.168.1.1.",
    }),
    mk({
      id: "to-router",
      title: "PC → Router: frame addressed to the router's MAC",
      desc: "Note the mix: the destination IP is the final server, but the destination MAC is the router's interface (found via ARP).",
      from: "pc",
      to: "r",
      badge: "Hop 1",
      packet: pkt("PACKET", "#38bdf8", [
        L.eth(PC_MAC, ROUTER_MAC0),
        L.ip("192.168.1.10", "10.0.0.5", [["TTL", "64"]]),
      ]),
      log: "[PC → Router] dst IP 10.0.0.5, dst MAC = router eth0.",
    }),
    mk({
      id: "lookup",
      title: "Router strips the Layer 2 header and checks its routing table",
      desc: "The router looks at the destination IP only. The longest matching prefix is 10.0.0.0/24 → interface eth1. It decrements the TTL and builds a NEW frame.",
      from: "r",
      badge: "Route lookup",
      log: "[Router] Match 10.0.0.0/24 → eth1. TTL 64 → 63.",
    }),
    mk({
      id: "to-server",
      title: "Router → Server: new frame, same IP packet",
      desc: "MAC addresses change at every hop, but source and destination IP stay the same end to end. Only the TTL changed.",
      from: "r",
      to: "srv",
      badge: "Hop 2",
      packet: pkt("PACKET", "#38bdf8", [
        L.eth(ROUTER_MAC1, SRV_MAC),
        L.ip("192.168.1.10", "10.0.0.5", [["TTL", "63"]]),
      ]),
      log: "[Router → Server] New L2 header, IP header unchanged except TTL=63.",
    }),
    mk({
      id: "reply",
      title: "Server replies — the same process in reverse",
      desc: "The server sees the PC is on another network, so it sends the reply to its own gateway (the router).",
      from: "srv",
      to: "r",
      packet: pkt("REPLY", "#22c55e", [
        L.eth(SRV_MAC, ROUTER_MAC1),
        L.ip("10.0.0.5", "192.168.1.10", [["TTL", "64"]]),
      ]),
      log: "[Server → Router] Reply to 192.168.1.10 via gateway 10.0.0.1.",
    }),
    mk({
      id: "reply-back",
      title: "Router forwards the reply to the PC",
      desc: "A router connects different networks and decides by IP address. A switch connects devices inside one network and decides by MAC.",
      from: "r",
      to: "pc",
      packet: pkt("REPLY", "#22c55e", [
        L.eth(ROUTER_MAC0, PC_MAC),
        L.ip("10.0.0.5", "192.168.1.10", [["TTL", "63"]]),
      ]),
      log: "[Router → PC] Delivered. Router = Layer 3, decides by IP.",
    }),
  ],
  side: (i) => (
    <SidePanel title="Router routing table">
      <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 font-mono text-[11px]">
        {routes.map((r, idx) => (
          <div
            key={r[0]}
            className={cn(
              "grid grid-cols-[1fr_auto] gap-2 px-2 py-1",
              (i === 2 || i === 3) && idx === 1 && "bg-cyan-500/15 text-cyan-300"
            )}
          >
            <span>
              {r[0]} <span className="text-slate-600">({r[2]})</span>
            </span>
            <span>{r[1]}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-slate-500">The most specific (longest prefix) match wins.</p>
    </SidePanel>
  ),
};

/* ---------------- Firewall ---------------- */
const rules: Array<[string, string]> = [
  ["ALLOW", "TCP any → 203.0.113.10 : 443"],
  ["ALLOW", "Established / related replies"],
  ["DENY", "TCP any → any : 23 (Telnet)"],
  ["DENY", "Everything else (default deny)"],
];
const ruleHit = [-1, 0, 0, 1, 3, 2, -1];

const firewallScenario: Scenario = {
  nodes: [
    { id: "user", label: "Visitor", sublabel: "198.51.100.7", x: 12, y: 25, icon: "laptop" },
    { id: "bad", label: "Attacker", sublabel: "192.0.2.66", x: 12, y: 78, icon: "laptop" },
    { id: "fw", label: "Firewall", sublabel: "rule-based filter", x: 50, y: 50, icon: "firewall" },
    { id: "web", label: "Web Server", sublabel: "203.0.113.10", x: 88, y: 50, icon: "server" },
  ],
  edges: [
    { from: "user", to: "fw" },
    { from: "bad", to: "fw" },
    { from: "fw", to: "web" },
  ],
  steps: [
    mk({
      id: "rules",
      title: "The firewall holds an ordered rule list",
      desc: "A firewall inspects each packet's addresses and ports and compares them top-to-bottom against its rules. The first match wins.",
      from: "fw",
      badge: "Start",
      log: "[Firewall] 4 rules loaded. Default policy: deny.",
    }),
    mk({
      id: "https-in",
      title: "Visitor → HTTPS request arrives",
      desc: "A packet to port 443 reaches the firewall. It matches rule 1 (ALLOW TCP 443).",
      from: "user",
      to: "fw",
      badge: "Check",
      packet: pkt("SYN :443", "#38bdf8", [
        L.ip("198.51.100.7", "203.0.113.10"),
        L.tcp("50412", "443", "SYN"),
      ]),
      log: "[Firewall] Rule 1 matched → ALLOW.",
    }),
    mk({
      id: "https-forward",
      title: "Allowed traffic is forwarded to the web server",
      desc: "The firewall forwards the packet and remembers the connection in its state table (stateful inspection).",
      from: "fw",
      to: "web",
      badge: "Allow",
      packet: pkt("SYN :443", "#22c55e", [
        L.ip("198.51.100.7", "203.0.113.10"),
        L.tcp("50412", "443", "SYN"),
      ]),
      log: "[Firewall] Forwarded. State: 198.51.100.7:50412 ⇄ :443 tracked.",
    }),
    mk({
      id: "reply-ok",
      title: "The server's reply matches an existing connection",
      desc: "No rule for outbound replies is needed — the state table shows this packet belongs to a connection the firewall already allowed.",
      from: "web",
      to: "fw",
      badge: "Stateful",
      packet: pkt("SYN-ACK", "#22c55e", [
        L.ip("203.0.113.10", "198.51.100.7"),
        L.tcp("443", "50412", "SYN, ACK"),
      ]),
      log: "[Firewall] Rule 2 (established) → ALLOW.",
    }),
    mk({
      id: "scan",
      title: "Attacker probes a random port (e.g. 8081)",
      desc: "No explicit rule matches, so the default deny rule drops the packet silently. The attacker learns nothing.",
      from: "bad",
      to: "fw",
      badge: "Blocked",
      packet: pkt("SYN :8081", "#f43f5e", [
        L.ip("192.0.2.66", "203.0.113.10"),
        L.tcp("40001", "8081", "SYN"),
      ]),
      log: "[Firewall] No rule matched → default DENY. Packet dropped.",
    }),
    mk({
      id: "telnet",
      title: "Attacker tries Telnet (port 23)",
      desc: "Rule 3 explicitly denies Telnet. The firewall drops it and logs the attempt for the security team.",
      from: "bad",
      to: "fw",
      badge: "Blocked",
      packet: pkt("SYN :23", "#f43f5e", [
        L.ip("192.0.2.66", "203.0.113.10"),
        L.tcp("40002", "23", "SYN"),
      ]),
      log: "[Firewall] Rule 3 matched → DENY (logged).",
    }),
    mk({
      id: "summary",
      title: "Result: only what is explicitly allowed gets through",
      desc: "A firewall reduces the attack surface: the web server is reachable on 443 only, while every other port is invisible to the outside world.",
      from: "fw",
      nodes: ["fw", "web"],
      badge: "Summary",
      log: "[Firewall] Allowed: 2 packets. Dropped: 2 packets.",
    }),
  ],
  side: (i) => (
    <SidePanel title="Firewall rule list">
      <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 font-mono text-[11px]">
        {rules.map((r, idx) => (
          <div
            key={idx}
            className={cn(
              "flex gap-2 px-2 py-1",
              ruleHit[i] === idx && (r[0] === "ALLOW" ? "bg-emerald-500/15" : "bg-rose-500/15")
            )}
          >
            <span className="text-slate-600">{idx + 1}</span>
            <span className={r[0] === "ALLOW" ? "text-emerald-400" : "text-rose-400"}>{r[0]}</span>
            <span className="text-slate-300">{r[1]}</span>
          </div>
        ))}
      </div>
    </SidePanel>
  ),
};

const SCENARIOS: Record<ScId, Scenario> = {
  switch: switchScenario,
  router: routerScenario,
  firewall: firewallScenario,
};

const TYPES = [
  { name: "PAN", full: "Personal Area Network", reach: 6, range: "~1–10 m", example: "Bluetooth headset, smartwatch ↔ phone" },
  { name: "LAN", full: "Local Area Network", reach: 28, range: "a room → a building", example: "Home Wi-Fi, office Ethernet, school lab" },
  { name: "MAN", full: "Metropolitan Area Network", reach: 58, range: "a city (≈ 5–50 km)", example: "City-wide fibre ring, campus-to-campus links" },
  { name: "WAN", full: "Wide Area Network", reach: 100, range: "countries & continents", example: "The Internet, ISP backbones, company-to-branch links" },
];

export default function NetworkDevices() {
  const [sc, setSc] = useState<ScId>("switch");
  const s = SCENARIOS[sc];

  return (
    <div className="flex flex-col gap-4">
      <ModuleHeader
        icon={RouterIcon}
        color="sky"
        title="Network Types & Devices"
        subtitle="See how switches, routers and firewalls each treat a packet differently — and how big each kind of network is."
      />
      <SimulatorLayout
        nodes={s.nodes}
        edges={s.edges}
        steps={s.steps}
        resetKey={`devices-${sc}`}
        topologyHeight={300}
        topBar={
          <ScenarioTabs
            label="Device"
            value={sc}
            onChange={setSc}
            options={[
              { id: "switch", label: "Switch (MAC)" },
              { id: "router", label: "Router (IP)" },
              { id: "firewall", label: "Firewall (rules)" },
            ]}
          />
        }
        sideExtra={({ index }) => s.side(index)}
      />

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-300">
          Types of networks — by geographic reach
        </h3>
        <div className="space-y-3">
          {TYPES.map((t) => (
            <div key={t.name} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[220px_1fr]">
              <div>
                <p className="text-sm font-bold text-slate-100">
                  {t.name} <span className="text-xs font-normal text-slate-500">— {t.full}</span>
                </p>
                <p className="text-[11px] text-slate-500">{t.range}</p>
              </div>
              <div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
                    style={{ width: `${t.reach}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{t.example}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
