import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import SimulatorLayout from "../components/SimulatorLayout";
import type { PacketLayer, SimStep, TopoEdge, TopoNode } from "../types";

const nodes: TopoNode[] = [
  { id: "client", label: "Browser", sublabel: "192.168.1.10", x: 7, y: 75, icon: "pc" },
  { id: "router", label: "Home Router", sublabel: "Gateway", x: 27, y: 75, icon: "router" },
  { id: "cloud", label: "Internet", sublabel: "many ISPs & routers", x: 52, y: 42, icon: "cloud" },
  { id: "dns", label: "DNS Server", sublabel: "resolves names", x: 60, y: 10, icon: "dns" },
  { id: "server", label: "Web Server", sublabel: "93.184.216.34", x: 92, y: 75, icon: "server" },
];

const edges: TopoEdge[] = [
  { from: "client", to: "router" },
  { from: "router", to: "cloud" },
  { from: "cloud", to: "dns" },
  { from: "cloud", to: "server" },
];

const FULL_PATH: Array<[string, string]> = [
  ["client", "router"],
  ["router", "cloud"],
  ["cloud", "server"],
];
const DNS_PATH: Array<[string, string]> = [
  ["client", "router"],
  ["router", "cloud"],
  ["cloud", "dns"],
];

function ipLayer(src: string, dst: string, ttl: number): PacketLayer {
  return {
    key: "ip",
    name: "Network — IP",
    short: "IPv4",
    color: "#3b82f6",
    fields: [
      { label: "Src IP", value: src },
      { label: "Dst IP", value: dst },
      { label: "TTL", value: String(ttl) },
      { label: "Protocol", value: "TCP (6)" },
    ],
  };
}

function hopSteps(opts: {
  idPrefix: string;
  path: Array<[string, string]>;
  badge: string;
  titleFn: (hop: number, total: number) => string;
  description: string;
  packetLabel: string;
  color: string;
  srcIp: string;
  dstIp: string;
  startTtl: number;
  extraLayers: PacketLayer[];
  logFn: (from: string, to: string, ttl: number) => string;
}): SimStep[] {
  return opts.path.map(([from, to], i) => ({
    id: `${opts.idPrefix}-${i}`,
    title: opts.titleFn(i + 1, opts.path.length),
    description: opts.description,
    from,
    to,
    activeNodes: [from, to],
    activeEdges: [[from, to]],
    badge: `${opts.badge} (hop ${i + 1}/${opts.path.length})`,
    packet: {
      label: opts.packetLabel,
      color: opts.color,
      layers: [...opts.extraLayers, ipLayer(opts.srcIp, opts.dstIp, opts.startTtl - i)],
    },
    log: opts.logFn(from, to, opts.startTtl - i),
    duration: 900,
  }));
}

