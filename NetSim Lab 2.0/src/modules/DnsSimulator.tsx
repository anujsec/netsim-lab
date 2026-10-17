import { useMemo, useState } from "react";
import { Globe2 } from "lucide-react";
import SimulatorLayout from "../components/SimulatorLayout";
import type { SimStep, TopoEdge, TopoNode } from "../types";

const nodes: TopoNode[] = [
  { id: "client", label: "Your PC", sublabel: "192.168.1.10", x: 10, y: 80, icon: "pc" },
  { id: "resolver", label: "Recursive Resolver", sublabel: "ISP DNS 8.8.8.8", x: 34, y: 50, icon: "dns" },
  { id: "root", label: "Root Server", sublabel: '"." zone', x: 58, y: 14, icon: "dns" },
  { id: "tld", label: "TLD Server", sublabel: '".com" zone', x: 80, y: 40, icon: "dns" },
  { id: "auth", label: "Authoritative NS", sublabel: "owns the domain", x: 88, y: 80, icon: "dns" },
];

const edges: TopoEdge[] = [
  { from: "client", to: "resolver" },
  { from: "resolver", to: "root" },
  { from: "resolver", to: "tld" },
  { from: "resolver", to: "auth" },
];

function hashIp(domain: string) {
  let h = 0;
  for (let i = 0; i < domain.length; i++) h = (h * 31 + domain.charCodeAt(i)) >>> 0;
  const a = 90 + (h % 40);
  const b = (h >> 4) % 256;
  const c = (h >> 9) % 256;
  const d = 10 + ((h >> 13) % 240);
  return `${a}.${b}.${c}.${d}`;
}

const dnsLayer = (fields: { label: string; value: string }[], short: string) => [
  {
    key: "dns",
    name: "Application — DNS",
    short,
    color: "#22d3ee",
    fields,
  },
  {
    key: "udp",
    name: "Transport — UDP",
    short: "Port 53",
    color: "#8b5cf6",
    fields: [
      { label: "Src Port", value: "53211" },
      { label: "Dst Port", value: "53" },
    ],
  },
];

