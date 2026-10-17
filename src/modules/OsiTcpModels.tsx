import { useState } from "react";
import { Layers3, ShieldAlert, ShieldCheck } from "lucide-react";
import ModuleHeader from "../components/ModuleHeader";
import { cn } from "../utils/cn";

interface OsiLayer {
  n: number;
  name: string;
  pdu: string;
  color: string;
  tcpip: 0 | 1 | 2 | 3; // index into TCPIP
  protocols: string;
  device: string;
  job: string;
  attacks: Array<[string, string]>;
  defence: string;
}

const TCPIP = [
  { name: "Application", sub: "HTTP, DNS, SSH, SMTP", rows: [1, 3] },
  { name: "Transport", sub: "TCP, UDP", rows: [4, 4] },
  { name: "Internet", sub: "IP, ICMP, ARP*", rows: [5, 5] },
  { name: "Network Access", sub: "Ethernet, Wi-Fi", rows: [6, 7] },
];

const OSI: OsiLayer[] = [
  {
    n: 7, name: "Application", pdu: "Data", color: "#22d3ee", tcpip: 0,
    protocols: "HTTP, DNS, SMTP, FTP, SSH", device: "Web server, proxy, WAF",
    job: "Gives network services to the user's software.",
    attacks: [["SQL injection / XSS", "Malicious input runs in the app or database"], ["HTTP flood", "Millions of legit-looking page requests exhaust the server"], ["Phishing", "Fake pages trick users into giving credentials"]],
    defence: "Input validation, WAF, rate limiting, user training",
  },
  {
    n: 6, name: "Presentation", pdu: "Data", color: "#a78bfa", tcpip: 0,
    protocols: "TLS/SSL, JPEG, ASCII, MIME", device: "Gateway",
    job: "Formats, compresses and encrypts data.",
    attacks: [["SSL stripping / downgrade", "Forces victim from HTTPS back to plain HTTP"], ["Weak / expired certificates", "Broken encryption lets attackers read or fake traffic"]],
    defence: "HSTS, TLS 1.2+, valid certificates",
  },
  {
    n: 5, name: "Session", pdu: "Data", color: "#f472b6", tcpip: 0,
    protocols: "NetBIOS, RPC, session tokens", device: "Gateway",
    job: "Opens, maintains and closes conversations between apps.",
    attacks: [["Session hijacking", "Stolen session cookie lets attacker act as the user"], ["Session fixation", "Attacker forces a known session ID on the victim"]],
    defence: "Secure/HttpOnly cookies, short timeouts, token rotation",
  },
  {
    n: 4, name: "Transport", pdu: "Segment (TCP) / Datagram (UDP)", color: "#8b5cf6", tcpip: 1,
    protocols: "TCP, UDP", device: "Firewall (port filtering)",
    job: "End-to-end delivery, ports, reliability and flow control.",
    attacks: [["SYN flood", "Half-open connections fill the server's queue"], ["Port scanning", "Attacker maps which ports are open"], ["UDP flood / amplification", "Spoofed UDP floods the victim"]],
    defence: "SYN cookies, firewall rules, rate limiting",
  },
  {
    n: 3, name: "Network", pdu: "Packet", color: "#38bdf8", tcpip: 2,
    protocols: "IP, ICMP, OSPF, BGP", device: "Router, L3 switch",
    job: "Logical addressing (IP) and routing between networks.",
    attacks: [["IP spoofing", "Fake source IP hides the attacker or blames someone else"], ["ICMP flood / Smurf", "Ping replies swamp the target"], ["BGP hijack", "Traffic is rerouted through the wrong network"]],
    defence: "Ingress/egress filtering, ACLs, RPKI",
  },
  {
    n: 2, name: "Data Link", pdu: "Frame", color: "#f59e0b", tcpip: 3,
    protocols: "Ethernet, Wi-Fi, ARP*, VLAN", device: "Switch, bridge, NIC",
    job: "Delivers frames inside one network using MAC addresses.",
    attacks: [["ARP poisoning", "Fake ARP replies redirect traffic through the attacker"], ["MAC flooding", "Overflows the switch table so it acts like a hub"], ["MAC spoofing / VLAN hopping", "Impersonate a device or jump into another VLAN"]],
    defence: "Port security, DHCP snooping, Dynamic ARP Inspection",
  },
  {
    n: 1, name: "Physical", pdu: "Bits", color: "#f97316", tcpip: 3,
    protocols: "Cables, radio, voltage, light", device: "Hub, cable, repeater, access point",
    job: "Turns bits into electrical, light or radio signals.",
    attacks: [["Cable tapping", "Physical access to wires lets the attacker listen"], ["Jamming", "Radio noise blocks Wi-Fi"], ["Rogue device / theft", "A hidden device is plugged into a free port"]],
    defence: "Locked rooms, port disable, cameras, shielded cabling",
  },
];

