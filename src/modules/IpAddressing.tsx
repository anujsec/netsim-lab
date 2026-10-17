import { useMemo, useState } from "react";
import { Hash } from "lucide-react";
import ModuleHeader from "../components/ModuleHeader";
import ScenarioTabs from "../components/ScenarioTabs";
import { cn } from "../utils/cn";

type Tab = "binary" | "v6" | "scope" | "cidr";

/* ---------------- Binary octets ---------------- */
function BinaryTab() {
  const [bits, setBits] = useState<boolean[][]>([
    [true, true, false, false, false, false, false, false], // 192
    [true, false, true, false, true, false, false, false], // 168
    [false, false, false, false, false, false, false, true], // 1
    [false, false, false, false, true, false, true, false], // 10
  ]);
  const vals = bits.map((o) => o.reduce((acc, b, i) => acc + (b ? 2 ** (7 - i) : 0), 0));
  const toggle = (o: number, b: number) =>
    setBits((prev) => prev.map((oct, oi) => (oi === o ? oct.map((v, bi) => (bi === b ? !v : v)) : oct)));
  const preset = (ip: number[]) =>
    setBits(ip.map((n) => Array.from({ length: 8 }, (_, i) => (n & (1 << (7 - i))) !== 0)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {[
          ["192.168.1.10", [192, 168, 1, 10]],
          ["10.0.0.1", [10, 0, 0, 1]],
          ["8.8.8.8", [8, 8, 8, 8]],
          ["255.255.255.255", [255, 255, 255, 255]],
        ].map(([l, ip]) => (
          <button
            key={l as string}
            onClick={() => preset(ip as number[])}
            className="rounded-lg bg-slate-800 px-3 py-1.5 font-mono text-xs font-bold text-slate-400 hover:bg-slate-700 hover:text-slate-200"
          >
            {l as string}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="mb-3 text-xs text-slate-400">
          An IPv4 address is <b className="text-cyan-300">32 bits</b> split into{" "}
          <b className="text-cyan-300">4 octets</b> of 8 bits. Click bits to flip them. Each bit is
          worth a power of two.
        </p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {bits.map((oct, oi) => (
            <div key={oi} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="mb-1 grid grid-cols-8 gap-1 text-center font-mono text-[9px] text-slate-600">
                {[128, 64, 32, 16, 8, 4, 2, 1].map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>
              <div className="grid grid-cols-8 gap-1">
                {oct.map((b, bi) => (
                  <button
                    key={bi}
                    onClick={() => toggle(oi, bi)}
                    className={cn(
                      "aspect-square rounded-md font-mono text-sm font-bold transition-colors",
                      b ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                    )}
                  >
                    {b ? 1 : 0}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center font-mono text-2xl font-black text-slate-100">{vals[oi]}</p>
              <p className="text-center text-[10px] text-slate-500">
                octet {oi + 1} · {oct.map((b) => (b ? 1 : 0)).join("")}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center font-mono text-3xl font-black text-white">
          {vals.join(".")}
        </p>
        <p className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-center text-xs text-slate-300">
          Each octet can be 0–255, so there are 2<sup>32</sup> = <b>4,294,967,296</b> possible IPv4
          addresses (about 4.3 billion).
        </p>
      </div>
    </div>
  );
}

/* ---------------- IPv4 exhaustion + IPv6 ---------------- */
const TIMELINE = [
  { year: "1981", text: "IPv4 is standardised (RFC 791): 32-bit addresses. 4.3 billion seemed like plenty." },
  { year: "1990s", text: "The web explodes. CIDR and NAT are invented to stretch the address space." },
  { year: "2011", text: "IANA hands out its last free IPv4 blocks to the regional registries (Feb 2011)." },
  { year: "2011–2015", text: "Regional registries run out of free IPv4 pools one after another (APNIC 2011, RIPE NCC 2012, LACNIC 2014, ARIN 2015)." },
  { year: "Today", text: "IPv4 addresses are traded and rented; IPv6 adoption keeps growing." },
];

function compressV6(full: string): string {
  const groups = full.split(":").map((g) => g.replace(/^0+(?=.)/, "").toLowerCase());
  if (groups.length !== 8) return full;
  let bestStart = -1;
  let bestLen = 0;
  for (let i = 0; i < 8; ) {
    if (groups[i] === "0") {
      let j = i;
      while (j < 8 && groups[j] === "0") j++;
      if (j - i > bestLen) {
        bestLen = j - i;
        bestStart = i;
      }
      i = j;
    } else i++;
  }
  if (bestLen < 2) return groups.join(":");
  const left = groups.slice(0, bestStart).join(":");
  const right = groups.slice(bestStart + bestLen).join(":");
  return `${left}::${right}`;
}

function V6Tab() {
  const [v6, setV6] = useState("2001:0db8:0000:0000:0000:ff00:0042:8329");
  const valid = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(v6.trim());
  const step1 = valid ? v6.trim().split(":").map((g) => g.replace(/^0+(?=.)/, "")).join(":").toLowerCase() : "—";
  const step2 = valid ? compressV6(v6.trim()) : "—";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-300">
            Address space: 32 bits vs 128 bits
          </h3>
          <p className="mb-1 text-[11px] text-slate-500">IPv4 — 32 bits (each square = 1 bit)</p>
          <div className="mb-4 grid grid-cols-[repeat(32,minmax(0,1fr))] gap-0.5">
            {Array.from({ length: 32 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-sm bg-cyan-500" />
            ))}
          </div>
          <p className="mb-1 text-[11px] text-slate-500">IPv6 — 128 bits</p>
          <div className="grid grid-cols-[repeat(32,minmax(0,1fr))] gap-0.5">
            {Array.from({ length: 128 }).map((_, i) => (
              <div key={i} className={cn("aspect-square rounded-sm", i < 32 ? "bg-cyan-500" : "bg-violet-500")} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
              <p className="text-[10px] text-slate-500">IPv4</p>
              <p className="font-mono text-sm font-bold text-cyan-300">≈ 4.3 billion</p>
              <p className="font-mono text-[10px] text-slate-500">2³²</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
              <p className="text-[10px] text-slate-500">IPv6</p>
              <p className="font-mono text-sm font-bold text-violet-300">≈ 340 undecillion</p>
              <p className="font-mono text-[10px] text-slate-500">2¹²⁸ ≈ 3.4 × 10³⁸</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-300">
            The IPv4 exhaustion timeline
          </h3>
          <ol className="relative space-y-3 border-l border-slate-700 pl-4">
            {TIMELINE.map((t) => (
              <li key={t.year} className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-cyan-400" />
                <p className="font-mono text-xs font-bold text-cyan-300">{t.year}</p>
                <p className="text-xs text-slate-400">{t.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">
          IPv6 shortening tool
        </h3>
        <input
          value={v6}
          onChange={(e) => setV6(e.target.value)}
          className={cn(
            "w-full rounded-lg border bg-slate-950/80 px-3 py-2 font-mono text-sm text-slate-200 outline-none",
            valid ? "border-slate-700 focus:border-cyan-400" : "border-rose-500/60"
          )}
          placeholder="8 groups, e.g. 2001:0db8:0000:0000:0000:ff00:0042:8329"
        />
        <div className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
            <p className="text-slate-500">Full form (8 × 16 bits)</p>
            <p className="break-all font-mono text-slate-200">{valid ? v6.trim() : "Enter 8 groups separated by ':'"}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
            <p className="text-slate-500">Rule 1: drop leading zeros</p>
            <p className="break-all font-mono text-amber-300">{step1}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
            <p className="text-slate-500">Rule 2: longest run of zeros → ::</p>
            <p className="break-all font-mono text-emerald-300">{step2}</p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          The double colon <code>::</code> may be used only once per address.
        </p>
      </div>
    </div>
  );
}

/* ---------------- Public / private / special ---------------- */
interface Range { name: string; cidr: string; start: number; mask: number; tone: string; note: string }
const toInt = (p: number[]) => ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
const RANGES: Range[] = [
  { name: "Private (RFC 1918)", cidr: "10.0.0.0/8", start: toInt([10, 0, 0, 0]), mask: 8, tone: "emerald", note: "Home / company LANs. Not routable on the Internet; NAT translates them." },
  { name: "Private (RFC 1918)", cidr: "172.16.0.0/12", start: toInt([172, 16, 0, 0]), mask: 12, tone: "emerald", note: "172.16.0.0 – 172.31.255.255." },
  { name: "Private (RFC 1918)", cidr: "192.168.0.0/16", start: toInt([192, 168, 0, 0]), mask: 16, tone: "emerald", note: "Most home routers use 192.168.0.x or 192.168.1.x." },
  { name: "Loopback", cidr: "127.0.0.0/8", start: toInt([127, 0, 0, 0]), mask: 8, tone: "violet", note: "Points to YOUR OWN machine (localhost). Traffic never leaves the computer." },
  { name: "Link-local (APIPA)", cidr: "169.254.0.0/16", start: toInt([169, 254, 0, 0]), mask: 16, tone: "amber", note: "Self-assigned when DHCP fails. Means 'no DHCP server found'." },
  { name: "Shared / CGNAT", cidr: "100.64.0.0/10", start: toInt([100, 64, 0, 0]), mask: 10, tone: "sky", note: "ISP carrier-grade NAT space." },
  { name: "Multicast", cidr: "224.0.0.0/4", start: toInt([224, 0, 0, 0]), mask: 4, tone: "pink", note: "One sender → a group of receivers." },
  { name: "Limited broadcast", cidr: "255.255.255.255/32", start: toInt([255, 255, 255, 255]), mask: 32, tone: "rose", note: "Delivered to every device on the local network." },
  { name: "'This host' / default route", cidr: "0.0.0.0/8", start: 0, mask: 8, tone: "slate", note: "0.0.0.0 = 'unknown / any'. Used by a DHCP client before it has an IP." },
];

function classify(ip: string): { range?: Range; public: boolean; valid: boolean } {
  const m = ip.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return { public: false, valid: false };
  const p = m.slice(1).map(Number);
  if (p.some((n) => n > 255)) return { public: false, valid: false };
  const n = toInt(p);
  const hit = RANGES.find((r) => {
    const size = 2 ** (32 - r.mask);
    return n >= r.start && n < r.start + size;
  });
  return { range: hit, public: !hit, valid: true };
}

const TONE: Record<string, string> = {
  emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  violet: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  amber: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  sky: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  pink: "border-pink-500/40 bg-pink-500/10 text-pink-300",
  rose: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  slate: "border-slate-600 bg-slate-800/50 text-slate-300",
};

function ScopeTab() {
  const [ip, setIp] = useState("192.168.1.10");
  const res = useMemo(() => classify(ip), [ip]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
          Type any IPv4 address
        </label>
        <input
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 font-mono text-sm text-slate-200 outline-none focus:border-cyan-400"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {["192.168.1.10", "8.8.8.8", "127.0.0.1", "172.20.5.9", "169.254.10.3", "255.255.255.255", "172.32.0.1"].map((x) => (
            <button key={x} onClick={() => setIp(x)} className="rounded-md bg-slate-800 px-2 py-1 font-mono text-[11px] text-slate-400 hover:bg-slate-700">
              {x}
            </button>
          ))}
        </div>
        <div
          className={cn(
            "mt-4 rounded-xl border p-3 text-sm",
            !res.valid
              ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
              : res.public
              ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
              : TONE[res.range!.tone]
          )}
        >
          {!res.valid && "Not a valid IPv4 address."}
          {res.valid && res.public && (
            <>
              <b>Public IP</b> — globally unique, routable on the Internet. Anyone can reach it
              (subject to firewalls).
            </>
          )}
          {res.valid && res.range && (
            <>
              <b>{res.range.name}</b> <span className="font-mono text-xs">({res.range.cidr})</span>
              <p className="mt-1 text-xs opacity-90">{res.range.note}</p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {RANGES.map((r) => (
          <div key={r.cidr} className={cn("rounded-xl border p-3", TONE[r.tone])}>
            <p className="text-xs font-bold">{r.name}</p>
            <p className="font-mono text-sm">{r.cidr}</p>
            <p className="mt-1 text-[11px] opacity-80">{r.note}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">
          Gateway &amp; Broadcast inside a subnet (example 192.168.1.0/24)
        </h4>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <span className="rounded bg-slate-800 px-2 py-1 text-slate-400">.0 network address</span>
          <span className="rounded bg-amber-500/20 px-2 py-1 text-amber-300">.1 default gateway (by convention)</span>
          <span className="rounded bg-cyan-500/20 px-2 py-1 text-cyan-300">.2 – .254 hosts</span>
          <span className="rounded bg-rose-500/20 px-2 py-1 text-rose-300">.255 broadcast</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- CIDR cheat sheet ---------------- */
const CIDRS = [8, 16, 20, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32];
function maskOf(n: number) {
  const m = n === 0 ? 0 : (0xffffffff << (32 - n)) >>> 0;
  return [m >>> 24, (m >>> 16) & 255, (m >>> 8) & 255, m & 255].join(".");
}
function hostsOf(n: number) {
  if (n === 32) return 1;
  if (n === 31) return 2;
  return 2 ** (32 - n) - 2;
}

function CidrTab() {
  const [sel, setSel] = useState(24);
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="mb-2 text-xs text-slate-400">
          The number after the slash = how many of the 32 bits are the{" "}
          <b className="text-cyan-300">network</b> part. The rest are{" "}
          <b className="text-amber-300">host</b> bits.
        </p>
        <div className="grid grid-cols-[repeat(32,minmax(0,1fr))] gap-0.5">
          {Array.from({ length: 32 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex aspect-square items-center justify-center rounded-sm text-[8px] font-bold",
                i < sel ? "bg-cyan-500 text-slate-950" : "bg-amber-500/80 text-slate-950",
                i % 8 === 7 && i < 31 && "mr-1"
              )}
            >
              {i < sel ? "N" : "H"}
            </div>
          ))}
        </div>
        <p className="mt-3 text-center font-mono text-lg font-bold text-white">
          /{sel} → mask {maskOf(sel)} → {hostsOf(sel).toLocaleString()} usable host{hostsOf(sel) === 1 ? "" : "s"}
        </p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 text-slate-500">
            <tr>
              <th className="px-3 py-2">CIDR</th>
              <th className="px-3 py-2">Subnet mask</th>
              <th className="px-3 py-2">Total addresses</th>
              <th className="px-3 py-2">Usable hosts</th>
              <th className="px-3 py-2">Typical use</th>
            </tr>
          </thead>
          <tbody>
            {CIDRS.map((n) => (
              <tr
                key={n}
                onClick={() => setSel(n)}
                className={cn("cursor-pointer border-b border-slate-800/60 hover:bg-slate-800/50", sel === n && "bg-cyan-500/10")}
              >
                <td className="px-3 py-1.5 font-mono font-bold text-cyan-300">/{n}</td>
                <td className="px-3 py-1.5 font-mono text-slate-300">{maskOf(n)}</td>
                <td className="px-3 py-1.5 font-mono text-slate-400">{(2 ** (32 - n)).toLocaleString()}</td>
                <td className="px-3 py-1.5 font-mono text-slate-300">{hostsOf(n).toLocaleString()}</td>
                <td className="px-3 py-1.5 text-slate-500">
                  {{ 8: "Huge network (e.g. 10.0.0.0/8)", 16: "Large campus", 24: "Typical home / office LAN", 30: "Point-to-point router link", 31: "Point-to-point link (RFC 3021)", 32: "A single host / host route" }[n] ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-500">
        Usable hosts = 2<sup>(32 − prefix)</sup> − 2, because the first address is the network address and the last is the broadcast address.
      </p>
    </div>
  );
}

export default function IpAddressing() {
  const [tab, setTab] = useState<Tab>("binary");
  return (
    <div className="flex flex-col gap-4">
      <ModuleHeader
        icon={Hash}
        color="cyan"
        title="IP Addressing Lab"
        subtitle="Binary octets, IPv4 exhaustion vs IPv6, public / private / special addresses, and the CIDR cheat sheet."
      />
      <ScenarioTabs
        value={tab}
        onChange={setTab}
        options={[
          { id: "binary", label: "IPv4 in binary" },
          { id: "v6", label: "IPv4 exhaustion & IPv6" },
          { id: "scope", label: "Public / Private / Special" },
          { id: "cidr", label: "CIDR cheat sheet" },
        ]}
      />
      {tab === "binary" && <BinaryTab />}
      {tab === "v6" && <V6Tab />}
      {tab === "scope" && <ScopeTab />}
      {tab === "cidr" && <CidrTab />}
    </div>
  );
}
