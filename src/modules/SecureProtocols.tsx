import { useState } from "react";
import { Lock } from "lucide-react";
import SimulatorLayout from "../components/SimulatorLayout";
import ModuleHeader from "../components/ModuleHeader";
import ScenarioTabs from "../components/ScenarioTabs";
import SidePanel from "../components/SidePanel";
import { L, mk, pkt, COLORS } from "../utils/packets";
import { cn } from "../utils/cn";
import type { SimStep, TopoEdge, TopoNode } from "../types";

type Pair = "web" | "shell" | "ftp";
type Variant = "plain" | "secure";

const nodes: TopoNode[] = [
  { id: "client", label: "Alice", sublabel: "client", x: 12, y: 62, icon: "laptop" },
  { id: "sniff", label: "Eavesdropper", sublabel: "same Wi-Fi / on the path", x: 50, y: 14, icon: "laptop" },
  { id: "server", label: "Server", x: 88, y: 62, icon: "server" },
];
const edges: TopoEdge[] = [
  { from: "client", to: "server", label: "network" },
  { from: "sniff", to: "client", dashed: true },
];

interface Scn {
  steps: SimStep[];
  sniff: Array<{ text: string; secret: boolean } | null>;
  summary: string;
}

const cipher = (n: number) =>
  Array.from({ length: n }, (_, i) => ((i * 37 + 11) % 256).toString(16).padStart(2, "0")).join(" ");

function s(
  id: string,
  title: string,
  desc: string,
  from: string,
  to: string,
  label: string,
  color: string,
  layers: ReturnType<typeof L.ip>[],
  see: { text: string; secret: boolean } | null
): { step: SimStep; see: { text: string; secret: boolean } | null } {
  return {
    step: {
      ...mk({ id, title, desc, from, to, badge: label, packet: pkt(label, color, layers), log: `[${from === "client" ? "Alice → Server" : "Server → Alice"}] ${title}` }),
      activeNodes: ["client", "server", "sniff"],
      activeEdges: [[from, to], ["sniff", "client"]],
    },
    see,
  };
}

function make(items: ReturnType<typeof s>[], summary: string): Scn {
  return { steps: items.map((i) => i.step), sniff: items.map((i) => i.see), summary };
}

const tcpOnly = (sp: string, dp: string, f: string) => [L.ip("10.0.0.5", "203.0.113.20"), L.tcp(sp, dp, f)];
const enc = (name: string, short: string, bytes: number, color: string = COLORS.tls) =>
  L.app(name, short, [["Payload", `${cipher(bytes)} …`], ["Readable?", "No — encrypted"]], color);

