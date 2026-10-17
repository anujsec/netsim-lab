import { Shuffle } from "lucide-react";
import SimulatorLayout from "../components/SimulatorLayout";
import ModuleHeader from "../components/ModuleHeader";
import SidePanel from "../components/SidePanel";
import { L, mk, pkt } from "../utils/packets";
import type { SimStep, TopoEdge, TopoNode } from "../types";

const nodes: TopoNode[] = [
  { id: "pc1", label: "PC-1", sublabel: "192.168.1.10 (private)", x: 12, y: 25, icon: "pc" },
  { id: "pc2", label: "PC-2", sublabel: "192.168.1.11 (private)", x: 12, y: 78, icon: "laptop" },
  { id: "nat", label: "NAT Router", sublabel: "public 203.0.113.5", x: 50, y: 50, icon: "router" },
  { id: "web", label: "Web Server", sublabel: "93.184.216.34", x: 88, y: 50, icon: "server" },
];
const edges: TopoEdge[] = [
  { from: "pc1", to: "nat" },
  { from: "pc2", to: "nat" },
  { from: "nat", to: "web", label: "Internet" },
];

type Row = [string, string];
const T1: Row = ["192.168.1.10:51000", "203.0.113.5:40001"];
const T2: Row = ["192.168.1.11:51000", "203.0.113.5:40002"];
const tables: Row[][] = [[], [], [T1], [T1], [T1], [T1], [T1, T2], [T1, T2], [T1, T2], [T1, T2]];

