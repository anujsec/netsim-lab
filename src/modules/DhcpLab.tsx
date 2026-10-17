import { useState, type ReactNode } from "react";
import { Wifi } from "lucide-react";
import SimulatorLayout from "../components/SimulatorLayout";
import ModuleHeader from "../components/ModuleHeader";
import ScenarioTabs from "../components/ScenarioTabs";
import SidePanel from "../components/SidePanel";
import { L, mk, pkt, type Fields } from "../utils/packets";
import { cn } from "../utils/cn";
import type { SimStep, TopoEdge, TopoNode } from "../types";

type Sc = "dora" | "rogue" | "starve";

const nodes: TopoNode[] = [
  { id: "client", label: "New Client", sublabel: "no IP yet", x: 14, y: 52, icon: "laptop" },
  { id: "dhcp", label: "DHCP Server", sublabel: "192.168.1.1 (router)", x: 86, y: 22, icon: "router" },
  { id: "evil", label: "Attacker", sublabel: "same LAN", x: 86, y: 82, icon: "laptop" },
];
const edges: TopoEdge[] = [
  { from: "client", to: "dhcp" },
  { from: "client", to: "evil" },
  { from: "dhcp", to: "evil", dashed: true },
];

const MAC = "AA:BB:CC:00:00:01";
const dhcpLayers = (msg: string, ipSrc: string, ipDst: string, fields: Fields, sp = "68", dp = "67") => [
  L.ip(ipSrc, ipDst),
  L.udp(sp, dp),
  L.app("Application — DHCP", msg, fields),
];

const dora: SimStep[] = [
  mk({
    id: "start",
    title: "A new device joins the network with no IP address",
    desc: "It can't talk to anyone yet, so it uses the special address 0.0.0.0 and asks, via broadcast, for configuration. DHCP uses UDP ports 67 (server) and 68 (client).",
    from: "client",
    nodes: ["client"],
    badge: "Start",
    log: "[Client] IP = 0.0.0.0. Needs an address.",
  }),
  {
    ...mk({
      id: "discover",
      title: "D — DISCOVER (broadcast)",
      desc: "'Is there any DHCP server out there?' Sent to 255.255.255.255 so every device on the LAN hears it.",
      from: "client",
      to: "dhcp",
      badge: "Discover",
      packet: pkt("DISCOVER", "#38bdf8", dhcpLayers("DISCOVER", "0.0.0.0", "255.255.255.255", [["Client MAC", MAC], ["Message", "DHCPDISCOVER"]])),
      log: "[Client → *] DHCPDISCOVER (broadcast) 0.0.0.0 → 255.255.255.255",
    }),
    activeNodes: ["client", "dhcp", "evil"],
    activeEdges: [["client", "dhcp"], ["client", "evil"]],
  },
  mk({
    id: "offer",
    title: "O — OFFER",
    desc: "The DHCP server picks a free address from its pool and offers it, together with a subnet mask, default gateway, DNS server and a lease time.",
    from: "dhcp",
    to: "client",
    badge: "Offer",
    packet: pkt("OFFER", "#a78bfa", dhcpLayers("OFFER", "192.168.1.1", "255.255.255.255", [["Offered IP", "192.168.1.50"], ["Mask", "255.255.255.0"], ["Gateway", "192.168.1.1"], ["DNS", "192.168.1.1"], ["Lease", "24 h"]], "67", "68")),
    log: "[DHCP → Client] DHCPOFFER 192.168.1.50 (gw 192.168.1.1, dns 192.168.1.1, 24h).",
  }),
  {
    ...mk({
      id: "request",
      title: "R — REQUEST (broadcast)",
      desc: "'I accept 192.168.1.50 from server 192.168.1.1.' It is broadcast so that other DHCP servers know their offers were declined.",
      from: "client",
      to: "dhcp",
      badge: "Request",
      packet: pkt("REQUEST", "#38bdf8", dhcpLayers("REQUEST", "0.0.0.0", "255.255.255.255", [["Requested IP", "192.168.1.50"], ["Server ID", "192.168.1.1"]])),
      log: "[Client → *] DHCPREQUEST for 192.168.1.50 from 192.168.1.1",
    }),
    activeNodes: ["client", "dhcp", "evil"],
    activeEdges: [["client", "dhcp"], ["client", "evil"]],
  },
  mk({
    id: "ack",
    title: "A — ACKNOWLEDGE",
    desc: "The server confirms the lease. The client now configures its network card — and can communicate normally.",
    from: "dhcp",
    to: "client",
    badge: "ACK",
    packet: pkt("ACK", "#22c55e", dhcpLayers("ACK", "192.168.1.1", "192.168.1.50", [["Your IP", "192.168.1.50"], ["Lease", "24 h"]], "67", "68")),
    log: "[DHCP → Client] DHCPACK. Client IP = 192.168.1.50.",
  }),
  mk({
    id: "done",
    title: "Configured: Discover → Offer → Request → ACK (DORA)",
    desc: "The client keeps the address until the lease expires, and tries to renew it halfway through. The whole exchange takes a few milliseconds.",
    from: "client",
    nodes: ["client", "dhcp"],
    badge: "Done",
    log: "[Client] Configured via DHCP. Lease renewal at 12h (T1).",
  }),
];

