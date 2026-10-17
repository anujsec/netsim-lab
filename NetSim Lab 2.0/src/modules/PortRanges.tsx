import { useMemo, useState } from "react";
import { DoorOpen } from "lucide-react";
import ModuleHeader from "../components/ModuleHeader";
import { cn } from "../utils/cn";

const RANGES = [
  { id: "well", name: "Well-known", from: 0, to: 1023, color: "emerald", text: "Reserved for standard services (HTTP, SSH, DNS…). Servers listen here; on most systems binding needs admin/root rights." },
  { id: "reg", name: "Registered", from: 1024, to: 49151, color: "sky", text: "Registered with IANA for specific applications (MySQL 3306, RDP 3389, PostgreSQL 5432…). Software installed by users often listens here." },
  { id: "eph", name: "Dynamic / Ephemeral", from: 49152, to: 65535, color: "violet", text: "Temporary ports your computer picks for the CLIENT side of each connection. Linux defaults to 32768–60999." },
] as const;

const CLS: Record<string, { bar: string; ring: string; txt: string }> = {
  emerald: { bar: "bg-emerald-500/25 border-emerald-500/60", ring: "ring-emerald-400", txt: "text-emerald-300" },
  sky: { bar: "bg-sky-500/25 border-sky-500/60", ring: "ring-sky-400", txt: "text-sky-300" },
  violet: { bar: "bg-violet-500/25 border-violet-500/60", ring: "ring-violet-400", txt: "text-violet-300" },
};

const CRITICAL: Array<[number, string, string, string]> = [
  [20, "FTP data", "TCP", "Plaintext file transfer (data channel)"],
  [21, "FTP control", "TCP", "Plaintext — credentials visible"],
  [22, "SSH / SFTP", "TCP", "Encrypted remote shell"],
  [23, "Telnet", "TCP", "Plaintext remote shell — dangerous"],
  [25, "SMTP", "TCP", "Sending e-mail between servers"],
  [53, "DNS", "UDP/TCP", "Name resolution"],
  [67, "DHCP server", "UDP", "Hands out IP addresses"],
  [80, "HTTP", "TCP", "Unencrypted web"],
  [110, "POP3", "TCP", "Download e-mail (plaintext)"],
  [123, "NTP", "UDP", "Time sync (amplification target)"],
  [143, "IMAP", "TCP", "Sync e-mail (plaintext)"],
  [161, "SNMP", "UDP", "Device monitoring"],
  [443, "HTTPS", "TCP", "Encrypted web (TLS)"],
  [445, "SMB", "TCP", "Windows file sharing (ransomware favourite)"],
  [3306, "MySQL", "TCP", "Database"],
  [3389, "RDP", "TCP", "Windows remote desktop (often attacked)"],
];

function rangeOf(p: number) {
  return RANGES.find((r) => p >= r.from && p <= r.to)!;
}
const rnd = () => 49152 + Math.floor(Math.random() * 16384);