const steps: SimStep[] = [
  mk({
    id: "intro",
    title: "Private addresses can't be used on the Internet",
    desc: "192.168.x.x addresses are private: Internet routers drop them. NAT lets many private devices share ONE public IP address (203.0.113.5).",
    from: "nat",
    nodes: ["pc1", "pc2", "nat"],
    badge: "Why NAT?",
    log: "[NAT] Public IP: 203.0.113.5. NAT table: empty.",
  }),
  mk({
    id: "out1",
    title: "PC-1 sends a request to the web server",
    desc: "The packet leaves PC-1 with its PRIVATE source IP and source port 51000.",
    from: "pc1",
    to: "nat",
    badge: "Outbound",
    packet: pkt("HTTPS REQ", "#38bdf8", [L.ip("192.168.1.10", "93.184.216.34"), L.tcp("51000", "443", "SYN")]),
    log: "[PC-1 → NAT] 192.168.1.10:51000 → 93.184.216.34:443",
  }),
  mk({
    id: "translate1",
    title: "The router rewrites the SOURCE address (SNAT / PAT)",
    desc: "It replaces 192.168.1.10:51000 with its own public IP and a free port (40001) and records the pair in the NAT table.",
    from: "nat",
    to: "web",
    badge: "Translated",
    packet: pkt("HTTPS REQ", "#a78bfa", [L.ip("203.0.113.5", "93.184.216.34"), L.tcp("40001", "443", "SYN")]),
    log: "[NAT] Rewrote src → 203.0.113.5:40001. Table entry created.",
  }),
  mk({
    id: "reply1",
    title: "The server replies to the PUBLIC address",
    desc: "The server has never heard of 192.168.1.10. It simply answers 203.0.113.5:40001.",
    from: "web",
    to: "nat",
    badge: "Inbound",
    packet: pkt("REPLY", "#22c55e", [L.ip("93.184.216.34", "203.0.113.5"), L.tcp("443", "40001", "SYN, ACK")]),
    log: "[Web → NAT] 93.184.216.34:443 → 203.0.113.5:40001",
  }),
  mk({
    id: "back1",
    title: "The router looks up the table and translates back",
    desc: "Port 40001 maps to 192.168.1.10:51000, so the router rewrites the DESTINATION and forwards the reply to PC-1.",
    from: "nat",
    to: "pc1",
    badge: "Reverse NAT",
    packet: pkt("REPLY", "#22c55e", [L.ip("93.184.216.34", "192.168.1.10"), L.tcp("443", "51000", "SYN, ACK")]),
    log: "[NAT] Table hit: 40001 → 192.168.1.10:51000. Delivered to PC-1.",
  }),
  mk({
    id: "out2",
    title: "PC-2 uses the SAME source port 51000",
    desc: "Two devices can pick the same local port. The router can still tell them apart by giving each a different public port.",
    from: "pc2",
    to: "nat",
    badge: "Outbound",
    packet: pkt("HTTPS REQ", "#38bdf8", [L.ip("192.168.1.11", "93.184.216.34"), L.tcp("51000", "443", "SYN")]),
    log: "[PC-2 → NAT] 192.168.1.11:51000 → 93.184.216.34:443",
  }),
  mk({
    id: "translate2",
    title: "A second table entry: port 40002",
    desc: "This is PAT (Port Address Translation), the most common kind of NAT. One public IP + many ports = thousands of simultaneous connections.",
    from: "nat",
    to: "web",
    badge: "Translated",
    packet: pkt("HTTPS REQ", "#a78bfa", [L.ip("203.0.113.5", "93.184.216.34"), L.tcp("40002", "443", "SYN")]),
    log: "[NAT] Rewrote src → 203.0.113.5:40002.",
  }),
  mk({
    id: "reply2",
    title: "Reply for PC-2 is matched by port 40002",
    desc: "Different public port → different private host. The table keeps every conversation separate.",
    from: "nat",
    to: "pc2",
    badge: "Reverse NAT",
    packet: pkt("REPLY", "#22c55e", [L.ip("93.184.216.34", "192.168.1.11"), L.tcp("443", "51000", "SYN, ACK")]),
    log: "[NAT] 40002 → 192.168.1.11:51000. Delivered to PC-2.",
  }),
  mk({
    id: "unsolicited",
    title: "Unsolicited packet from the Internet",
    desc: "An outsider sends a packet to port 40009. There is no entry in the NAT table, so the router doesn't know which device it's for — it drops it. That's why NAT acts as a basic shield.",
    from: "web",
    to: "nat",
    badge: "Dropped",
    packet: pkt("UNSOLICITED", "#f43f5e", [L.ip("93.184.216.34", "203.0.113.5"), L.tcp("4444", "40009", "SYN")]),
    log: "[NAT] No mapping for port 40009 → packet dropped.",
  }),
  mk({
    id: "summary",
    title: "Summary",
    desc: "NAT saves IPv4 addresses (many hosts, one public IP) and hides internal addresses. It is NOT a real firewall, though — and it breaks true end-to-end connectivity (which IPv6 restores).",
    from: "nat",
    nodes: ["nat"],
    badge: "Done",
    log: "[NAT] 2 active translations.",
  }),
];

export default function NatLab() {
  return (
    <div className="flex flex-col gap-4">
      <ModuleHeader
        icon={Shuffle}
        color="emerald"
        title="Public vs Private IPs & NAT"
        subtitle="Watch a router translate private addresses to one public address — and keep track with its NAT table."
      />
      <SimulatorLayout
        nodes={nodes}
        edges={edges}
        steps={steps}
        resetKey="nat"
        topologyHeight={320}
        sideExtra={({ index }) => (
          <SidePanel title="NAT translation table">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 border-b border-slate-800 pb-1 text-[10px] font-bold uppercase text-slate-500">
              <span>Private (inside)</span>
              <span />
              <span>Public (outside)</span>
            </div>
            {tables[index].length === 0 && <p className="py-2 text-slate-600">(empty)</p>}
            {tables[index].map((r) => (
              <div key={r[0]} className="grid grid-cols-[1fr_auto_1fr] gap-2 py-1 font-mono text-[11px]">
                <span className="text-amber-300">{r[0]}</span>
                <span className="text-slate-600">⇄</span>
                <span className="text-cyan-300">{r[1]}</span>
              </div>
            ))}
            <p className="mt-2 text-slate-500">
              Private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16.
            </p>
          </SidePanel>
        )}
      />
    </div>
  );
}