function buildSteps(url: string): SimStep[] {
  let host = "www.example.com";
  let path = "/";
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    host = u.hostname;
    path = u.pathname || "/";
  } catch {
    // keep defaults
  }
  const clientIp = "192.168.1.10";
  const serverIp = "93.184.216.34";

  const steps: SimStep[] = [];

  steps.push({
    id: "parse",
    title: "Browser parses the URL",
    description: `The browser breaks the URL apart: scheme=https, host=${host}, path=${path}. It needs an IP address for "${host}" before it can connect to anything.`,
    from: "client",
    to: "client",
    activeNodes: ["client"],
    badge: "1. Parse URL",
    packet: null,
    log: `[Browser] Parsed URL → host=${host}, path=${path}, port=443.`,
    duration: 800,
  });

  steps.push(
    ...hopSteps({
      idPrefix: "dnsq",
      path: DNS_PATH,
      badge: "DNS Query",
      titleFn: () => `DNS query travels toward the resolver`,
      description: `Your router doesn't know "${host}" either, so the query is forwarded across the internet to a DNS server that can resolve it.`,
      packetLabel: "DNS?",
      color: "#22d3ee",
      srcIp: clientIp,
      dstIp: "8.8.8.8",
      startTtl: 64,
      extraLayers: [
        { key: "dns", name: "Application — DNS", short: "Query", color: "#22d3ee", fields: [{ label: "Query", value: `${host} A?` }] },
      ],
      logFn: (from, to) => `[${from} → ${to}] Forwarding DNS query for ${host}.`,
    })
  );

  steps.push({
    id: "dns-reply",
    title: "DNS server replies with an IP address",
    description: `The DNS server (after possibly consulting root/TLD/authoritative servers — see the DNS module!) responds with the IP address for "${host}": ${serverIp}.`,
    from: "dns",
    to: "client",
    activeNodes: ["dns", "client"],
    activeEdges: [["cloud", "dns"], ["router", "cloud"], ["client", "router"]],
    badge: "DNS Answer",
    packet: {
      label: "DNS IP",
      color: "#22c55e",
      layers: [{ key: "dns", name: "Application — DNS", short: "Answer", color: "#22c55e", fields: [{ label: "Answer", value: `${host} A ${serverIp}` }] }],
    },
    log: `[DNS → Browser] ${host} resolves to ${serverIp}.`,
    duration: 1300,
  });

  steps.push({
    id: "tcp-syn",
    title: "TCP handshake — SYN",
    description: `The browser opens a TCP connection to ${serverIp}:443 by sending a SYN packet (see the TCP module for full detail).`,
    from: "client",
    to: "server",
    activeNodes: ["client", "server"],
    activeEdges: FULL_PATH,
    badge: "TCP 1/3",
    packet: { label: "SYN", color: "#38bdf8", layers: [{ key: "tcp", name: "Transport — TCP", short: "SYN", color: "#38bdf8", fields: [{ label: "Flags", value: "SYN" }, { label: "Seq", value: "1000" }] }, ipLayer(clientIp, serverIp, 64)] },
    log: `[Browser → Server] TCP SYN to ${serverIp}:443.`,
    duration: 1300,
  });

  steps.push({
    id: "tcp-synack",
    title: "TCP handshake — SYN-ACK",
    description: "The server acknowledges and replies with its own SYN, agreeing to open the connection.",
    from: "server",
    to: "client",
    activeNodes: ["server", "client"],
    activeEdges: FULL_PATH,
    badge: "TCP 2/3",
    packet: { label: "SYN-ACK", color: "#a855f7", layers: [{ key: "tcp", name: "Transport — TCP", short: "SYN-ACK", color: "#a855f7", fields: [{ label: "Flags", value: "SYN, ACK" }, { label: "Seq", value: "5000" }, { label: "Ack", value: "1001" }] }, ipLayer(serverIp, clientIp, 58)] },
    log: `[Server → Browser] TCP SYN-ACK.`,
    duration: 1300,
  });

  steps.push({
    id: "tcp-ack",
    title: "TCP handshake — ACK (connection established)",
    description: "The browser sends the final ACK. A reliable, ordered TCP connection now exists between browser and server.",
    from: "client",
    to: "server",
    activeNodes: ["client", "server"],
    activeEdges: FULL_PATH,
    badge: "TCP 3/3",
    packet: { label: "ACK", color: "#38bdf8", layers: [{ key: "tcp", name: "Transport — TCP", short: "ACK", color: "#38bdf8", fields: [{ label: "Flags", value: "ACK" }] }, ipLayer(clientIp, serverIp, 64)] },
    log: `[Browser → Server] TCP ACK. Connection ESTABLISHED.`,
    duration: 1300,
  });

  steps.push({
    id: "tls",
    title: "TLS handshake secures the connection",
    description: "Since this is HTTPS, browser and server now negotiate encryption: exchanging certificates and agreeing on session keys, so all further data is encrypted.",
    from: "client",
    to: "server",
    activeNodes: ["client", "server"],
    activeEdges: FULL_PATH,
    badge: "TLS",
    packet: { label: "TLS", color: "#fb923c", layers: [{ key: "tls", name: "Presentation — TLS", short: "Handshake", color: "#fb923c", fields: [{ label: "Cipher Suite", value: "TLS_AES_128_GCM_SHA256" }, { label: "Certificate", value: `CN=${host}` }] }] },
    log: "[Browser ⇄ Server] TLS handshake complete — connection encrypted.",
    duration: 1300,
  });

  steps.push(
    ...hopSteps({
      idPrefix: "req",
      path: FULL_PATH,
      badge: "HTTP GET",
      titleFn: (h, t) => `HTTP GET request — hop ${h}/${t}`,
      description: `The encrypted HTTP GET request travels hop-by-hop toward the server. Each router decrements the IP TTL field by 1 — this is what makes traceroute possible!`,
      packetLabel: "GET",
      color: "#f59e0b",
      srcIp: clientIp,
      dstIp: serverIp,
      startTtl: 64,
      extraLayers: [
        {
          key: "http",
          name: "Application — HTTP",
          short: "Request",
          color: "#f59e0b",
          fields: [
            { label: "Request Line", value: `GET ${path} HTTP/1.1` },
            { label: "Host", value: host },
            { label: "User-Agent", value: "Mozilla/5.0" },
            { label: "Accept", value: "text/html" },
          ],
        },
      ],
      logFn: (from, to, ttl) => `[${from} → ${to}] Forwarding HTTP GET (TTL now ${ttl}).`,
    })
  );

  steps.push({
    id: "process",
    title: "Server processes the request",
    description: `The web server receives the GET request for "${path}", runs any backend logic (reading files, querying a database, etc.) and prepares a response.`,
    from: "server",
    to: "server",
    activeNodes: ["server"],
    badge: "Processing",
    packet: null,
    log: `[Server] Handling GET ${path} → building HTTP response.`,
    duration: 900,
  });

  steps.push(
    ...hopSteps({
      idPrefix: "res",
      path: [...FULL_PATH].reverse().map(([a, b]) => [b, a] as [string, string]),
      badge: "HTTP 200",
      titleFn: (h, t) => `HTTP response — hop ${h}/${t}`,
      description: "The server's response (status code, headers, and HTML body) travels back the same way, hop by hop, to the browser.",
      packetLabel: "200 OK",
      color: "#22c55e",
      srcIp: serverIp,
      dstIp: clientIp,
      startTtl: 64,
      extraLayers: [
        {
          key: "http",
          name: "Application — HTTP",
          short: "Response",
          color: "#22c55e",
          fields: [
            { label: "Status", value: "200 OK" },
            { label: "Content-Type", value: "text/html; charset=UTF-8" },
            { label: "Content-Length", value: "1256" },
            { label: "Server", value: "nginx" },
          ],
        },
      ],
      logFn: (from, to, ttl) => `[${from} → ${to}] Forwarding HTTP 200 OK response (TTL now ${ttl}).`,
    })
  );

  steps.push({
    id: "render",
    title: "Browser renders the page",
    description: "The browser receives the HTML, parses it, fetches any additional resources (CSS, JS, images — each repeating this whole process!) and paints the page on screen.",
    from: "client",
    to: "client",
    activeNodes: ["client"],
    badge: "Render",
    packet: null,
    log: "[Browser] Parsing HTML & rendering the page.",
    duration: 900,
  });

  steps.push({
    id: "close",
    title: "Connection closed",
    description: "Once no more requests are needed on this connection (or after a keep-alive timeout), both sides perform the TCP 4-way close (FIN/ACK) — see the TCP module.",
    from: "client",
    to: "server",
    activeNodes: ["client", "server"],
    activeEdges: FULL_PATH,
    badge: "FIN",
    packet: { label: "FIN", color: "#f97316", layers: [{ key: "tcp", name: "Transport — TCP", short: "FIN", color: "#f97316", fields: [{ label: "Flags", value: "FIN, ACK" }] }] },
    log: "[Browser ⇄ Server] Connection gracefully closed.",
    duration: 1100,
  });

  return steps;
}

export default function HttpFlow() {
  const [url, setUrl] = useState("https://www.example.com/");
  const [committed, setCommitted] = useState("https://www.example.com/");
  const steps = useMemo(() => buildSteps(committed), [committed]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
          <Send className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-100">Full HTTP Request Journey</h2>
          <p className="text-sm text-slate-500">
            From typing a URL to seeing a rendered page — DNS, TCP, TLS and HTTP all working together.
          </p>
        </div>
      </div>
      <SimulatorLayout
        nodes={nodes}
        edges={edges}
        steps={steps}
        resetKey={committed}
        topologyHeight={400}
        topBar={
          <form
            className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              setCommitted(url.trim() || "https://www.example.com/");
            }}
          >
            <div className="min-w-[240px] flex-1">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                URL to visit
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-400"
                placeholder="https://www.example.com/"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400"
            >
              Go
            </button>
          </form>
        }
      />
    </div>
  );
}
