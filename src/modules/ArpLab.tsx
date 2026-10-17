import { useState, type ReactNode } from "react";
import { Fingerprint } from "lucide-react";
import SimulatorLayout from "../components/SimulatorLayout";
import ModuleHeader from "../components/ModuleHeader";
import ScenarioTabs from "../components/ScenarioTabs";
import SidePanel from "../components/SidePanel";
import { L, mk, pkt, layer, COLORS } from "../utils/packets";
import { cn } from "../utils/cn";
import type { SimStep, TopoEdge, TopoNode } from "../types";

type Sc = "arp" | "poison" | "spoof";

const MAC_A = "AA:AA:AA:AA:AA:01";
const MAC_GW = "00:1A:2B:3C:4D:99";
const MAC_EV = "EE:EE:EE:EE:EE:66";
const BC = "FF:FF:FF:FF:FF:FF";

const lanNodes: TopoNode[] = [
  { id: "a", label: "Victim PC", sublabel: "192.168.1.10", x: 14, y: 52, icon: "laptop" },
  { id: "gw", label: "Gateway", sublabel: "192.168.1.1", x: 86, y: 22, icon: "router" },
  { id: "ev", label: "Attacker", sublabel: "192.168.1.66", x: 86, y: 82, icon: "laptop" },
];
const lanEdges: TopoEdge[] = [
  { from: "a", to: "gw" },
  { from: "a", to: "ev" },
  { from: "gw", to: "ev", dashed: true },
];

const arpLayer = (op: string, fields: Array<[string, string]>) =>
  layer("arp", "Data Link — ARP", op, COLORS.eth, fields);

/* -------- normal ARP -------- */
const normal: SimStep[] = [
  mk({
    id: "need",
    title: "The PC knows the IP of the gateway, but needs its MAC",
    desc: "To send data on the LAN, a frame needs a destination MAC address. ARP (Address Resolution Protocol) maps IP → MAC. The PC's ARP cache is empty.",
    from: "a",
    nodes: ["a"],
    badge: "Need MAC",
    log: "[PC] Want to reach 192.168.1.1 — MAC unknown. ARP cache empty.",
  }),
  {
    ...mk({
      id: "request",
      title: "ARP REQUEST (broadcast): 'Who has 192.168.1.1?'",
      desc: "Sent to the broadcast MAC FF:FF:FF:FF:FF:FF, so every device on the LAN receives it. Only the owner of that IP will answer.",
      from: "a",
      to: "gw",
      badge: "Request",
      packet: pkt("ARP REQ", "#f59e0b", [
        L.eth(MAC_A, BC, "0x0806"),
        arpLayer("REQUEST", [["Sender", `192.168.1.10 / ${MAC_A}`], ["Target IP", "192.168.1.1"], ["Target MAC", "00:00:00:00:00:00 (?)"]]),
      ]),
      log: "[PC → *] ARP: Who has 192.168.1.1? Tell 192.168.1.10",
    }),
    activeNodes: ["a", "gw", "ev"],
    activeEdges: [["a", "gw"], ["a", "ev"]],
  },
  mk({
    id: "reply",
    title: "ARP REPLY (unicast): '192.168.1.1 is at 00:1A:2B:3C:4D:99'",
    desc: "The gateway answers directly to the PC with its MAC address.",
    from: "gw",
    to: "a",
    badge: "Reply",
    packet: pkt("ARP REPLY", "#22c55e", [
      L.eth(MAC_GW, MAC_A, "0x0806"),
      arpLayer("REPLY", [["Sender", `192.168.1.1 / ${MAC_GW}`], ["Target", `192.168.1.10 / ${MAC_A}`]]),
    ]),
    log: "[Gateway → PC] ARP reply: 192.168.1.1 is at 00:1A:2B:3C:4D:99",
  }),
  mk({
    id: "cache",
    title: "The PC caches the answer",
    desc: "The mapping is stored in the ARP cache (for a few minutes) so no more ARP is needed for this IP.",
    from: "a",
    nodes: ["a"],
    badge: "Cached",
    log: "[PC] ARP cache: 192.168.1.1 → 00:1A:2B:3C:4D:99",
  }),
  mk({
    id: "send",
    title: "Now the frame can be sent to the right device",
    desc: "The Ethernet frame carries the gateway's MAC; the IP packet inside carries the final destination (e.g. 8.8.8.8).",
    from: "a",
    to: "gw",
    badge: "Data",
    packet: pkt("DATA", "#38bdf8", [L.eth(MAC_A, MAC_GW), L.ip("192.168.1.10", "8.8.8.8")]),
    log: "[PC → Gateway] Frame to 00:1A:2B:3C:4D:99, IP dst 8.8.8.8.",
  }),
];

