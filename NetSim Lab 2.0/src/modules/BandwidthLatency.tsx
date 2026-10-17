import { useEffect, useRef, useState } from "react";
import { Gauge, Play, RotateCcw } from "lucide-react";
import ModuleHeader from "../components/ModuleHeader";
import { cn } from "../utils/cn";

const PRESETS = [
  { id: "web", label: "Web page (30 small requests)", bw: 50, lat: 40, size: 2, req: 30 },
  { id: "download", label: "Big download (1 GB)", bw: 100, lat: 40, size: 1000, req: 1 },
  { id: "game", label: "Online game (tiny packets)", bw: 50, lat: 120, size: 0.05, req: 20 },
  { id: "sat", label: "Satellite link", bw: 100, lat: 300, size: 5, req: 10 },
];

function fmt(ms: number) {
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`;
  return `${(ms / 60000).toFixed(1)} min`;
}

export default function BandwidthLatency() {
  const [bw, setBw] = useState(50); // Mbps
  const [lat, setLat] = useState(40); // one-way ms
  const [size, setSize] = useState(2); // MB
  const [req, setReq] = useState(30); // sequential round trips
  const [t, setT] = useState(0); // 0..1 progress of simulation
  const [running, setRunning] = useState(false);
  const raf = useRef<number | null>(null);

  const rtt = lat * 2;
  const waitMs = req * rtt; // time spent waiting on round trips
  const xferMs = ((size * 8) / bw) * 1000; // time to push the bits through the pipe
  const total = waitMs + xferMs;
  const waitFrac = total > 0 ? waitMs / total : 0;

  useEffect(() => {
    setT(0);
    setRunning(false);
  }, [bw, lat, size, req]);

  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    const duration = 4500;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setT(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setRunning(false);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [running]);

  const waiting = t < waitFrac;
  const doneWait = Math.min(1, t / (waitFrac || 1));
  const doneXfer = t <= waitFrac ? 0 : (t - waitFrac) / (1 - waitFrac || 1);
  const pipeH = 8 + Math.log10(bw + 1) * 12; // thicker pipe = more bandwidth
  const pipeL = 20 + Math.min(70, lat / 4); // longer pipe = more latency (visual only)
  const verdict =
    waitFrac > 0.6 ? "Latency-bound: faster bandwidth won't help much — reduce round trips or distance." :
    waitFrac < 0.25 ? "Bandwidth-bound: a fatter pipe would make this much faster." :
    "Mixed: both latency and bandwidth matter here.";

  const slider = (
    label: string,
    value: number,
    set: (n: number) => void,
    min: number,
    max: number,
    step: number,
    unit: string
  ) => (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-bold uppercase tracking-wide text-slate-400">{label}</span>
        <span className="font-mono text-cyan-300">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="w-full accent-cyan-400"
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <ModuleHeader
        icon={Gauge}
        color="yellow"
        title="Bandwidth vs Latency"
        subtitle="Bandwidth is how WIDE the pipe is. Latency is how LONG it is. Move the sliders and see which one limits you."
      />

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
        <span className="mr-1 self-center text-xs font-bold uppercase tracking-wide text-slate-400">Presets</span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setBw(p.bw);
              setLat(p.lat);
              setSize(p.size);
              setReq(p.req);
            }}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-400 hover:bg-slate-700 hover:text-slate-200"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          {/* Pipe visual */}
          <div className="rounded-2xl border border-slate-800 bg-[#070c17] p-5">
            <div className="mb-3 flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Sender</span>
              <span>Receiver</span>
            </div>
            <div className="relative flex h-24 items-center justify-center">
              <div
                className="relative overflow-hidden rounded-full border border-cyan-500/40 bg-slate-900"
                style={{ height: pipeH, width: `${pipeL + 8}%` }}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-emerald-400"
                  style={{ width: `${doneXfer * 100}%` }}
                />
                {waiting && running && (
                  <div
                    className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-amber-400 shadow-[0_0_12px_#f59e0b]"
                    style={{ left: `${(doneWait * req * 7) % 100}%` }}
                  />
                )}
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>pipe thickness = bandwidth ({bw} Mbps)</span>
              <span>pipe length = latency ({lat} ms one-way)</span>
            </div>
          </div>

          {/* timeline */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">
              Where does the time go?
            </h3>
            <div className="relative flex h-8 overflow-hidden rounded-lg border border-slate-800">
              <div className="flex items-center justify-center bg-amber-500/30 text-[10px] font-bold text-amber-200" style={{ width: `${waitFrac * 100}%` }}>
                {waitFrac > 0.12 && "waiting"}
              </div>
              <div className="flex flex-1 items-center justify-center bg-cyan-500/30 text-[10px] font-bold text-cyan-200">
                {waitFrac < 0.88 && "sending data"}
              </div>
              <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${t * 100}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <Stat label="Round-trip time" value={fmt(rtt)} tone="amber" />
              <Stat label="Waiting (RTT × requests)" value={fmt(waitMs)} tone="amber" />
              <Stat label="Sending (size ÷ bandwidth)" value={fmt(xferMs)} tone="cyan" />
              <Stat label="TOTAL" value={fmt(total)} tone="emerald" />
            </div>
            <p className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-xs text-slate-300">
              {verdict}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setT(0);
                setRunning(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400"
            >
              <Play className="h-4 w-4" /> Simulate transfer
            </button>
            <button
              onClick={() => {
                setRunning(false);
                setT(0);
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            {slider("Bandwidth", bw, setBw, 1, 1000, 1, "Mbps")}
            {slider("Latency (one-way)", lat, setLat, 1, 500, 1, "ms")}
            {slider("Data size", size, setSize, 0.05, 1000, 0.05, "MB")}
            {slider("Sequential round trips", req, setReq, 1, 100, 1, "×")}
          </div>
          <div className={cn("rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs leading-relaxed text-slate-400")}>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">Key idea</h4>
            <p>
              <span className="font-bold text-cyan-300">Bandwidth</span> = how much data per second
              (Mbps). <span className="font-bold text-amber-300">Latency</span> = how long one bit
              takes to arrive (ms). A web page with many small requests suffers from latency; a big
              download suffers from low bandwidth. Doubling bandwidth never fixes high latency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "amber" | "cyan" | "emerald" }) {
  const c = { amber: "text-amber-300", cyan: "text-cyan-300", emerald: "text-emerald-300" }[tone];
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className={cn("font-mono text-sm font-bold", c)}>{value}</p>
    </div>
  );
}
