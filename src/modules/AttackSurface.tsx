import { Skull } from "lucide-react";
import SimulatorLayout from "../components/SimulatorLayout";
import ModuleHeader from "../components/ModuleHeader";
import { L, mk, pkt, layer, COLORS } from "../utils/packets";
import type { SimStep, TopoEdge, TopoNode } from "../types";

const nodes: TopoNode[] = [
  { id: "client", label: "Your browser", sublabel: "192.168.1.10", x: 8, y: 74, icon: "laptop" },
  { id: "router", label: "Wi-Fi router / LAN", sublabel: "gateway", x: 34, y: 74, icon: "router" },
  { id: "dns", label: "DNS resolver", x: 34, y: 20, icon: "dns" },
  { id: "server", label: "shop.example", sublabel: "93.184.216.34", x: 90, y: 46, icon: "server" },
];
const edges: TopoEdge[] = [
  { from: "client", to: "router" },
  { from: "router", to: "dns" },
  { from: "router", to: "server", label: "Internet" },
];

interface Atk {
  layer: string;
  name: string;
  desc: string;
}
interface Entry {
  step: SimStep;
  where: string;
  attacks: Atk[];
  defence: string;
}

const tcp = (sp: string, dp: string, f: string) => [L.ip("192.168.1.10", "93.184.216.34"), L.tcp(sp, dp, f)];
const dnsL = (fields: Array<[string, string]>) => layer("dns", "Application — DNS", "DNS", COLORS.app, fields);

