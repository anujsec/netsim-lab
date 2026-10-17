import { useState, type ReactNode } from "react";
import { Radio } from "lucide-react";
import SimulatorLayout from "../components/SimulatorLayout";
import ModuleHeader from "../components/ModuleHeader";
import ScenarioTabs from "../components/ScenarioTabs";
import SidePanel from "../components/SidePanel";
import { L, mk, pkt, layer, COLORS } from "../utils/packets";
import { cn } from "../utils/cn";
import type { SimStep, TopoEdge, TopoNode } from "../types";

type Sc = "tcp" | "udp" | "amp";

const dNodes: TopoNode[] = [
  { id: "s", label: "Sender", sublabel: "sends 4 messages", x: 10, y: 50, icon: "pc" },
  { id: "net", label: "Lossy network", sublabel: "drops packet 3", x: 50, y: 50, icon: "cloud" },
  { id: "r", label: "Receiver", x: 90, y: 50, icon: "server" },
];
const dEdges: TopoEdge[] = [
  { from: "s", to: "net" },
  { from: "net", to: "r" },
];
const through = (a: string, b: string): Array<[string, string]> =>
  a === "s" && b === "r" ? [["s", "net"], ["net", "r"]] : b === "s" ? [["net", "s"], ["r", "net"]] : [[a, b]];
const flow = (id: string, title: string, desc: string, from: string, to: string, label: string, color: string, layers: ReturnType<typeof L.ip>[], log: string): SimStep => ({
  ...mk({ id, title, desc, from, to, badge: label, packet: pkt(label, color, layers), log }),
  activeNodes: ["s", "net", "r"],
  activeEdges: through(from, to),
});
const tcpSeg = (seq: number, flags = "PSH, ACK") => [L.ip("10.0.0.5", "203.0.113.9"), L.tcp("50000", "9000", flags, [["Seq", String(seq)]])];
const udpDg = (n: number) => [L.ip("10.0.0.5", "203.0.113.9"), L.udp("50000", "9000", [["Datagram #", String(n)]])];

const tcpSteps: SimStep[] = [
  flow("s1", "Segment 1 is delivered", "TCP numbers every segment (sequence numbers).", "s", "r", "SEG 1", "#38bdf8", tcpSeg(1), "[Sender → Receiver] SEG 1"),
  flow("s2", "Segment 2 is delivered", "The receiver will acknowledge what it has received.", "s", "r", "SEG 2", "#38bdf8", tcpSeg(2), "[Sender → Receiver] SEG 2"),
  flow("a2", "ACK 3: 'I've received everything up to 2'", "ACKs tell the sender what the receiver expects next.", "r", "s", "ACK 3", "#22c55e", [L.ip("203.0.113.9", "10.0.0.5"), L.tcp("9000", "50000", "ACK", [["Ack", "3"]])], "[Receiver → Sender] ACK 3"),
  {
    ...mk({ id: "s3", title: "Segment 3 is LOST in the network", desc: "A router dropped it (congestion, bad cable, Wi-Fi interference). The sender doesn't know yet.", from: "s", to: "net", badge: "Lost", packet: pkt("SEG 3", "#f43f5e", tcpSeg(3)), log: "[Network] SEG 3 dropped!" }),
    activeNodes: ["s", "net"],
  },
  flow("s4", "Segment 4 arrives — but out of order", "The receiver is still missing #3, so it can't hand #4 to the application yet.", "s", "r", "SEG 4", "#38bdf8", tcpSeg(4), "[Sender → Receiver] SEG 4 (out of order)"),
  flow("dup", "Duplicate ACK 3: 'I'm still waiting for #3'", "Repeated ACKs (or a timeout) reveal the loss to the sender.", "r", "s", "ACK 3 (dup)", "#f97316", [L.ip("203.0.113.9", "10.0.0.5"), L.tcp("9000", "50000", "ACK", [["Ack", "3 (duplicate)"]])], "[Receiver → Sender] dup ACK 3"),
  flow("retx", "Sender RETRANSMITS segment 3", "This is the 'reliable' part of TCP: lost data is sent again.", "s", "r", "SEG 3 (retx)", "#a78bfa", tcpSeg(3), "[Sender → Receiver] SEG 3 retransmitted"),
  flow("done", "ACK 5: everything arrived, in order", "The application receives 1, 2, 3, 4 — complete and ordered. Price: extra delay and overhead.", "r", "s", "ACK 5", "#22c55e", [L.ip("203.0.113.9", "10.0.0.5"), L.tcp("9000", "50000", "ACK", [["Ack", "5"]])], "[Receiver → Sender] ACK 5 ✔"),
];
const tcpGot = [[], [1], [1, 2], [1, 2], [1, 2], [1, 2, 4], [1, 2, 4], [1, 2, 3, 4], [1, 2, 3, 4]];