/* -------- poisoning -------- */
const poison: SimStep[] = [
  mk({
    id: "setup",
    title: "ARP has NO authentication",
    desc: "Any device may send an ARP reply — even if nobody asked — and receivers will usually believe it and overwrite their cache. Attackers exploit that.",
    from: "ev",
    nodes: ["a", "gw", "ev"],
    badge: "Setup",
    log: "[Network] PC cache: 192.168.1.1 → 00:1A:…:99 (correct).",
  }),
  mk({
    id: "lie-pc",
    title: "Attacker → PC: '192.168.1.1 is at EE:EE:EE:EE:EE:66'",
    desc: "A forged (gratuitous) ARP reply tells the victim that the gateway's IP belongs to the attacker's MAC.",
    from: "ev",
    to: "a",
    badge: "Spoofed ARP",
    packet: pkt("FAKE ARP", "#f43f5e", [
      L.eth(MAC_EV, MAC_A, "0x0806"),
      arpLayer("REPLY (forged)", [["Sender IP", "192.168.1.1 ← lie"], ["Sender MAC", `${MAC_EV} (attacker)`]]),
    ]),
    log: "[Attacker → PC] 192.168.1.1 is at EE:EE:EE:EE:EE:66 (forged)",
  }),
  mk({
    id: "lie-gw",
    title: "Attacker → Gateway: '192.168.1.10 is at EE:EE:EE:EE:EE:66'",
    desc: "The same trick in the other direction, so replies from the Internet also flow through the attacker.",
    from: "ev",
    to: "gw",
    badge: "Spoofed ARP",
    packet: pkt("FAKE ARP", "#f43f5e", [
      L.eth(MAC_EV, MAC_GW, "0x0806"),
      arpLayer("REPLY (forged)", [["Sender IP", "192.168.1.10 ← lie"], ["Sender MAC", `${MAC_EV} (attacker)`]]),
    ]),
    log: "[Attacker → Gateway] 192.168.1.10 is at EE:EE:EE:EE:EE:66 (forged)",
  }),
  mk({
    id: "victim-sends",
    title: "The victim sends its traffic to the 'gateway'… the attacker",
    desc: "The victim's cache now maps the gateway's IP to the attacker's MAC. Everything it sends to the Internet lands on the attacker's machine first.",
    from: "a",
    to: "ev",
    badge: "Intercepted",
    packet: pkt("HTTP DATA", "#f43f5e", [L.eth(MAC_A, MAC_EV), L.ip("192.168.1.10", "8.8.8.8"), L.app("Application", "DATA", [["Payload", "login: alice / pw: ••••"]])]),
    log: "[PC → Attacker] Frame to EE:…:66 (thinks it's the gateway).",
  }),
  mk({
    id: "forward",
    title: "The attacker reads (or edits) it, then forwards it on",
    desc: "By forwarding the traffic, the attacker stays invisible: the victim's Internet still works. This is a man-in-the-middle (MITM) attack. Unencrypted data (HTTP, FTP, Telnet) can be read directly.",
    from: "ev",
    to: "gw",
    badge: "MITM",
    packet: pkt("FORWARDED", "#f97316", [L.eth(MAC_EV, MAC_GW), L.ip("192.168.1.10", "8.8.8.8")]),
    log: "[Attacker → Gateway] Forwarded after sniffing. MITM complete.",
  }),
  mk({
    id: "defence",
    title: "Defences",
    desc: "Dynamic ARP Inspection (DAI) on switches, static ARP entries for critical hosts, port security, encrypted protocols (HTTPS/SSH/VPN) so intercepted data is useless, and ARP-spoof detection tools (e.g. arpwatch).",
    from: "gw",
    nodes: ["gw", "a"],
    badge: "Defence",
    log: "[Switch] DAI: ARP reply violates DHCP-snooping binding → dropped.",
  }),
];