const ENTRIES: Entry[] = [
  {
    where: "1 · In the browser",
    step: mk({ id: "url", title: "You type https://shop.example in the address bar", desc: "The journey starts on your own device. Everything you do from here on depends on this first click being the right one.", from: "client", badge: "URL", log: "[Browser] User enters https://shop.example" }),
    attacks: [
      { layer: "L7", name: "Typosquatting / phishing link", desc: "shop-examp1e.com or a link in a fake email takes you to a look-alike site." },
      { layer: "L7", name: "Malicious browser extension", desc: "An add-on reads or alters every page you visit." },
      { layer: "—", name: "Compromised device", desc: "Malware or keylogger on the endpoint sees everything before it is encrypted." },
    ],
    defence: "Check the URL, use a password manager (it won't autofill on fake domains), install only trusted extensions, keep the OS patched.",
  },
  {
    where: "2 · Local network",
    step: mk({ id: "lan", title: "The request leaves your device over Wi-Fi / Ethernet", desc: "The first hop is your local network, which is shared with other devices — and, on public Wi-Fi, with strangers.", from: "client", to: "router", badge: "LAN", packet: pkt("FRAME", "#f59e0b", [L.eth("AA:AA:AA:AA:AA:01", "00:1A:2B:3C:4D:99"), L.ip("192.168.1.10", "93.184.216.34")]), log: "[Client → Router] Frame to the default gateway." }),
    attacks: [
      { layer: "L1", name: "Evil-twin / rogue Wi-Fi", desc: "A fake access point with a familiar name captures your traffic." },
      { layer: "L2", name: "ARP poisoning / MAC spoofing", desc: "Another device on the LAN pretends to be the gateway (man-in-the-middle)." },
      { layer: "L3", name: "Rogue DHCP server", desc: "Hands you the attacker as gateway and DNS server." },
    ],
    defence: "WPA3, avoid open Wi-Fi or use a VPN, Dynamic ARP Inspection, DHCP snooping.",
  },
  {
    where: "3 · DNS lookup",
    step: mk({ id: "dnsq", title: "DNS: 'What is the IP of shop.example?'", desc: "Your computer needs an IP address, so it asks its DNS resolver — a plain UDP query on port 53.", from: "router", to: "dns", badge: "DNS query", packet: pkt("DNS QUERY", "#38bdf8", [L.udp("53211", "53"), dnsL([["Name", "shop.example"], ["Type", "A"]])]), log: "[Router → Resolver] A? shop.example" }),
    attacks: [
      { layer: "L7", name: "DNS cache poisoning / spoofing", desc: "Forged answers make the resolver return the attacker's IP." },
      { layer: "L7", name: "Rogue or hijacked resolver", desc: "A malicious DNS server (e.g. set by malware or a router hack) lies to you." },
      { layer: "L7", name: "DNS tunnelling", desc: "Malware hides stolen data in DNS queries." },
    ],
    defence: "DNSSEC, DNS-over-HTTPS/TLS, trusted resolvers, DNS monitoring.",
  },
  {
    where: "3 · DNS lookup",
    step: mk({ id: "dnsa", title: "The resolver answers with an IP address", desc: "shop.example → 93.184.216.34. If this answer is forged, everything after this goes to the wrong server — while the address bar still shows the right name.", from: "dns", to: "router", badge: "DNS answer", packet: pkt("DNS ANSWER", "#22c55e", [L.udp("53", "53211"), dnsL([["shop.example", "93.184.216.34"], ["TTL", "300"]])]), log: "[Resolver → Router] shop.example = 93.184.216.34" }),
    attacks: [
      { layer: "L7", name: "Forged answer (poisoned cache)", desc: "The IP returned belongs to the attacker, not to the shop." },
    ],
    defence: "Validate with DNSSEC; HTTPS certificate check will still fail on a fake site.",
  },
  {
    where: "4 · TCP connection",
    step: mk({ id: "tcp", title: "TCP three-way handshake with the server (port 443)", desc: "Your packets cross the Internet — through many routers you don't control — to reach the server. SYN → SYN-ACK → ACK.", from: "router", to: "server", badge: "SYN", packet: pkt("SYN :443", "#8b5cf6", tcp("50412", "443", "SYN")), log: "[Router → Server] SYN to 93.184.216.34:443" }),
    attacks: [
      { layer: "L4", name: "SYN flood", desc: "Fake SYNs exhaust the server's connection queue (DoS)." },
      { layer: "L4", name: "Port scanning", desc: "Attackers probe every port to find forgotten services." },
      { layer: "L3", name: "BGP hijack / IP spoofing", desc: "Traffic is routed through the wrong network or the source is forged." },
    ],
    defence: "SYN cookies, firewalls, closing unused ports, RPKI route validation, DDoS protection.",
  },
  {
    where: "5 · TLS encryption",
    step: mk({ id: "tls", title: "TLS handshake: certificate and key exchange", desc: "The server proves its identity with a certificate signed by a trusted authority, and both sides agree on session keys.", from: "server", to: "router", badge: "TLS", packet: pkt("ServerHello + Cert", "#a78bfa", [L.ip("93.184.216.34", "192.168.1.10"), L.tcp("443", "50412", "PSH, ACK"), L.app("Presentation — TLS", "TLS", [["Certificate", "CN=shop.example"], ["Issuer", "Trusted CA"], ["Cipher", "TLS_AES_256_GCM"]], COLORS.tls)]), log: "[Server → Client] Certificate + key share. Session keys derived." }),
    attacks: [
      { layer: "L6", name: "SSL stripping / downgrade", desc: "Attacker forces you back to plain HTTP so he can read the traffic." },
      { layer: "L6", name: "Fake / expired certificates", desc: "Users who click through warnings accept a man-in-the-middle." },
      { layer: "L6", name: "Weak ciphers & old TLS", desc: "Outdated protocols can be broken." },
    ],
    defence: "HSTS, TLS 1.2+/1.3, certificate validation, never ignore certificate warnings.",
  },
  {
    where: "6 · HTTP request",
    step: mk({ id: "http", title: "Your encrypted HTTP request reaches the web application", desc: "Inside the TLS tunnel: GET /search?q=… and your session cookie. Encryption protects it in transit — but once decrypted by the server, the application itself is the target.", from: "router", to: "server", badge: "HTTPS", packet: pkt("GET /search", "#22c55e", [L.ip("192.168.1.10", "93.184.216.34"), L.tcp("50412", "443", "PSH, ACK"), L.app("Application — HTTP (inside TLS)", "HTTP", [["Request", "GET /search?q=shoes"], ["Cookie", "SESSIONID=9f8a…"]])]), log: "[Client → Server] GET /search?q=shoes (encrypted)" }),
    attacks: [
      { layer: "L7", name: "SQL injection", desc: "Malicious input in a parameter changes the database query." },
      { layer: "L7", name: "Brute force / credential stuffing", desc: "Automated login guessing with leaked passwords." },
      { layer: "L7", name: "HTTP flood (application DDoS)", desc: "Legitimate-looking requests overload the app." },
      { layer: "L7", name: "Broken access control", desc: "Changing an ID in the URL reveals other users' data." },
    ],
    defence: "Parameterised queries, input validation, WAF, rate limiting, MFA, proper authorisation checks.",
  },
  {
    where: "7 · Server response",
    step: mk({ id: "resp", title: "The server sends back the web page", desc: "HTML, JavaScript, images and a Set-Cookie header travel back through the same chain of networks.", from: "server", to: "router", badge: "200 OK", packet: pkt("200 OK", "#22c55e", [L.ip("93.184.216.34", "192.168.1.10"), L.tcp("443", "50412", "PSH, ACK"), L.app("Application — HTTP (inside TLS)", "HTTP", [["Status", "200 OK"], ["Set-Cookie", "SESSIONID=…; Secure; HttpOnly"], ["Body", "<html>…</html>"]])]), log: "[Server → Client] 200 OK + page + cookie" }),
    attacks: [
      { layer: "L5", name: "Session hijacking", desc: "Stolen session cookies let an attacker act as you." },
      { layer: "L7", name: "Stored XSS / injected scripts", desc: "Malicious JavaScript hidden in the page or a third-party library." },
      { layer: "L7", name: "Information leakage", desc: "Error messages or headers reveal software versions and paths." },
    ],
    defence: "Secure + HttpOnly + SameSite cookies, Content-Security-Policy, subresource integrity, hide verbose errors.",
  },
  {
    where: "8 · Browser renders",
    step: mk({ id: "render", title: "Your browser renders the page and runs its scripts", desc: "The journey ends where it began: on your device. The page can now run code, load other sites' content and download files.", from: "client", badge: "Render", log: "[Browser] Page rendered; JavaScript executed." }),
    attacks: [
      { layer: "L7", name: "Cross-site scripting (XSS)", desc: "Injected script runs with the site's privileges and steals data." },
      { layer: "L7", name: "Drive-by downloads / malvertising", desc: "Malicious ads or scripts push malware." },
      { layer: "L7", name: "Clickjacking", desc: "Invisible frames trick you into clicking something else." },
    ],
    defence: "Keep the browser updated, ad/script blocking, CSP, X-Frame-Options, user awareness.",
  },
];

const steps = ENTRIES.map((e) => e.step);

export default function AttackSurface() {
  return (
    <div className="flex flex-col gap-4">
      <ModuleHeader
        icon={Skull}
        color="red"
        title="Attack Surface: URL to Web Page"
        subtitle="Follow one page load from the address bar to the screen — and see what an attacker can target at every single step."
      />
      <SimulatorLayout
        nodes={nodes}
        edges={edges}
        steps={steps}
        resetKey="attack-surface"
        topologyHeight={320}
        sideExtra={({ index }) => {
          const e = ENTRIES[index] ?? ENTRIES[0];
          return (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-xs">
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-rose-300">
                ⚠ Attack surface — {e.where}
              </h4>
              <ul className="mt-2 space-y-2">
                {e.attacks.map((a) => (
                  <li key={a.name}>
                    <span className="mr-1.5 rounded bg-rose-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-300">
                      {a.layer}
                    </span>
                    <span className="font-bold text-slate-200">{a.name}</span>
                    <span className="block text-slate-400">{a.desc}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-rose-500/20 pt-2 text-emerald-300">
                <b>Defence:</b> <span className="text-slate-300">{e.defence}</span>
              </p>
            </div>
          );
        }}
      />
    </div>
  );
}
