import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { cn } from "../utils/cn";

function ipToInt(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return null;
    const v = parseInt(p, 10);
    if (v < 0 || v > 255) return null;
    n = n * 256 + v;
  }
  return n >>> 0;
}

function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}

function cidrToMaskInt(cidr: number): number {
  if (cidr <= 0) return 0;
  if (cidr >= 32) return 0xffffffff >>> 0;
  return (0xffffffff << (32 - cidr)) >>> 0;
}

function ipClass(ip: number) {
  const first = (ip >>> 24) & 255;
  if (first < 128) return "A";
  if (first < 192) return "B";
  if (first < 224) return "C";
  if (first < 240) return "D (multicast)";
  return "E (experimental)";
}

function isPrivate(ip: number) {
  const a = (ip >>> 24) & 255;
  const b = (ip >>> 16) & 255;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function toBinaryOctets(n: number) {
  return [24, 16, 8, 0].map((shift) => ((n >>> shift) & 255).toString(2).padStart(8, "0"));
}

const PRESETS = [8, 16, 24, 25, 26, 27, 28, 29, 30];

export default function SubnetCalculator() {
  const [ipStr, setIpStr] = useState("192.168.1.10");
  const [cidr, setCidr] = useState(24);

  const ipInt = useMemo(() => ipToInt(ipStr), [ipStr]);

  const result = useMemo(() => {
    if (ipInt === null) return null;
    const mask = cidrToMaskInt(cidr);
    const network = (ipInt & mask) >>> 0;
    const wildcard = (~mask) >>> 0;
    const broadcast = (network | wildcard) >>> 0;
    const total = Math.pow(2, 32 - cidr);
    let usable: number;
    let firstUsable: string;
    let lastUsable: string;
    if (cidr >= 31) {
      usable = cidr === 32 ? 1 : 2;
      firstUsable = intToIp(network);
      lastUsable = intToIp(broadcast);
    } else {
      usable = total - 2;
      firstUsable = intToIp(network + 1);
      lastUsable = intToIp(broadcast - 1);
    }
    return { mask, network, wildcard, broadcast, total, usable, firstUsable, lastUsable };
  }, [ipInt, cidr]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/15 text-pink-400">
          <Calculator className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-100">Subnetting Calculator & Visualizer</h2>
          <p className="text-sm text-slate-500">
            Enter an IP and CIDR to see network/broadcast addresses and the binary split live.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
              IP Address
            </label>
            <input
              value={ipStr}
              onChange={(e) => setIpStr(e.target.value)}
              className={cn(
                "w-full rounded-lg border bg-slate-950/80 px-3 py-2 font-mono text-sm text-slate-200 outline-none focus:border-pink-400",
                ipInt === null ? "border-red-500/60" : "border-slate-700"
              )}
              placeholder="192.168.1.10"
            />
            {ipInt === null && <p className="mt-1 text-xs text-red-400">Enter a valid IPv4 address.</p>}

            <div className="mt-4 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                CIDR prefix /{cidr}
              </label>
              <span className="font-mono text-xs text-pink-300">
                {result ? intToIp(result.mask) : "—"}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={32}
              value={cidr}
              onChange={(e) => setCidr(parseInt(e.target.value, 10))}
              className="w-full accent-pink-500"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setCidr(p)}
                  className={cn(
                    "rounded-md px-2 py-1 font-mono text-[11px] font-bold",
                    cidr === p ? "bg-pink-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  )}
                >
                  /{p}
                </button>
              ))}
            </div>
          </div>

          {result && ipInt !== null && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-300">
                Binary breakdown
              </h4>
              <div className="space-y-2">
                {toBinaryOctets(ipInt).map((octet, octIdx) => (
                  <div key={octIdx} className="flex items-center gap-2">
                    <span className="w-6 font-mono text-[10px] text-slate-500">
                      {octIdx === 0 ? "" : "."}
                    </span>
                    <div className="flex gap-0.5">
                      {octet.split("").map((bit, bitIdx) => {
                        const globalBit = octIdx * 8 + bitIdx;
                        const isNetwork = globalBit < cidr;
                        return (
                          <span
                            key={bitIdx}
                            className={cn(
                              "flex h-7 w-6 items-center justify-center rounded font-mono text-xs font-bold",
                              isNetwork
                                ? "bg-pink-500/20 text-pink-300 ring-1 ring-pink-500/40"
                                : "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30"
                            )}
                          >
                            {bit}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-4 text-[11px]">
                <span className="flex items-center gap-1.5 text-pink-300">
                  <span className="h-2.5 w-2.5 rounded-sm bg-pink-500/40" /> Network bits ({cidr})
                </span>
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <span className="h-2.5 w-2.5 rounded-sm bg-cyan-500/30" /> Host bits ({32 - cidr})
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {result && ipInt !== null ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-300">Results</h4>
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <Result label="Network Address" value={intToIp(result.network)} />
                <Result label="Broadcast Address" value={intToIp(result.broadcast)} />
                <Result label="Subnet Mask" value={intToIp(result.mask)} />
                <Result label="Wildcard Mask" value={intToIp(result.wildcard)} />
                <Result label="First Usable Host" value={result.firstUsable} />
                <Result label="Last Usable Host" value={result.lastUsable} />
                <Result label="Usable Hosts" value={result.usable.toLocaleString()} />
                <Result label="Total Addresses" value={result.total.toLocaleString()} />
                <Result label="IP Class (legacy)" value={ipClass(ipInt)} />
                <Result label="Address Scope" value={isPrivate(ipInt) ? "Private (RFC1918)" : "Public"} />
              </dl>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-800 text-sm text-slate-500">
              Fix the IP address above to see results.
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs leading-relaxed text-slate-400">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">
              Quick refresher
            </h4>
            <p className="mb-2">
              An IP address is split into a <span className="text-pink-300">network portion</span> and a{" "}
              <span className="text-cyan-300">host portion</span>. The CIDR number (e.g. <code>/24</code>)
              tells you how many bits — starting from the left — belong to the network.
            </p>
            <p className="mb-2">
              The <strong>network address</strong> has all host bits set to 0; the{" "}
              <strong>broadcast address</strong> has all host bits set to 1. Everything in between is
              usable by actual devices.
            </p>
            <p>
              Smaller CIDR number (e.g. /8) = huge network with millions of hosts. Larger CIDR number
              (e.g. /30) = tiny network, often used for point-to-point router links.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-950/60 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="font-mono text-sm text-slate-200">{value}</dd>
    </div>
  );
}