const SCN: Record<Pair, Record<Variant, Scn>> = {
  web: {
    plain: make(
      [
        s("syn", "TCP connection to port 80", "No encryption is negotiated at all. HTTP sends everything exactly as typed.", "client", "server", "SYN :80", "#38bdf8", tcpOnly("50412", "80", "SYN"), { text: "TCP SYN → 203.0.113.20:80", secret: false }),
        s("post", "Alice logs in: POST /login", "The username and password travel inside the HTTP body as plain text. Anyone on the same Wi-Fi or on the path can read them with Wireshark.", "client", "server", "POST /login", "#f43f5e", [...tcpOnly("50412", "80", "PSH, ACK"), L.app("Application — HTTP", "POST", [["Path", "/login"], ["Body", "user=alice&pass=Secret123"]], COLORS.danger)], { text: "POST /login HTTP/1.1\nHost: shop.example\n\nuser=alice&pass=Secret123", secret: true }),
        s("cookie", "Server replies with a session cookie", "The cookie proves who Alice is. If it's stolen, the attacker can impersonate her (session hijacking).", "server", "client", "200 OK", "#f43f5e", [...tcpOnly("80", "50412", "PSH, ACK"), L.app("Application — HTTP", "200", [["Set-Cookie", "SESSIONID=9f8a7c…"], ["Body", "<html>Welcome Alice</html>"]], COLORS.danger)], { text: "HTTP/1.1 200 OK\nSet-Cookie: SESSIONID=9f8a7c…\n\n<html>Welcome Alice</html>", secret: true }),
      ],
      "HTTP is plaintext: credentials, cookies and page content are all readable."
    ),
    secure: make(
      [
        s("syn", "TCP connection to port 443", "First the normal TCP three-way handshake.", "client", "server", "SYN :443", "#38bdf8", tcpOnly("50412", "443", "SYN"), { text: "TCP SYN → 203.0.113.20:443", secret: false }),
        s("hello", "TLS ClientHello", "Alice proposes TLS versions and cipher suites. The server name (SNI) is still visible.", "client", "server", "ClientHello", "#a78bfa", [...tcpOnly("50412", "443", "PSH, ACK"), L.app("Presentation — TLS", "TLS", [["Handshake", "ClientHello"], ["SNI", "shop.example"], ["Ciphers", "TLS_AES_256_GCM_SHA384…"]], COLORS.tls)], { text: "TLS ClientHello  (SNI = shop.example)", secret: false }),
        s("cert", "Server sends its certificate and key share", "The certificate proves the server's identity (signed by a trusted CA). Both sides then derive the same secret session keys — the keys themselves never cross the network.", "server", "client", "ServerHello + Cert", "#a78bfa", [...tcpOnly("443", "50412", "PSH, ACK"), L.app("Presentation — TLS", "TLS", [["Handshake", "ServerHello, Certificate"], ["Issuer", "Trusted CA"], ["Key share", "ECDHE"]], COLORS.tls)], { text: "ServerHello + Certificate (public information)", secret: false }),
        s("login", "Alice logs in — encrypted", "Same POST request as before, but now wrapped in TLS. The eavesdropper only sees random-looking bytes.", "client", "server", "Encrypted POST", "#22c55e", [...tcpOnly("50412", "443", "PSH, ACK"), enc("Presentation — TLS", "TLS", 24)], { text: cipher(40) + " …", secret: false }),
        s("reply", "Encrypted response", "The cookie and page are also encrypted. The eavesdropper can still see who talks to whom, when, and roughly how much — but not what.", "server", "client", "Encrypted 200", "#22c55e", [...tcpOnly("443", "50412", "PSH, ACK"), enc("Presentation — TLS", "TLS", 28)], { text: cipher(48) + " …", secret: false }),
      ],
      "HTTPS (HTTP over TLS) hides the content — only metadata (IPs, SNI, sizes) leaks."
    ),
  },
  shell: {
    plain: make(
      [
        s("syn", "TCP connection to port 23 (Telnet)", "Telnet gives a remote command line — with zero encryption.", "client", "server", "SYN :23", "#38bdf8", tcpOnly("50500", "23", "SYN"), { text: "TCP SYN → :23 (Telnet)", secret: false }),
        s("user", "Alice types her username: one keystroke per packet", "Every key you press is sent as its own tiny packet, in clear text.", "client", "server", "'alice'", "#f43f5e", [...tcpOnly("50500", "23", "PSH, ACK"), L.app("Application — Telnet", "TEL", [["Data", "a  l  i  c  e"]], COLORS.danger)], { text: "login: alice", secret: true }),
        s("pass", "She types her password", "The eavesdropper reads it letter by letter.", "client", "server", "'S3cret!'", "#f43f5e", [...tcpOnly("50500", "23", "PSH, ACK"), L.app("Application — Telnet", "TEL", [["Data", "S 3 c r e t !"]], COLORS.danger)], { text: "Password: S3cret!", secret: true }),
        s("cmd", "She runs commands as admin", "Everything she types and every output line is visible and can even be modified in transit.", "client", "server", "'sudo reboot'", "#f43f5e", [...tcpOnly("50500", "23", "PSH, ACK"), L.app("Application — Telnet", "TEL", [["Data", "sudo reboot"]], COLORS.danger)], { text: "$ sudo reboot", secret: true }),
      ],
      "Telnet is plaintext: login, password and every command can be captured."
    ),
    secure: make(
      [
        s("syn", "TCP connection to port 22 (SSH)", "SSH is the encrypted replacement for Telnet.", "client", "server", "SYN :22", "#38bdf8", tcpOnly("50501", "22", "SYN"), { text: "TCP SYN → :22 (SSH)", secret: false }),
        s("ver", "Version & algorithm negotiation", "Both sides announce their SSH version and supported ciphers.", "client", "server", "SSH-2.0", "#a78bfa", [...tcpOnly("50501", "22", "PSH, ACK"), L.app("Application — SSH", "SSH", [["Banner", "SSH-2.0-OpenSSH_9.6"], ["KEX", "curve25519-sha256"]], COLORS.tls)], { text: "SSH-2.0-OpenSSH_9.6  (version banner)", secret: false }),
        s("kex", "Key exchange + host key check", "A Diffie-Hellman exchange creates a shared secret that never travels over the wire. Alice's client also checks the server's host key fingerprint — protection against man-in-the-middle attacks.", "server", "client", "KEX + host key", "#a78bfa", [...tcpOnly("22", "50501", "PSH, ACK"), L.app("Application — SSH", "SSH", [["Host key", "SHA256:Qx9…"], ["Result", "session keys derived"]], COLORS.tls)], { text: "Key exchange values (public)", secret: false }),
        s("auth", "Login (password or key) — encrypted", "Authentication happens inside the encrypted channel. With SSH keys the password is never even sent.", "client", "server", "Encrypted auth", "#22c55e", [...tcpOnly("50501", "22", "PSH, ACK"), enc("Application — SSH", "SSH", 20)], { text: cipher(36) + " …", secret: false }),
        s("cmd", "Commands and output — encrypted", "Everything in the session is unreadable to an eavesdropper.", "client", "server", "Encrypted data", "#22c55e", [...tcpOnly("50501", "22", "PSH, ACK"), enc("Application — SSH", "SSH", 22)], { text: cipher(44) + " …", secret: false }),
      ],
      "SSH encrypts authentication and the whole session, and verifies the server."
    ),
  },
  ftp: {
    plain: make(
      [
        s("ctl", "FTP control connection (port 21)", "FTP opens a control channel for commands and, later, a separate data channel.", "client", "server", "SYN :21", "#38bdf8", tcpOnly("50600", "21", "SYN"), { text: "TCP SYN → :21 (FTP control)", secret: false }),
        s("user", "USER alice", "Commands are plain ASCII text.", "client", "server", "USER", "#f43f5e", [...tcpOnly("50600", "21", "PSH, ACK"), L.app("Application — FTP", "FTP", [["Command", "USER alice"]], COLORS.danger)], { text: "USER alice", secret: true }),
        s("pass", "PASS Secret123", "The password is sent in the clear to anyone listening.", "client", "server", "PASS", "#f43f5e", [...tcpOnly("50600", "21", "PSH, ACK"), L.app("Application — FTP", "FTP", [["Command", "PASS Secret123"]], COLORS.danger)], { text: "PASS Secret123", secret: true }),
        s("data", "File transfer on the data channel (port 20 / passive)", "The file content also crosses the network unencrypted — a captured file is fully readable.", "server", "client", "RETR salary.xlsx", "#f43f5e", [...tcpOnly("20", "50601", "PSH, ACK"), L.app("Application — FTP data", "FTP", [["File", "salary.xlsx"], ["Content", "Name,Salary\\nBob,95000 …"]], COLORS.danger)], { text: "salary.xlsx\nName,Salary\nBob,95000 …", secret: true }),
      ],
      "FTP exposes credentials AND file contents. Never use plain FTP."
    ),
    secure: make(
      [
        s("ssh", "SFTP runs inside an SSH connection (port 22)", "SFTP is not 'FTP over SSL' — it is a different protocol that uses an SSH tunnel. Only ONE port is needed (22), which also makes firewalls easier.", "client", "server", "SYN :22", "#38bdf8", tcpOnly("50700", "22", "SYN"), { text: "TCP SYN → :22 (SSH/SFTP)", secret: false }),
        s("kex", "SSH key exchange & host verification", "Same as SSH: algorithms are negotiated and session keys are derived securely.", "server", "client", "KEX", "#a78bfa", [...tcpOnly("22", "50700", "PSH, ACK"), L.app("Application — SSH", "SSH", [["Host key", "SHA256:Qx9…"]], COLORS.tls)], { text: "Key exchange values (public)", secret: false }),
        s("auth", "Login — encrypted", "Username and password / key never appear in clear text.", "client", "server", "Encrypted auth", "#22c55e", [...tcpOnly("50700", "22", "PSH, ACK"), enc("Application — SFTP/SSH", "SFTP", 20)], { text: cipher(36) + " …", secret: false }),
        s("data", "File transfer — encrypted", "Commands and file content share one encrypted channel. (FTPS — FTP wrapped in TLS — is another secure option.)", "server", "client", "Encrypted file", "#22c55e", [...tcpOnly("22", "50700", "PSH, ACK"), enc("Application — SFTP/SSH", "SFTP", 30)], { text: cipher(52) + " …", secret: false }),
      ],
      "SFTP protects credentials and file contents with SSH encryption."
    ),
  },
};

