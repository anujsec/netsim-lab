import {
  ArrowRight,
  BookOpenCheck,
  Calculator,
  Cable,
  Globe2,
  Layers,
  Radar,
  Send,
  Network,
} from "lucide-react";
import type { ModuleId } from "../App";
import { cn } from "../utils/cn";

const CARDS: Array<{
  id: ModuleId;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  {
    id: "osi",
    title: "OSI Encapsulation Lab",
    description: "Type a message and watch it get wrapped and unwrapped across all 7 OSI layers.",
    icon: Layers,
    color: "amber",
  },
  {
    id: "dns",
    title: "DNS Resolution Journey",
    description: "Follow a domain lookup from your PC all the way to Root, TLD and Authoritative servers.",
    icon: Globe2,
    color: "cyan",
  },
  {
    id: "tcp",
    title: "TCP Handshake & Teardown",
    description: "Visualize the 3-way handshake and 4-way connection close, packet by packet.",
    icon: Cable,
    color: "violet",
  },
  {
    id: "http",
    title: "Full HTTP Request Journey",
    description: "The complete picture: DNS + TCP + TLS + HTTP across routers, with TTL decrementing hop by hop.",
    icon: Send,
    color: "emerald",
  },
  {
    id: "ping",
    title: "Ping & Traceroute",
    description: "Discover how ICMP TTL expiry reveals every router between you and any destination.",
    icon: Radar,
    color: "orange",
  },
  {
    id: "subnet",
    title: "Subnetting Calculator",
    description: "Interactively compute network/broadcast addresses and see the binary split live.",
    icon: Calculator,
    color: "pink",
  },
  {
    id: "ports",
    title: "Ports & Protocols Reference",
    description: "A searchable cheat-sheet of common ports plus a TCP vs UDP comparison.",
    icon: BookOpenCheck,
    color: "indigo",
  },
];

const COLOR_MAP: Record<string, string> = {
  amber: "bg-amber-500/15 text-amber-400 group-hover:bg-amber-500/25",
  cyan: "bg-cyan-500/15 text-cyan-400 group-hover:bg-cyan-500/25",
  violet: "bg-violet-500/15 text-violet-400 group-hover:bg-violet-500/25",
  emerald: "bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500/25",
  orange: "bg-orange-500/15 text-orange-400 group-hover:bg-orange-500/25",
  pink: "bg-pink-500/15 text-pink-400 group-hover:bg-pink-500/25",
  indigo: "bg-indigo-500/15 text-indigo-400 group-hover:bg-indigo-500/25",
};

export default function Home({ onNavigate }: { onNavigate: (id: ModuleId) => void }) {
  return (
    <div className="flex flex-col gap-10">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-8 sm:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, #06b6d4 0, transparent 35%), radial-gradient(circle at 85% 70%, #8b5cf6 0, transparent 40%)",
          }}
        />
        <div className="relative flex flex-col gap-4">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-300">
            <Network className="h-3.5 w-3.5" /> Interactive Networking Lab
          </span>
          <h1 className="max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl">
            Learn networking by{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              watching packets move
            </span>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Stop memorizing diagrams — simulate them. Step through DNS lookups, TCP handshakes, the
            OSI model, full HTTP requests, and traceroute hop-by-hop, with real headers you can
            inspect at every single step.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onNavigate("http")}
              className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400"
            >
              Start with a full HTTP request <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigate("osi")}
              className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-800"
            >
              Explore the OSI model
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-400">
          Choose a simulator
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c) => (
            <button
              key={c.id}
              onClick={() => onNavigate(c.id)}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-left transition-colors hover:border-slate-700 hover:bg-slate-900"
            >
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl transition-colors", COLOR_MAP[c.color])}>
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">{c.title}</h3>
              <p className="text-xs leading-relaxed text-slate-500">{c.description}</p>
              <span className="mt-auto flex items-center gap-1 text-xs font-bold text-cyan-400 opacity-0 transition-opacity group-hover:opacity-100">
                Open simulator <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
          How to use each simulator
        </h2>
        <div className="grid grid-cols-1 gap-4 text-xs text-slate-400 sm:grid-cols-3">
          <div>
            <p className="mb-1 font-bold text-slate-300">1. Configure</p>
            <p>Type a message, URL, domain, or IP — the simulation rebuilds itself around your input.</p>
          </div>
          <div>
            <p className="mb-1 font-bold text-slate-300">2. Play or step</p>
            <p>Hit play to auto-advance, or use next/prev to go at your own pace. Jump to any step on the timeline.</p>
          </div>
          <div>
            <p className="mb-1 font-bold text-slate-300">3. Inspect</p>
            <p>Watch the packet fly across the topology and read its exact headers in the inspector panel.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