const rogue: SimStep[] = [
  mk({
    id: "start",
    title: "Attack: a rogue DHCP server on the LAN",
    desc: "DHCP has no authentication — any device can answer a DISCOVER. The attacker runs their own DHCP server, hoping to answer faster than the real one.",
    from: "evil",
    nodes: ["evil", "client", "dhcp"],
    badge: "Setup",
    log: "[Attacker] Rogue DHCP server started.",
  }),
  {
    ...mk({
      id: "discover",
      title: "Client broadcasts DISCOVER — BOTH servers hear it",
      desc: "Broadcasts go to everyone on the LAN segment, including the attacker.",
      from: "client",
      to: "dhcp",
      badge: "Discover",
      packet: pkt("DISCOVER", "#38bdf8", dhcpLayers("DISCOVER", "0.0.0.0", "255.255.255.255", [["Client MAC", MAC]])),
      log: "[Client → *] DHCPDISCOVER (broadcast). Heard by DHCP server AND attacker.",
    }),
    activeNodes: ["client", "dhcp", "evil"],
    activeEdges: [["client", "dhcp"], ["client", "evil"]],
  },
  mk({
    id: "real-offer",
    title: "The legitimate server answers…",
    desc: "The real server sends an OFFER with the correct gateway and DNS.",
    from: "dhcp",
    to: "client",
    badge: "Offer (real)",
    packet: pkt("OFFER", "#22c55e", dhcpLayers("OFFER", "192.168.1.1", "255.255.255.255", [["Offered IP", "192.168.1.50"], ["Gateway", "192.168.1.1"], ["DNS", "192.168.1.1"]], "67", "68")),
    log: "[DHCP → Client] OFFER 192.168.1.50 (gw 192.168.1.1)",
  }),
  mk({
    id: "evil-offer",
    title: "…but the attacker's OFFER arrives first and is accepted",
    desc: "Most clients accept the first offer. The rogue offer hands out the ATTACKER as default gateway and DNS server.",
    from: "evil",
    to: "client",
    badge: "Offer (rogue)",
    packet: pkt("OFFER", "#f43f5e", dhcpLayers("OFFER", "192.168.1.66", "255.255.255.255", [["Offered IP", "192.168.1.51"], ["Gateway", "192.168.1.66"], ["DNS", "192.168.1.66"]], "67", "68")),
    log: "[Attacker → Client] OFFER 192.168.1.51 gw=192.168.1.66 dns=192.168.1.66 ← malicious",
  }),
  {
    ...mk({
      id: "request",
      title: "Client REQUESTs the rogue offer",
      desc: "The client picks the attacker's server. The real server sees it was not chosen and releases its offer.",
      from: "client",
      to: "evil",
      badge: "Request",
      packet: pkt("REQUEST", "#38bdf8", dhcpLayers("REQUEST", "0.0.0.0", "255.255.255.255", [["Requested IP", "192.168.1.51"], ["Server ID", "192.168.1.66"]])),
      log: "[Client → *] REQUEST 192.168.1.51 from server 192.168.1.66",
    }),
    activeNodes: ["client", "dhcp", "evil"],
    activeEdges: [["client", "evil"], ["client", "dhcp"]],
  },
  mk({
    id: "ack",
    title: "Client is configured by the attacker",
    desc: "Now the client sends ALL its Internet traffic to the attacker's machine (man-in-the-middle) and asks the attacker's fake DNS for every name.",
    from: "evil",
    to: "client",
    badge: "ACK",
    packet: pkt("ACK", "#f43f5e", dhcpLayers("ACK", "192.168.1.66", "192.168.1.51", [["Your IP", "192.168.1.51"], ["Gateway", "192.168.1.66"]], "67", "68")),
    log: "[Attacker → Client] ACK. Client gateway = attacker. MITM established.",
  }),
  mk({
    id: "defence",
    title: "Defence: DHCP snooping",
    desc: "Managed switches can mark only the real server's port as 'trusted'. DHCP OFFER/ACK packets arriving on any other port are dropped. Also: monitor for unknown DHCP servers.",
    from: "dhcp",
    nodes: ["dhcp", "client"],
    badge: "Defence",
    log: "[Switch] DHCP snooping: untrusted port sent OFFER → dropped.",
  }),
];