const NAMES: Record<Pair, [string, string]> = {
  web: ["HTTP (80)", "HTTPS (443)"],
  shell: ["Telnet (23)", "SSH (22)"],
  ftp: ["FTP (21/20)", "SFTP (22)"],
};

export default function SecureProtocols() {
  const [pair, setPair] = useState<Pair>("web");
  const [variant, setVariant] = useState<Variant>("plain");
  const scn = SCN[pair][variant];

  return (
    <div className="flex flex-col gap-4">
      <ModuleHeader
        icon={Lock}
        color="emerald"
        title="Plaintext vs Encrypted: HTTP/HTTPS, Telnet/SSH, FTP/SFTP"
        subtitle="Send the same login through an insecure protocol and its secure replacement — and see exactly what an eavesdropper captures."
      />
      <SimulatorLayout
        nodes={nodes}
        edges={edges}
        steps={scn.steps}
        resetKey={`secure-${pair}-${variant}`}
        topologyHeight={320}
        topBar={
          <div className="flex flex-col gap-3">
            <ScenarioTabs
              label="Protocol pair"
              value={pair}
              onChange={setPair}
              options={[
                { id: "web", label: "Web" },
                { id: "shell", label: "Remote shell" },
                { id: "ftp", label: "File transfer" },
              ]}
            />
            <ScenarioTabs
              label="Version"
              value={variant}
              onChange={setVariant}
              options={[
                { id: "plain", label: `❌ ${NAMES[pair][0]}` },
                { id: "secure", label: `✅ ${NAMES[pair][1]}` },
              ]}
            />
          </div>
        }
        sideExtra={({ index }) => {
          const seen = scn.sniff
            .slice(0, index + 1)
            .map((x, i) => ({ x, i }))
            .filter((o) => o.x !== null);
          return (
            <SidePanel title="🕵️ What the eavesdropper captures">
              <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-slate-800 bg-black/60 p-2 font-mono text-[11px]">
                {seen.length === 0 && <p className="text-slate-600">(waiting for packets…)</p>}
                {seen.map(({ x, i }) => (
                  <pre
                    key={i}
                    className={cn("whitespace-pre-wrap break-all", x!.secret ? "font-bold text-rose-400" : "text-slate-500")}
                  >
                    {x!.text}
                  </pre>
                ))}
              </div>
              <p className={cn("mt-2 font-semibold", variant === "plain" ? "text-rose-300" : "text-emerald-300")}>{scn.summary}</p>
            </SidePanel>
          );
        }}
      />
    </div>
  );
}