const udpSteps: SimStep[] = [
  flow("d1", "Datagram 1 → sent and forgotten", "UDP has no handshake, no ACKs, no retransmission — 'fire and forget'.", "s", "r", "DGRAM 1", "#38bdf8", udpDg(1), "[Sender → Receiver] DGRAM 1"),
  flow("d2", "Datagram 2 → sent", "No waiting for confirmation: very low latency and tiny headers (8 bytes).", "s", "r", "DGRAM 2", "#38bdf8", udpDg(2), "[Sender → Receiver] DGRAM 2"),
  {
    ...mk({ id: "d3", title: "Datagram 3 is LOST", desc: "Nobody notices. UDP never resends it. The sender has no idea.", from: "s", to: "net", badge: "Lost", packet: pkt("DGRAM 3", "#f43f5e", udpDg(3)), log: "[Network] DGRAM 3 dropped!" }),
    activeNodes: ["s", "net"],
  },
  flow("d4", "Datagram 4 → delivered immediately", "No waiting for #3. This keeps live traffic smooth.", "s", "r", "DGRAM 4", "#38bdf8", udpDg(4), "[Sender → Receiver] DGRAM 4"),
  {
    ...mk({ id: "end", title: "Result: the receiver got 1, 2 and 4", desc: "A gap remains — and that's fine for video calls, online games, live streaming and DNS: a stale frame is worthless, so skipping it beats waiting. If the application cares, it must handle loss itself (e.g. DNS simply asks again).", from: "r", badge: "Gap", log: "[Receiver] Got 1, 2, 4. Datagram 3 missing — app decides." }),
    activeNodes: ["r"],
  },
];
const udpGot = [[1], [1, 2], [1, 2], [1, 2, 4], [1, 2, 4]];

/* ---------- amplification ---------- */
const aNodes: TopoNode[] = [
  { id: "atk", label: "Attacker", sublabel: "spoofs the victim's IP", x: 10, y: 50, icon: "laptop" },
  { id: "r1", label: "Open DNS resolver 1", x: 50, y: 18, icon: "dns" },
  { id: "r2", label: "Open DNS resolver 2", x: 50, y: 82, icon: "dns" },
  { id: "vic", label: "Victim", sublabel: "203.0.113.50", x: 90, y: 50, icon: "server" },
];
const aEdges: TopoEdge[] = [
  { from: "atk", to: "r1" },
  { from: "atk", to: "r2" },
  { from: "r1", to: "vic" },
  { from: "r2", to: "vic" },
];
const dnsQ = (src: string) => [L.ip(src, "198.51.100.1"), L.udp("4444", "53"), layer("dns", "Application — DNS", "DNS", COLORS.app, [["Query", "example.com ANY"], ["Size", "≈ 60 bytes"]])];
const dnsR = (dst: string) => [L.ip("198.51.100.1", dst), L.udp("53", "4444"), layer("dns", "Application — DNS", "DNS", COLORS.danger, [["Answer", "ANY records (huge)"], ["Size", "≈ 3,000 bytes"]])];
const ampSteps: SimStep[] = [
  mk({ id: "idea", title: "Idea: UDP lets you lie about the source address", desc: "UDP has no handshake, so the receiver can't verify who really sent a datagram. An attacker can send a small request while pretending to be the VICTIM. The server then sends its (much bigger) reply to the victim.", from: "atk", nodes: ["atk"], badge: "Spoofing", log: "[Attacker] Plan: reflect + amplify through open resolvers." }),
  mk({ id: "q1", title: "Tiny spoofed query → resolver 1", desc: "Source IP is forged as 203.0.113.50 (the victim). The question 'give me ALL records for example.com' is about 60 bytes.", from: "atk", to: "r1", badge: "60 B", packet: pkt("DNS ANY", "#f97316", dnsQ("203.0.113.50 (spoofed)")), log: "[Attacker → R1] DNS ANY? src=203.0.113.50 (spoofed), 60 bytes" }),
  mk({ id: "q2", title: "Same trick with resolver 2 (and thousands more)", desc: "Botnets send millions of these per second to many reflectors, so the traffic reaching the victim comes from legitimate servers all over the world.", from: "atk", to: "r2", badge: "60 B", packet: pkt("DNS ANY", "#f97316", dnsQ("203.0.113.50 (spoofed)")), log: "[Attacker → R2] DNS ANY? src=203.0.113.50 (spoofed)" }),
  mk({ id: "a1", title: "Resolver 1 sends a HUGE answer — to the victim", desc: "The ~3,000-byte response goes to the spoofed source address: the victim, who never asked for it.", from: "r1", to: "vic", badge: "3,000 B", packet: pkt("DNS ANSWER", "#f43f5e", dnsR("203.0.113.50")), log: "[R1 → Victim] 3,000-byte response (≈ 50× amplification)" }),
  mk({ id: "a2", title: "Resolver 2 joins in", desc: "The attacker spent ~120 bytes of bandwidth; the victim receives ~6,000 bytes — and the attacker's own IP never appears in the traffic.", from: "r2", to: "vic", badge: "3,000 B", packet: pkt("DNS ANSWER", "#f43f5e", dnsR("203.0.113.50")), log: "[R2 → Victim] 3,000-byte response" }),
  { ...mk({ id: "flood", title: "The victim's link is saturated", desc: "With enough reflectors, even a modest attacker can generate hundreds of Gbps. Real-world amplification factors: DNS ≈ 28–54×, NTP 'monlist' ≈ 556×, Memcached up to ≈ 51,000×.", from: "vic", badge: "DDoS", log: "[Victim] Inbound traffic 100× normal → service unreachable." }), activeNodes: ["vic", "r1", "r2"], activeEdges: [["r1", "vic"], ["r2", "vic"]] },
  mk({ id: "defence", title: "Defences", desc: "ISPs: BCP 38 / ingress filtering (drop packets whose source IP can't be valid). Operators: close open resolvers, rate-limit responses (RRL), patch NTP / memcached, don't expose UDP services publicly. Victims: DDoS scrubbing / anycast CDNs.", from: "r1", nodes: ["r1", "r2"], badge: "Defence", log: "[ISP] BCP38: spoofed-source packet dropped at the edge." }),
];