const starve: SimStep[] = [
  mk({
    id: "start",
    title: "Attack: DHCP starvation",
    desc: "A DHCP server only has a limited pool of addresses (here: 8). The attacker will request them ALL using fake MAC addresses.",
    from: "evil",
    nodes: ["evil", "dhcp"],
    badge: "Setup",
    log: "[DHCP] Pool 192.168.1.50–57: 8 free addresses.",
  }),
  mk({
    id: "flood1",
    title: "Attacker sends DISCOVER with a fake MAC (×1)",
    desc: "Each request uses a different spoofed client MAC, so the server thinks it's a new device every time.",
    from: "evil",
    to: "dhcp",
    badge: "Flood",
    packet: pkt("DISCOVER", "#f43f5e", dhcpLayers("DISCOVER", "0.0.0.0", "255.255.255.255", [["Client MAC", "DE:AD:BE:EF:00:01 (fake)"]])),
    log: "[Attacker → DHCP] DISCOVER from fake MAC DE:AD:BE:EF:00:01 → leased .50",
  }),
  mk({
    id: "flood2",
    title: "…and again, and again",
    desc: "Tools like Yersinia or DHCPig can send hundreds of requests per second.",
    from: "evil",
    to: "dhcp",
    badge: "Flood",
    packet: pkt("DISCOVER", "#f43f5e", dhcpLayers("DISCOVER", "0.0.0.0", "255.255.255.255", [["Client MAC", "DE:AD:BE:EF:00:05 (fake)"]])),
    log: "[Attacker → DHCP] 4 more fake requests → .51–.54 leased",
  }),
  mk({
    id: "exhausted",
    title: "The address pool is exhausted",
    desc: "All 8 addresses are now leased to ghosts. The server has nothing left to hand out.",
    from: "evil",
    to: "dhcp",
    badge: "Pool full",
    packet: pkt("DISCOVER", "#f43f5e", dhcpLayers("DISCOVER", "0.0.0.0", "255.255.255.255", [["Client MAC", "DE:AD:BE:EF:00:08 (fake)"]])),
    log: "[DHCP] Pool 8/8 leased. No free addresses.",
  }),
  mk({
    id: "legit",
    title: "A legitimate client asks for an address",
    desc: "DISCOVER goes out… but there is no free lease. The user gets no IP (or a 169.254.x.x self-assigned one) and cannot use the network — a denial of service. Often the attacker then runs the rogue server too.",
    from: "client",
    to: "dhcp",
    badge: "Denied",
    packet: pkt("DISCOVER", "#38bdf8", dhcpLayers("DISCOVER", "0.0.0.0", "255.255.255.255", [["Client MAC", MAC]])),
    log: "[DHCP] No free leases → no OFFER. Client falls back to 169.254.x.x.",
  }),
  mk({
    id: "defence",
    title: "Defence: port security + DHCP snooping",
    desc: "Limit the number of MAC addresses per switch port and rate-limit DHCP requests so one port can't flood the pool.",
    from: "dhcp",
    nodes: ["dhcp"],
    badge: "Defence",
    log: "[Switch] Port security: max 2 MACs per port → violation, port shut down.",
  }),
];

const STEPS: Record<Sc, SimStep[]> = { dora, rogue, starve };
// pool used per step (starvation)
const poolUsed = [0, 1, 5, 8, 8, 8];

export default function DhcpLab() {
  const [sc, setSc] = useState<Sc>("dora");

  const side = (index: number): ReactNode => {
    if (sc === "starve") {
      const used = poolUsed[index] ?? 8;
      return (
        <SidePanel title="DHCP address pool (8 addresses)">
          <div className="grid grid-cols-8 gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md font-mono text-[10px] font-bold",
                  i < used ? "bg-rose-500/70 text-white" : "bg-emerald-500/20 text-emerald-300"
                )}
              >
                .{50 + i}
              </div>
            ))}
          </div>
          <p className="mt-2">
            <span className="font-bold text-rose-300">{used}</span> leased · {8 - used} free
          </p>
        </SidePanel>
      );
    }
    return (
      <SidePanel title="What a DHCP lease contains">
        <ul className="space-y-1">
          <li><span className="font-mono text-cyan-300">IP address</span> — your identity on the LAN</li>
          <li><span className="font-mono text-cyan-300">Subnet mask</span> — which addresses are local</li>
          <li><span className="font-mono text-cyan-300">Default gateway</span> — the exit to other networks</li>
          <li><span className="font-mono text-cyan-300">DNS server</span> — who resolves names</li>
          <li><span className="font-mono text-cyan-300">Lease time</span> — how long you may keep it</li>
        </ul>
        <p className="mt-2 text-slate-500">Static IP = set by hand. Dynamic IP = given by DHCP and may change.</p>
      </SidePanel>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <ModuleHeader
        icon={Wifi}
        color="orange"
        title="DHCP (DORA) & DHCP Attacks"
        subtitle="How a device gets its IP address automatically — and how attackers abuse DHCP."
      />
      <SimulatorLayout
        nodes={nodes}
        edges={edges}
        steps={STEPS[sc]}
        resetKey={`dhcp-${sc}`}
        topologyHeight={320}
        topBar={
          <ScenarioTabs
            label="Scenario"
            value={sc}
            onChange={setSc}
            options={[
              { id: "dora", label: "Normal DORA" },
              { id: "rogue", label: "Rogue DHCP server" },
              { id: "starve", label: "DHCP starvation" },
            ]}
          />
        }
        sideExtra={({ index }) => side(index)}
      />
    </div>
  );
}