export default function OsiTcpModels() {
  const [sel, setSel] = useState(7);
  const [showAttacks, setShowAttacks] = useState(true);
  const layer = OSI.find((l) => l.n === sel)!;
  const hi = TCPIP[layer.tcpip];

  return (
    <div className="flex flex-col gap-4">
      <ModuleHeader
        icon={Layers3}
        color="fuchsia"
        title="OSI vs TCP/IP Model & Attacks per Layer"
        subtitle="See how the 7-layer teaching model folds into the 4-layer model that actually runs the Internet — and what attackers do at each layer."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-300">
              Click a layer
            </h3>
            <button
              onClick={() => setShowAttacks((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold",
                showAttacks ? "bg-rose-500/20 text-rose-300" : "bg-slate-800 text-slate-400"
              )}
            >
              <ShieldAlert className="h-3.5 w-3.5" /> Attacks {showAttacks ? "ON" : "OFF"}
            </button>
          </div>

          <div className="mb-2 grid grid-cols-[1fr_1fr] gap-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <span>OSI model (7)</span>
            <span>TCP/IP model (4)</span>
          </div>

          <div
            className="grid gap-x-3 gap-y-1.5"
            style={{ gridTemplateColumns: "1fr 1fr", gridTemplateRows: "repeat(7, minmax(52px, auto))" }}
          >
            {OSI.map((l, i) => (
              <button
                key={l.n}
                onClick={() => setSel(l.n)}
                style={{
                  gridColumn: 1,
                  gridRow: i + 1,
                  borderColor: sel === l.n ? l.color : `${l.color}44`,
                  backgroundColor: sel === l.n ? `${l.color}28` : `${l.color}10`,
                }}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors"
              >
                <span className="font-mono text-lg font-black" style={{ color: l.color }}>
                  {l.n}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold text-slate-100">{l.name}</span>
                  <span className="block text-[10px] text-slate-500">{l.pdu}</span>
                </span>
                {showAttacks && (
                  <span className="flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                    <ShieldAlert className="h-3 w-3" /> {l.attacks.length}
                  </span>
                )}
              </button>
            ))}
            {TCPIP.map((t) => {
              const active = hi === t;
              return (
                <div
                  key={t.name}
                  style={{ gridColumn: 2, gridRow: `${t.rows[0]} / ${t.rows[1] + 1}` }}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border px-3 py-2 text-center transition-colors",
                    active ? "border-cyan-400 bg-cyan-500/15" : "border-slate-700 bg-slate-950/50"
                  )}
                >
                  <span className={cn("text-sm font-bold", active ? "text-cyan-300" : "text-slate-200")}>
                    {t.name}
                  </span>
                  <span className="text-[10px] text-slate-500">{t.sub}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            * ARP sits between Layer 2 and 3 — it maps IP to MAC, so it is usually shown in the
            Internet / Network Access boundary. Layers 5–7 of OSI are all one "Application" layer in
            TCP/IP.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border bg-slate-900/60 p-4" style={{ borderColor: `${layer.color}66` }}>
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-2xl font-black" style={{ color: layer.color }}>
                L{layer.n}
              </span>
              <h3 className="text-base font-bold text-slate-100">{layer.name}</h3>
            </div>
            <p className="mb-3 text-sm text-slate-400">{layer.job}</p>
            <dl className="space-y-1.5 text-xs">
              <Row k="PDU" v={layer.pdu} />
              <Row k="Protocols" v={layer.protocols} />
              <Row k="Devices" v={layer.device} />
              <Row k="TCP/IP layer" v={hi.name} />
            </dl>
          </div>

          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4">
            <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-rose-300">
              <ShieldAlert className="h-4 w-4" /> Common attacks at Layer {layer.n}
            </h4>
            <ul className="space-y-2">
              {layer.attacks.map(([n, d]) => (
                <li key={n} className="text-xs">
                  <span className="font-bold text-slate-200">{n}</span>
                  <span className="block text-slate-400">{d}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <h4 className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-300">
              <ShieldCheck className="h-4 w-4" /> Defence
            </h4>
            <p className="text-xs text-slate-300">{layer.defence}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-800 pb-1">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right text-slate-200">{v}</dd>
    </div>
  );
}