const sideAmp = (i: number): ReactNode => {
  const req = i >= 1 ? 60 * Math.min(i, 2) : 0;
  const resp = i >= 3 ? 3000 * Math.min(i - 2, 2) : 0;
  const max = 6000;
  return (
    <SidePanel title="Bytes sent vs bytes received">
      <div className="space-y-3">
        <div>
          <p className="mb-1 text-slate-500">Attacker sends</p>
          <div className="h-3 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-amber-500" style={{ width: `${Math.max((req / max) * 100, req ? 1.5 : 0)}%` }} />
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-amber-300">{req.toLocaleString()} bytes</p>
        </div>
        <div>
          <p className="mb-1 text-slate-500">Victim receives</p>
          <div className="h-3 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-rose-500" style={{ width: `${(resp / max) * 100}%` }} />
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-rose-300">{resp.toLocaleString()} bytes</p>
        </div>
      </div>
      <p className="mt-3 text-slate-500">
        Amplification factor ≈ <b className="text-slate-200">{req && resp ? Math.round(resp / req) : "–"}×</b>
      </p>
    </SidePanel>
  );
};

const sideDelivery = (got: number[], tcp: boolean): ReactNode => (
  <SidePanel title="What the receiver's application gets">
    <div className="flex gap-1.5">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className={cn(
            "flex h-10 flex-1 items-center justify-center rounded-md border text-xs font-bold",
            got.includes(n) ? "border-emerald-500/60 bg-emerald-500/25 text-emerald-200" : "border-rose-500/50 bg-rose-500/10 text-rose-300"
          )}
        >
          {got.includes(n) ? n : `${n} ✕`}
        </div>
      ))}
    </div>
    <div className="mt-3 divide-y divide-slate-800 rounded-lg border border-slate-800 text-[11px]">
      {[
        ["", "TCP", "UDP"],
        ["Connection", "handshake", "none"],
        ["Delivery", "guaranteed, ordered", "best effort"],
        ["Header", "20+ bytes", "8 bytes"],
        ["Used for", "web, e-mail, SSH", "video, VoIP, DNS, games"],
      ].map((r, idx) => (
        <div key={idx} className="grid grid-cols-3 gap-2 px-2 py-1">
          <span className="text-slate-500">{r[0]}</span>
          <span className={cn(tcp ? "text-cyan-300" : "text-slate-500", idx === 0 && "font-bold")}>{r[1]}</span>
          <span className={cn(!tcp ? "text-cyan-300" : "text-slate-500", idx === 0 && "font-bold")}>{r[2]}</span>
        </div>
      ))}
    </div>
  </SidePanel>
);

export default function UdpLab() {
  const [sc, setSc] = useState<Sc>("tcp");
  const amp = sc === "amp";
  const steps = sc === "tcp" ? tcpSteps : sc === "udp" ? udpSteps : ampSteps;

  return (
    <div className="flex flex-col gap-4">
      <ModuleHeader
        icon={Radio}
        color="violet"
        title="TCP vs UDP & UDP Amplification DDoS"
        subtitle="Reliable-but-slower vs fast-but-careless delivery — and how UDP's lack of a handshake is abused for DDoS."
      />
      <SimulatorLayout
        nodes={amp ? aNodes : dNodes}
        edges={amp ? aEdges : dEdges}
        steps={steps}
        resetKey={`udp-${sc}`}
        topologyHeight={320}
        topBar={
          <ScenarioTabs
            label="Scenario"
            value={sc}
            onChange={setSc}
            options={[
              { id: "tcp", label: "TCP with packet loss" },
              { id: "udp", label: "UDP with packet loss" },
              { id: "amp", label: "UDP amplification DDoS" },
            ]}
          />
        }
        sideExtra={({ index }) =>
          amp ? sideAmp(index) : sideDelivery((sc === "tcp" ? tcpGot : udpGot)[index] ?? [], sc === "tcp")
        }
      />
    </div>
  );
}