const GOOD = "192.168.1.1 → 00:1A:2B:3C:4D:99 (correct)";
const BAD = "192.168.1.1 → EE:EE:EE:EE:EE:66  ⚠ POISONED";
const caches: string[][] = [[GOOD], [BAD], [BAD], [BAD], [BAD], [BAD]];
const normalCaches: string[][] = [[], [], [], ["192.168.1.1 → 00:1A:2B:3C:4D:99"], ["192.168.1.1 → 00:1A:2B:3C:4D:99"], ["192.168.1.1 → 00:1A:2B:3C:4D:99"]];

/* -------- MAC spoofing -------- */
const spoofNodes: TopoNode[] = [
  { id: "a", label: "Allowed laptop", sublabel: MAC_A, x: 14, y: 25, icon: "laptop" },
  { id: "ap", label: "Wi-Fi / Switch", sublabel: "MAC filter: only AA:…:01", x: 52, y: 50, icon: "wifi" },
  { id: "ev", label: "Attacker", sublabel: "real MAC EE:…:66", x: 14, y: 80, icon: "laptop" },
  { id: "net", label: "Internal network", x: 88, y: 50, icon: "cloud" },
];
const spoofEdges: TopoEdge[] = [
  { from: "a", to: "ap" },
  { from: "ev", to: "ap", dashed: true },
  { from: "ap", to: "net" },
];
const spoof: SimStep[] = [
  mk({
    id: "filter",
    title: "The network only allows known MAC addresses",
    desc: "MAC filtering is a weak 'security' feature: the access point keeps an allow-list of MAC addresses.",
    from: "ap",
    nodes: ["ap", "a"],
    badge: "MAC filter",
    log: "[AP] Allow-list: AA:AA:AA:AA:AA:01",
  }),
  mk({
    id: "legit",
    title: "The allowed laptop connects normally",
    desc: "MAC address is in the allow-list → access granted.",
    from: "a",
    to: "ap",
    badge: "Allowed",
    packet: pkt("FRAME", "#22c55e", [L.eth(MAC_A, "00:1A:2B:3C:4D:00")]),
    log: "[AP] AA:…:01 is on the list → ALLOW.",
  }),
  mk({
    id: "blocked",
    title: "The attacker tries to connect with his real MAC",
    desc: "EE:…:66 is not on the list → the access point refuses it.",
    from: "ev",
    to: "ap",
    badge: "Blocked",
    packet: pkt("FRAME", "#f43f5e", [L.eth(MAC_EV, "00:1A:2B:3C:4D:00")]),
    log: "[AP] EE:…:66 not on the list → DENY.",
  }),
  mk({
    id: "sniff",
    title: "The attacker sniffs the allowed MAC from the air",
    desc: "MAC addresses are sent in clear text in every frame — even on encrypted Wi-Fi the header is visible. The attacker simply watches the traffic and copies a valid address.",
    from: "a",
    to: "ap",
    nodes: ["a", "ap", "ev"],
    badge: "Sniffing",
    packet: pkt("FRAME (seen)", "#f97316", [L.eth(MAC_A, "00:1A:2B:3C:4D:00")]),
    log: "[Attacker] Captured source MAC AA:AA:AA:AA:AA:01 from the air.",
  }),
  mk({
    id: "change",
    title: "The attacker changes his own MAC address to the copied one",
    desc: "On Linux: 'ip link set dev wlan0 address AA:AA:AA:AA:AA:01'. Operating systems let you set any MAC — it is only software.",
    from: "ev",
    nodes: ["ev"],
    badge: "Spoof",
    log: "[Attacker] wlan0 MAC changed to AA:AA:AA:AA:AA:01.",
  }),
  mk({
    id: "access",
    title: "Access granted — the attacker is now 'the laptop'",
    desc: "The access point cannot tell the two devices apart. The attacker is on the internal network. (If both are online, the switch sees the same MAC on two ports and keeps flapping.)",
    from: "ev",
    to: "ap",
    badge: "Bypassed",
    packet: pkt("FRAME", "#f43f5e", [L.eth(MAC_A + " (spoofed)", "00:1A:2B:3C:4D:00")]),
    log: "[AP] AA:…:01 is on the list → ALLOW. (it's the attacker!)",
  }),
  mk({
    id: "defence",
    title: "Defence",
    desc: "Never rely on MAC filtering alone. Use WPA2/WPA3-Enterprise (802.1X) authentication, port security with sticky MACs, and monitor for duplicate MACs / MAC flapping.",
    from: "ap",
    nodes: ["ap", "net"],
    badge: "Defence",
    log: "[Switch] Alert: MAC AA:…:01 seen on 2 ports (flapping).",
  }),
];