export default function PortRanges() {
  const [input, setInput] = useState("443");
  const [conns, setConns] = useState<Array<{ tab: string; port: number; server: string }>>([
    { tab: "Tab 1", port: 52714, server: "93.184.216.34:443" },
    { tab: "Tab 2", port: 51233, server: "93.184.216.34:443" },
  ]);
  const [quiz, setQuiz] = useState(0);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<null | boolean>(null);
  const [score, setScore] = useState(0);

  const port = Number(input);
  const valid = input !== "" && Number.isInteger(port) && port >= 0 && port <= 65535;
  const hit = valid ? rangeOf(port) : null;
  const known = useMemo(() => CRITICAL.filter((c) => c[0] === port), [port]);
  const q = CRITICAL[quiz];

  const check = () => {
    const ok = Number(guess) === q[0];
    setFeedback(ok);
    if (ok) setScore((s) => s + 1);
  };
  const next = () => {
    setQuiz((n) => (n + Math.floor(Math.random() * (CRITICAL.length - 1)) + 1) % CRITICAL.length);
    setGuess("");
    setFeedback(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <ModuleHeader
        icon={DoorOpen}
        color="indigo"
        title="Port Ranges & Critical Ports"
        subtitle="Which of the 65,536 ports are well-known, registered or ephemeral — and the ones every security person must memorise."
      />

      {/* Range bar */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-300">
          The port number line (0 – 65535, not to scale)
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {RANGES.map((r) => (
            <div
              key={r.id}
              className={cn(
                "rounded-xl border p-3 transition-all",
                CLS[r.color].bar,
                hit?.id === r.id && `ring-2 ${CLS[r.color].ring}`
              )}
            >
              <p className={cn("text-sm font-bold", CLS[r.color].txt)}>{r.name}</p>
              <p className="font-mono text-[11px] text-slate-300">
                {r.from} – {r.to}
              </p>
              <p className="mt-1 hidden text-[11px] text-slate-400 md:block">{r.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Test a port</label>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/\D/g, ""))}
            className="w-28 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 font-mono text-sm text-slate-200 outline-none focus:border-cyan-400"
          />
          {valid && hit && (
            <p className="text-sm text-slate-300">
              Port <b className="font-mono">{port}</b> is{" "}
              <b className={CLS[hit.color].txt}>{hit.name}</b>
              {known.length > 0 && (
                <>
                  {" "}— <b className="text-white">{known[0][1]}</b> ({known[0][2]})
                </>
              )}
            </p>
          )}
          {!valid && input !== "" && <p className="text-sm text-rose-300">Ports go from 0 to 65535.</p>}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* ephemeral sockets */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">
            Why ephemeral ports exist
          </h3>
          <p className="mb-3 text-xs text-slate-400">
            Every connection is identified by <b className="text-slate-200">source IP:port ⇄ destination IP:port</b>.
            The server always uses the same well-known port (443), so your computer picks a random{" "}
            <b className="text-violet-300">ephemeral port</b> per connection to keep them apart.
          </p>
          <div className="space-y-2">
            {conns.map((c, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-2 font-mono text-[11px]">
                <span className="w-12 text-slate-500">{c.tab}</span>
                <span className="text-slate-300">192.168.1.10:</span>
                <span className="rounded bg-violet-500/25 px-1.5 py-0.5 font-bold text-violet-300">{c.port}</span>
                <span className="text-slate-600">⇄</span>
                <span className="text-slate-300">{c.server.split(":")[0]}:</span>
                <span className="rounded bg-emerald-500/25 px-1.5 py-0.5 font-bold text-emerald-300">443</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setConns((c) => [...c.slice(-3), { tab: `Tab ${c.length + 1}`, port: rnd(), server: "93.184.216.34:443" }])}
            className="mt-3 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-400"
          >
            + Open another connection
          </button>
        </section>

        {/* quiz */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-300">Port flash-cards</h3>
            <span className="font-mono text-xs text-emerald-300">score {score}</span>
          </div>
          <p className="text-sm text-slate-300">
            Which port does <b className="text-white">{q[1]}</b> use?
          </p>
          <p className="mb-3 text-[11px] text-slate-500">Hint: {q[3]}</p>
          <div className="flex gap-2">
            <input
              value={guess}
              onChange={(e) => setGuess(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && feedback === null && check()}
              className="w-28 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 font-mono text-sm text-slate-200 outline-none focus:border-cyan-400"
              placeholder="port"
            />
            <button onClick={check} disabled={feedback !== null || guess === ""} className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-40">
              Check
            </button>
            <button onClick={next} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
              Next
            </button>
          </div>
          {feedback !== null && (
            <p className={cn("mt-3 text-sm font-bold", feedback ? "text-emerald-300" : "text-rose-300")}>
              {feedback ? "Correct!" : `Not quite — it's port ${q[0]}.`}
            </p>
          )}
        </section>
      </div>

      {/* critical ports grid */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-300">Critical ports to memorise</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {CRITICAL.map((c) => (
            <button
              key={c[0]}
              onClick={() => setInput(String(c[0]))}
              className={cn(
                "rounded-lg border p-2 text-left transition-colors hover:bg-slate-800",
                port === c[0] ? "border-cyan-400 bg-cyan-500/10" : "border-slate-800 bg-slate-950/50"
              )}
            >
              <p className="font-mono text-lg font-black text-cyan-300">{c[0]}</p>
              <p className="text-xs font-bold text-slate-200">{c[1]}</p>
              <p className="text-[10px] text-slate-500">{c[2]} · {c[3]}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
