import { useMemo, useState } from "react";
import { Search, BookOpenCheck } from "lucide-react";
import { cn } from "../utils/cn";

interface PortEntry {
  port: number;
  protocol: "TCP" | "UDP" | "TCP/UDP";
  name: string;
  description: string;
  category: "Web" | "Email" | "File Transfer" | "Remote Access" | "Infrastructure" | "Database";
}

const PORTS: PortEntry[] = [
  { port: 20, protocol: "TCP", name: "FTP (Data)", description: "File Transfer Protocol — data channel for transferring files.", category: "File Transfer" },
  { port: 21, protocol: "TCP", name: "FTP (Control)", description: "File Transfer Protocol — command/control channel.", category: "File Transfer" },
  { port: 22, protocol: "TCP", name: "SSH", description: "Secure Shell — encrypted remote login and command execution.", category: "Remote Access" },
  { port: 23, protocol: "TCP", name: "Telnet", description: "Unencrypted remote login (largely obsolete, insecure).", category: "Remote Access" },
  { port: 25, protocol: "TCP", name: "SMTP", description: "Simple Mail Transfer Protocol — sending email between servers.", category: "Email" },
  { port: 53, protocol: "TCP/UDP", name: "DNS", description: "Domain Name System — resolves domain names to IP addresses.", category: "Infrastructure" },
  { port: 67, protocol: "UDP", name: "DHCP (Server)", description: "Dynamic Host Configuration Protocol — server listens here to assign IPs.", category: "Infrastructure" },
  { port: 68, protocol: "UDP", name: "DHCP (Client)", description: "DHCP client port for receiving IP configuration.", category: "Infrastructure" },
  { port: 69, protocol: "UDP", name: "TFTP", description: "Trivial File Transfer Protocol — simple, connectionless file transfer.", category: "File Transfer" },
  { port: 80, protocol: "TCP", name: "HTTP", description: "HyperText Transfer Protocol — unencrypted web traffic.", category: "Web" },
  { port: 110, protocol: "TCP", name: "POP3", description: "Post Office Protocol v3 — downloads email from a server.", category: "Email" },
  { port: 123, protocol: "UDP", name: "NTP", description: "Network Time Protocol — synchronizes clocks between devices.", category: "Infrastructure" },
  { port: 143, protocol: "TCP", name: "IMAP", description: "Internet Message Access Protocol — manages email on the server.", category: "Email" },
  { port: 161, protocol: "UDP", name: "SNMP", description: "Simple Network Management Protocol — monitors network devices.", category: "Infrastructure" },
  { port: 179, protocol: "TCP", name: "BGP", description: "Border Gateway Protocol — routes traffic between the internet's autonomous systems.", category: "Infrastructure" },
  { port: 389, protocol: "TCP/UDP", name: "LDAP", description: "Lightweight Directory Access Protocol — directory/user lookups.", category: "Infrastructure" },
  { port: 443, protocol: "TCP", name: "HTTPS", description: "HTTP Secure — encrypted web traffic using TLS/SSL.", category: "Web" },
  { port: 445, protocol: "TCP", name: "SMB", description: "Server Message Block — Windows file & printer sharing.", category: "File Transfer" },
  { port: 465, protocol: "TCP", name: "SMTPS", description: "SMTP secured with TLS/SSL, used for submitting outgoing email.", category: "Email" },
  { port: 587, protocol: "TCP", name: "SMTP (Submission)", description: "Mail submission from clients, usually with STARTTLS.", category: "Email" },
  { port: 993, protocol: "TCP", name: "IMAPS", description: "IMAP secured with TLS/SSL.", category: "Email" },
  { port: 995, protocol: "TCP", name: "POP3S", description: "POP3 secured with TLS/SSL.", category: "Email" },
  { port: 3306, protocol: "TCP", name: "MySQL", description: "Default port for MySQL / MariaDB database connections.", category: "Database" },
  { port: 3389, protocol: "TCP", name: "RDP", description: "Remote Desktop Protocol — graphical remote access to Windows machines.", category: "Remote Access" },
  { port: 5432, protocol: "TCP", name: "PostgreSQL", description: "Default port for PostgreSQL database connections.", category: "Database" },
  { port: 5900, protocol: "TCP", name: "VNC", description: "Virtual Network Computing — cross-platform remote desktop access.", category: "Remote Access" },
  { port: 6379, protocol: "TCP", name: "Redis", description: "Default port for the Redis in-memory data store.", category: "Database" },
  { port: 8080, protocol: "TCP", name: "HTTP (alt)", description: "Common alternate HTTP port, often used for proxies and dev servers.", category: "Web" },
  { port: 27017, protocol: "TCP", name: "MongoDB", description: "Default port for MongoDB database connections.", category: "Database" },
];

const CATEGORIES = ["All", ...Array.from(new Set(PORTS.map((p) => p.category)))];

const PROTOCOL_COMPARE = [
  { name: "TCP", full: "Transmission Control Protocol", points: ["Connection-oriented (handshake first)", "Reliable — guarantees delivery & order", "Flow & congestion control", "Slightly higher overhead", "Used by: HTTP, HTTPS, FTP, SSH, email"] },
  { name: "UDP", full: "User Datagram Protocol", points: ["Connectionless — just send", "No delivery guarantee or ordering", "Very low overhead, fast", "No flow/congestion control", "Used by: DNS, video streaming, VoIP, gaming"] },
];

export default function PortReference() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    return PORTS.filter((p) => {
      const matchesCategory = category === "All" || p.category === category;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        String(p.port).includes(q) ||
        p.description.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, category]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
          <BookOpenCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-100">Ports & Protocols Reference</h2>
          <p className="text-sm text-slate-500">
            A searchable cheat-sheet of common ports, plus a quick TCP vs UDP comparison.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {PROTOCOL_COMPARE.map((p) => (
          <div key={p.name} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="mb-1 text-sm font-bold text-cyan-300">
              {p.name} <span className="text-xs font-normal text-slate-500">— {p.full}</span>
            </h3>
            <ul className="mt-2 space-y-1 text-xs text-slate-400">
              {p.points.map((pt, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-cyan-500">•</span>
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by port, name or description…"
            className="w-full rounded-lg border border-slate-700 bg-slate-950/80 py-2 pl-9 pr-3 text-sm text-slate-200 outline-none focus:border-indigo-400"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-bold",
                category === c ? "bg-indigo-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Port</th>
              <th className="px-4 py-2.5">Protocol</th>
              <th className="px-4 py-2.5">Service</th>
              <th className="px-4 py-2.5 hidden md:table-cell">Description</th>
              <th className="px-4 py-2.5 hidden sm:table-cell">Category</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/50">
            {filtered.map((p) => (
              <tr key={p.port + p.name} className="hover:bg-slate-900/60">
                <td className="px-4 py-2.5 font-mono font-bold text-cyan-300">{p.port}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{p.protocol}</td>
                <td className="px-4 py-2.5 font-semibold text-slate-200">{p.name}</td>
                <td className="hidden px-4 py-2.5 text-xs text-slate-400 md:table-cell">{p.description}</td>
                <td className="hidden px-4 py-2.5 text-xs text-slate-500 sm:table-cell">{p.category}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  No matching ports found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