function buildSteps(domain: string): SimStep[] {
  const ip = hashIp(domain);
  const id = Math.floor(1000 + Math.random() * 8999);

  return [
    {
      id: "cache-check",
      title: "Browser checks its local DNS cache",
      description: `Before asking anyone, your OS checks if it already knows the IP for "${domain}". Cache miss — time to ask the network!`,
      from: "client",
      to: "client",
      activeNodes: ["client"],
      badge: "Step 1",
      packet: { label: "CACHE", color: "#64748b", layers: [{ key: "cache", name: "Local Cache Lookup", short: "MISS", color: "#64748b", fields: [{ label: "Domain", value: domain }, { label: "Result", value: "Not cached" }] }] },
      log: `[Client] Local DNS cache miss for ${domain}.`,
      duration: 900,
    },
    {
      id: "to-resolver",
      title: "Query sent to the recursive resolver",
      description: "Your PC sends a DNS query (usually UDP port 53) to the resolver configured by your ISP or router (e.g. 8.8.8.8).",
      from: "client",
      to: "resolver",
      activeNodes: ["client", "resolver"],
      activeEdges: [["client", "resolver"]],
      badge: "Step 2",
      packet: { label: "QUERY", color: "#22d3ee", layers: dnsLayer([
        { label: "Transaction ID", value: `0x${id.toString(16)}` },
        { label: "Query", value: `${domain} A?` },
        { label: "Recursion Desired", value: "1" },
      ], "QUERY") },
      log: `[Client → Resolver] Standard query: ${domain}, type A, id=0x${id.toString(16)}.`,
      duration: 1100,
    },
    {
      id: "resolver-cache",
      title: "Resolver checks its own cache",
      description: "The recursive resolver also keeps a cache. If no one has asked for this domain recently, it must start the full resolution process from the root.",
      from: "resolver",
      to: "resolver",
      activeNodes: ["resolver"],
      badge: "Step 3",
      packet: { label: "CACHE", color: "#64748b", layers: [{ key: "cache", name: "Resolver Cache Lookup", short: "MISS", color: "#64748b", fields: [{ label: "Domain", value: domain }, { label: "Result", value: "Not cached, resolving…" }] }] },
      log: "[Resolver] Cache miss — beginning iterative resolution.",
      duration: 900,
    },
    {
      id: "to-root",
      title: 'Resolver asks a Root Server: "Who handles .com?"',
      description: "There are 13 logical root server clusters worldwide. They don't know the final IP, but know which servers manage each top-level domain (TLD).",
      from: "resolver",
      to: "root",
      activeNodes: ["resolver", "root"],
      activeEdges: [["resolver", "root"]],
      badge: "Step 4",
      packet: { label: "QUERY", color: "#22d3ee", layers: dnsLayer([{ label: "Query", value: `${domain} A?` }], "QUERY") },
      log: `[Resolver → Root] Query: "${domain}"?`,
      duration: 1100,
    },
    {
      id: "root-reply",
      title: "Root server refers the resolver to the TLD servers",
      description: `The root server replies: "I don't know the IP, but here's the address of the servers responsible for .${domain.split(".").pop()}."`,
      from: "root",
      to: "resolver",
      activeNodes: ["root", "resolver"],
      activeEdges: [["root", "resolver"]],
      badge: "Step 5",
      packet: { label: "REFERRAL", color: "#a3e635", layers: dnsLayer([{ label: "Answer", value: `Referral → .${domain.split(".").pop()} TLD servers` }], "REFERRAL") },
      log: `[Root → Resolver] Referral: ask the .${domain.split(".").pop()} TLD servers.`,
      duration: 1100,
    },
    {
      id: "to-tld",
      title: `Resolver asks the TLD Server: "Who handles ${domain}?"`,
      description: "The TLD server manages all domains under its extension (e.g. .com, .org) and knows which authoritative name servers are responsible for this specific domain.",
      from: "resolver",
      to: "tld",
      activeNodes: ["resolver", "tld"],
      activeEdges: [["resolver", "tld"]],
      badge: "Step 6",
      packet: { label: "QUERY", color: "#22d3ee", layers: dnsLayer([{ label: "Query", value: `${domain} A?` }], "QUERY") },
      log: `[Resolver → TLD] Query: "${domain}"?`,
      duration: 1100,
    },
    {
      id: "tld-reply",
      title: "TLD server refers the resolver to the Authoritative Name Server",
      description: `The TLD server replies with the authoritative name servers for "${domain}" — the ones with the final answer.`,
      from: "tld",
      to: "resolver",
      activeNodes: ["tld", "resolver"],
      activeEdges: [["tld", "resolver"]],
      badge: "Step 7",
      packet: { label: "REFERRAL", color: "#a3e635", layers: dnsLayer([{ label: "Answer", value: `Referral → ns1.${domain}` }], "REFERRAL") },
      log: `[TLD → Resolver] Referral: ask ns1.${domain}.`,
      duration: 1100,
    },
    {
      id: "to-auth",
      title: "Resolver asks the Authoritative Name Server for the final answer",
      description: "This server actually owns the DNS records for the domain (configured by its admin / hosting provider), so it can answer definitively.",
      from: "resolver",
      to: "auth",
      activeNodes: ["resolver", "auth"],
      activeEdges: [["resolver", "auth"]],
      badge: "Step 8",
      packet: { label: "QUERY", color: "#22d3ee", layers: dnsLayer([{ label: "Query", value: `${domain} A?` }], "QUERY") },
      log: `[Resolver → Authoritative NS] Query: "${domain}"?`,
      duration: 1100,
    },
    {
      id: "auth-reply",
      title: "Authoritative server returns the IP address (A record)",
      description: `Finally! The authoritative server responds with the actual IP address for ${domain}.`,
      from: "auth",
      to: "resolver",
      activeNodes: ["auth", "resolver"],
      activeEdges: [["auth", "resolver"]],
      badge: "Step 9",
      packet: { label: "ANSWER", color: "#22c55e", layers: dnsLayer([{ label: "Answer", value: `${domain} A ${ip}` }, { label: "TTL", value: "3600s" }], "ANSWER") },
      log: `[Auth → Resolver] Answer: ${domain} = ${ip} (TTL 3600s).`,
      duration: 1100,
    },
    {
      id: "back-to-client",
      title: "Resolver caches the result and replies to your PC",
      description: "The resolver stores this answer in its cache (for the TTL duration) so future queries are instant, then forwards the final IP to your computer.",
      from: "resolver",
      to: "client",
      activeNodes: ["resolver", "client"],
      activeEdges: [["resolver", "client"]],
      badge: "Step 10",
      packet: { label: "ANSWER", color: "#22c55e", layers: dnsLayer([{ label: "Answer", value: `${domain} A ${ip}` }], "ANSWER") },
      log: `[Resolver → Client] Final answer: ${domain} = ${ip}.`,
      duration: 1100,
    },
    {
      id: "resolved",
      title: "Resolved! Your browser can now connect",
      description: `Your PC caches ${domain} → ${ip} locally and immediately starts a TCP connection to that IP (often followed by a TLS handshake and HTTP request).`,
      from: "client",
      to: "client",
      activeNodes: ["client"],
      badge: "Done",
      packet: { label: "READY", color: "#22c55e", layers: [{ key: "ready", name: "Resolved Address", short: "A", color: "#22c55e", fields: [{ label: "Domain", value: domain }, { label: "IP Address", value: ip }] }] },
      log: `[Client] Cached ${domain} → ${ip}. Ready to connect!`,
      duration: 900,
    },
  ];
}

export default function DnsSimulator() {
  const [domain, setDomain] = useState("www.example.com");
  const [committed, setCommitted] = useState("www.example.com");
  const steps = useMemo(() => buildSteps(committed), [committed]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
          <Globe2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-100">DNS Resolution Journey</h2>
          <p className="text-sm text-slate-500">
            Watch the full recursive DNS lookup: Root → TLD → Authoritative server.
          </p>
        </div>
      </div>
      <SimulatorLayout
        nodes={nodes}
        edges={edges}
        steps={steps}
        resetKey={committed}
        topBar={
          <form
            className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              setCommitted(domain.trim() || "www.example.com");
            }}
          >
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                Domain name to resolve
              </label>
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-400"
                placeholder="e.g. www.example.com"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400"
            >
              Resolve
            </button>
          </form>
        }
        sideExtra={
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">
              Why DNS matters
            </h4>
            <p>
              DNS is the internet's phonebook — it translates human-friendly domain names into
              numeric IP addresses that routers actually use to deliver packets. Without it, you'd
              have to memorize IPs for every website!
            </p>
          </div>
        }
      />
    </div>
  );
}
