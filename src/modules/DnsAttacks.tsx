import { useMemo, useState, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import SimulatorLayout from "../components/SimulatorLayout";
import ModuleHeader from "../components/ModuleHeader";
import ScenarioTabs from "../components/ScenarioTabs";
import SidePanel from "../components/SidePanel";
import { L, mk, pkt, layer, COLORS } from "../utils/packets";
import { cn } from "../utils/cn";
import type { SimStep, TopoEdge, TopoNode } from "../types";

type Sc = "poison" | "tunnel";

const dnsLayer = (name: string, fields: Array<[string, string]>, color: string = COLORS.app) =>
  layer("dns", "Application — DNS", name, color, fields);

/* ---------- poisoning ---------- */
const pNodes: TopoNode[] = [
  { id: "victim", label: "Victim", sublabel: "192.168.1.10", x: 10, y: 50, icon: "laptop" },
  { id: "res", label: "DNS Resolver", sublabel: "caches answers", x: 42, y: 50, icon: "dns" },
  { id: "auth", label: "Authoritative NS", sublabel: "bank.example → 203.0.113.80", x: 88, y: 20, icon: "server" },
  { id: "evil", label: "Attacker", sublabel: "198.51.100.66", x: 88, y: 82, icon: "laptop" },
];
const pEdges: TopoEdge[] = [
  { from: "victim", to: "res" },
  { from: "res", to: "auth" },
  { from: "evil", to: "res", dashed: true },
];
const pCache = [
  "(empty)",
  "(empty)",
  "(empty)",
  "(empty)",
  "bank.example → 198.51.100.66  ⚠ FORGED",
  "bank.example → 198.51.100.66  ⚠ FORGED",
  "bank.example → 198.51.100.66  ⚠ FORGED",
  "bank.example → 198.51.100.66  ⚠ FORGED",
];
const pSteps: SimStep[] = [
  mk({
    id: "ask",
    title: "A user asks the resolver for bank.example",
    desc: "The resolver's cache is empty, so it must ask the real authoritative name server. It sends a query with a random 16-bit Transaction ID (TXID).",
    from: "victim",
    to: "res",
    badge: "Query",
    packet: pkt("DNS QUERY", "#38bdf8", [L.udp("53211", "53"), dnsLayer("QUERY", [["Name", "bank.example"], ["Type", "A"]])]),
    log: "[Victim → Resolver] A? bank.example",
  }),
  mk({
    id: "resolver-asks",
    title: "Resolver asks the authoritative server",
    desc: "The query uses TXID 0x4F2A (secret) and a source port. A response is only accepted if it matches these values.",
    from: "res",
    to: "auth",
    badge: "Recursive query",
    packet: pkt("DNS QUERY", "#38bdf8", [L.udp("33333", "53"), dnsLayer("QUERY", [["Name", "bank.example"], ["TXID", "0x4F2A"]])]),
    log: "[Resolver → Auth] A? bank.example (TXID 0x4F2A, src port 33333)",
  }),
  mk({
    id: "flood",
    title: "The attacker floods the resolver with forged answers",
    desc: "The attacker doesn't know the TXID, so he sends thousands of fake responses with different guesses, pretending to come from the real name server.",
    from: "evil",
    to: "res",
    badge: "Flood",
    packet: pkt("FORGED REPLY", "#f43f5e", [L.udp("53", "33333"), dnsLayer("RESPONSE (forged)", [["Name", "bank.example"], ["Answer", "198.51.100.66"], ["TXID", "guess…"]], COLORS.danger)]),
    log: "[Attacker → Resolver] 5,000 forged replies (TXID guesses 0x0000–0x1387)…",
  }),
  mk({
    id: "race",
    title: "A forged packet matches the TXID — and arrives before the real one",
    desc: "With only 65,536 possible TXIDs (and a predictable source port), the attacker wins the race. The resolver accepts the fake answer and ignores the real one later.",
    from: "evil",
    to: "res",
    badge: "Race won",
    packet: pkt("FORGED REPLY", "#f43f5e", [L.udp("53", "33333"), dnsLayer("RESPONSE (forged)", [["Answer", "198.51.100.66"], ["TXID", "0x4F2A ✔ match"]], COLORS.danger)]),
    log: "[Resolver] Forged reply TXID 0x4F2A matches → accepted!",
  }),
  mk({
    id: "cache",
    title: "The resolver CACHES the poisoned record",
    desc: "Every user of this resolver will now get the attacker's IP for bank.example until the TTL expires — maybe hours.",
    from: "res",
    nodes: ["res"],
    badge: "Poisoned",
    log: "[Resolver] Cache: bank.example → 198.51.100.66 (TTL 3600 s).",
  }),
  mk({
    id: "victim-gets",
    title: "The victim receives the wrong IP address",
    desc: "The resolver answers from its poisoned cache.",
    from: "res",
    to: "victim",
    badge: "Bad answer",
    packet: pkt("DNS ANSWER", "#f43f5e", [L.udp("53", "53211"), dnsLayer("RESPONSE", [["bank.example", "198.51.100.66"], ["TTL", "3600"]], COLORS.danger)]),
    log: "[Resolver → Victim] bank.example = 198.51.100.66 (attacker!)",
  }),
  mk({
    id: "fake-site",
    title: "The victim connects to a fake bank site",
    desc: "The URL in the address bar looks perfectly right. The attacker serves a copy of the login page and steals the credentials.",
    from: "victim",
    to: "evil",
    badge: "Phishing",
    packet: pkt("HTTP POST", "#f43f5e", [L.ip("192.168.1.10", "198.51.100.66"), L.app("Application — HTTP", "POST", [["Path", "/login"], ["Body", "user=alice&pw=•••"]])]),
    log: "[Victim → Attacker] credentials sent to the fake site.",
  }),
  mk({
    id: "defence",
    title: "Defences",
    desc: "DNSSEC (digitally signed records), randomised source ports + TXIDs, 0x20 case randomisation, short cache lifetimes, patched resolvers — and HTTPS certificate warnings, which a fake site cannot satisfy.",
    from: "auth",
    nodes: ["auth", "res"],
    badge: "Defence",
    log: "[Resolver] DNSSEC validation failed for forged answer → discarded.",
  }),
];

/* ---------- tunnelling ---------- */
const tNodes: TopoNode[] = [
  { id: "mal", label: "Infected host", sublabel: "malware inside", x: 10, y: 50, icon: "pc" },
  { id: "fw", label: "Firewall", sublabel: "allows DNS (UDP 53)", x: 36, y: 50, icon: "firewall" },
  { id: "res", label: "Corporate resolver", x: 62, y: 50, icon: "dns" },
  { id: "c2", label: "Attacker NS", sublabel: "evil-ns.com", x: 90, y: 50, icon: "server" },
];
const tEdges: TopoEdge[] = [
  { from: "mal", to: "fw" },
  { from: "fw", to: "res" },
  { from: "res", to: "c2", label: "Internet" },
];

function hex(s: string) {
  return Array.from(s)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
}

function buildTunnel(secret: string): { steps: SimStep[]; queries: string[] } {
  const hx = hex(secret.slice(0, 18) || "secret");
  const chunks: string[] = [];
  for (let i = 0; i < hx.length; i += 12) chunks.push(hx.slice(i, i + 12));
  const queries = chunks.map((c, i) => `${c}.${i + 1}.evil-ns.com`);
  const steps: SimStep[] = [
    mk({
      id: "why",
      title: "Most firewalls allow DNS — so attackers hide data in it",
      desc: "Normal outbound connections to the attacker are blocked, but DNS must work. DNS tunnelling turns the DNS protocol into a covert channel for data theft or remote control (C2).",
      from: "mal",
      nodes: ["mal", "fw"],
      badge: "Idea",
      log: "[Malware] Direct Internet access blocked. DNS allowed → use DNS.",
    }),
    mk({
      id: "encode",
      title: "The malware encodes stolen data as a subdomain",
      desc: `The secret "${secret.slice(0, 18) || "secret"}" is converted to hex (real tools use Base32/Base64) and cut into chunks of ≤ 12 characters, because DNS labels are limited to 63 characters.`,
      from: "mal",
      badge: "Encode",
      log: `[Malware] "${secret.slice(0, 18)}" → ${chunks.join(" | ")}`,
    }),
  ];
  queries.forEach((q, i) => {
    steps.push(
      mk({
        id: `q${i}`,
        title: `Query ${i + 1}: ${q}`,
        desc: "To the firewall this looks like a normal DNS lookup for some strange hostname. It is forwarded to the corporate resolver.",
        from: i === 0 ? "mal" : "mal",
        to: "fw",
        badge: `Query ${i + 1}`,
        packet: pkt("DNS QUERY", "#f97316", [L.udp("49822", "53"), dnsLayer("QUERY", [["Name", q], ["Type", "TXT"]], COLORS.warn)]),
        log: `[Malware → DNS] TXT? ${q}`,
      })
    );
    steps.push(
      mk({
        id: `r${i}`,
        title: `The query travels to the attacker's name server`,
        desc: "The resolver has no cache entry for this unique name, so it recurses all the way to the authoritative server for evil-ns.com — which the attacker controls.",
        from: "res",
        to: "c2",
        badge: "Exfiltrate",
        packet: pkt("DNS QUERY", "#f97316", [L.udp("41234", "53"), dnsLayer("QUERY", [["Name", q]], COLORS.warn)]),
        log: `[Resolver → evil-ns.com] ${q} — attacker decodes chunk ${i + 1}.`,
      })
    );
  });
  steps.push(
    mk({
      id: "cmd",
      title: "The attacker answers with a command hidden in a TXT record",
      desc: "The reply is a normal-looking DNS response whose TXT record contains base64-encoded instructions. Two-way communication over DNS!",
      from: "c2",
      to: "res",
      badge: "C2 reply",
      packet: pkt("DNS RESPONSE", "#f43f5e", [L.udp("53", "41234"), dnsLayer("RESPONSE", [["Type", "TXT"], ["Data", "cnVuOiB3aG9hbWk= (command)"]], COLORS.danger)]),
      log: "[evil-ns.com → Resolver] TXT = Y21kOi... (command for malware)",
    }),
    mk({
      id: "detect",
      title: "How defenders detect it",
      desc: "Look for very long or high-entropy subdomains, huge numbers of unique queries to one domain, TXT/NULL record abuse, and DNS traffic from hosts that shouldn't make many lookups. Block with DNS security / filtering and monitor query logs.",
      from: "res",
      nodes: ["res", "fw"],
      badge: "Detect",
      log: "[SIEM] Alert: 200+ unique subdomains of evil-ns.com from one host in 1 minute.",
    })
  );
  return { steps, queries };
}

export default function DnsAttacks() {
  const [sc, setSc] = useState<Sc>("poison");
  const [secret, setSecret] = useState("password=hunter2");
  const [applied, setApplied] = useState("password=hunter2");
  const tunnel = useMemo(() => buildTunnel(applied), [applied]);

  const steps = sc === "poison" ? pSteps : tunnel.steps;

  const side = (index: number): ReactNode => {
    if (sc === "poison") {
      const c = pCache[index] ?? pCache[pCache.length - 1];
      const bad = c.includes("FORGED");
      return (
        <SidePanel title="Resolver cache">
          <p className={cn("rounded-lg border px-2 py-1.5 font-mono text-[11px]", bad ? "border-rose-500/50 bg-rose-500/10 text-rose-300" : "border-slate-800 bg-slate-950/60 text-slate-400")}>
            {c}
          </p>
          <p className="mt-2 text-slate-500">
            A response is accepted only if its TXID, port and question match — a 16-bit TXID has just 65,536 values.
          </p>
        </SidePanel>
      );
    }
    return (
      <SidePanel title="DNS queries seen by the attacker">
        <div className="space-y-1">
          {tunnel.queries.map((q, i) => (
            <p key={q} className={cn("break-all rounded border border-slate-800 bg-slate-950/60 px-2 py-1 font-mono text-[10px]", index >= 3 + i * 2 ? "text-orange-300" : "text-slate-600")}>
              {q}
            </p>
          ))}
        </div>
        <p className="mt-2 text-slate-500">Telltale signs: long random-looking labels, many unique subdomains, TXT queries.</p>
      </SidePanel>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <ModuleHeader
        icon={ShieldAlert}
        color="rose"
        title="DNS Poisoning & DNS Tunnelling"
        subtitle="Two classic attacks on the Internet's phone book."
      />
      <SimulatorLayout
        nodes={sc === "poison" ? pNodes : tNodes}
        edges={sc === "poison" ? pEdges : tEdges}
        steps={steps}
        resetKey={`dnsatk-${sc}-${applied}`}
        topologyHeight={320}
        topBar={
          <div className="flex flex-col gap-3">
            <ScenarioTabs
              label="Attack"
              value={sc}
              onChange={setSc}
              options={[
                { id: "poison", label: "DNS cache poisoning" },
                { id: "tunnel", label: "DNS tunnelling" },
              ]}
            />
            {sc === "tunnel" && (
              <form
                className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  setApplied(secret.trim() || "secret");
                }}
              >
                <div className="min-w-[200px] flex-1">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
                    Secret data to steal (max 18 chars)
                  </label>
                  <input
                    value={secret}
                    maxLength={18}
                    onChange={(e) => setSecret(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 font-mono text-sm text-slate-200 outline-none focus:border-cyan-400"
                  />
                </div>
                <button className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400">Encode &amp; run</button>
              </form>
            )}
          </div>
        }
        sideExtra={({ index }) => side(index)}
      />
    </div>
  );
}