const STEPS: Record<Sc, SimStep[]> = { arp: normal, poison, spoof };

export default function ArpLab() {
  const [sc, setSc] = useState<Sc>("arp");
  const isSpoof = sc === "spoof";

  const side = (index: number): ReactNode => {
    if (sc === "spoof") {
      return (
        <SidePanel title="Key idea">
          <p>
            A MAC address is burned into the network card by the manufacturer, but the operating
            system can <b className="text-slate-200">override it in software</b>. It identifies a
            device — it does not authenticate it.
          </p>
        </SidePanel>
      );
    }
    const list = sc === "arp" ? normalCaches[index] ?? [] : caches[index] ?? [];
    const bad = sc === "poison" && index >= 1;
    return (
      <SidePanel title="Victim's ARP cache">
        {list.length === 0 ? (
          <p className="text-slate-600">(empty)</p>
        ) : (
          list.map((l) => (
            <p key={l} className={cn("rounded-lg border px-2 py-1.5 font-mono text-[11px]", bad ? "border-rose-500/50 bg-rose-500/10 text-rose-300" : "border-slate-800 bg-slate-950/60 text-emerald-300")}>
              {l}
            </p>
          ))
        )}
        <p className="mt-2 text-slate-500">Tip: run <span className="font-mono text-slate-300">arp -a</span> to view your own cache.</p>
      </SidePanel>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <ModuleHeader
        icon={Fingerprint}
        color="red"
        title="ARP & MAC Spoofing"
        subtitle="How IPs are mapped to MAC addresses on a LAN — and how attackers poison that mapping."
      />
      <SimulatorLayout
        nodes={isSpoof ? spoofNodes : lanNodes}
        edges={isSpoof ? spoofEdges : lanEdges}
        steps={STEPS[sc]}
        resetKey={`arp-${sc}`}
        topologyHeight={320}
        topBar={
          <ScenarioTabs
            label="Scenario"
            value={sc}
            onChange={setSc}
            options={[
              { id: "arp", label: "ARP request / reply" },
              { id: "poison", label: "ARP poisoning (MITM)" },
              { id: "spoof", label: "MAC spoofing" },
            ]}
          />
        }
        sideExtra={({ index }) => side(index)}
      />
    </div>
  );
}
