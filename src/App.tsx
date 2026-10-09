import { useState } from "react";
import {
  BookOpenCheck,
  Calculator,
  Cable,
  Globe2,
  Home as HomeIcon,
  Layers,
  Menu,
  Network,
  Radar,
  Send,
  X,
} from "lucide-react";
import Home from "./modules/Home";
import OsiExplorer from "./modules/OsiExplorer";
import DnsSimulator from "./modules/DnsSimulator";
import TcpHandshake from "./modules/TcpHandshake";
import HttpFlow from "./modules/HttpFlow";
import PingTraceroute from "./modules/PingTraceroute";
import SubnetCalculator from "./modules/SubnetCalculator";
import PortReference from "./modules/PortReference";
import { cn } from "./utils/cn";

export type ModuleId = "home" | "osi" | "dns" | "tcp" | "http" | "ping" | "subnet" | "ports";

const NAV: Array<{ id: ModuleId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "home", label: "Overview", icon: HomeIcon },
  { id: "osi", label: "OSI Lab", icon: Layers },
  { id: "dns", label: "DNS Resolution", icon: Globe2 },
  { id: "tcp", label: "TCP Handshake", icon: Cable },
  { id: "http", label: "HTTP Journey", icon: Send },
  { id: "ping", label: "Ping / Traceroute", icon: Radar },
  { id: "subnet", label: "Subnet Calculator", icon: Calculator },
  { id: "ports", label: "Ports & Protocols", icon: BookOpenCheck },
];

export default function App() {
  const [active, setActive] = useState<ModuleId>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = (id: ModuleId) => {
    setActive(id);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#05080f] text-slate-200">
      <div className="mx-auto flex max-w-[1500px]">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-slate-800 bg-slate-950/95 backdrop-blur transition-transform lg:static lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500">
              <Network className="h-4.5 w-4.5 text-slate-950" />
            </div>
            <div>
              <p className="text-sm font-black leading-none text-white">NetSim Lab</p>
              <p className="text-[10px] text-slate-500">practical networking</p>
            </div>
            <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 p-3">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                  active === item.id
                    ? "bg-cyan-500/15 text-cyan-300"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-2 border-t border-slate-800 p-4 text-[11px] leading-relaxed text-slate-600">
            Every simulator is interactive: configure an input, press play, and inspect real packet
            headers as they move across the network.
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main */}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-800 bg-[#05080f]/90 px-4 backdrop-blur sm:px-6">
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5 text-slate-300" />
            </button>
            <p className="text-sm font-bold text-slate-300">
              {NAV.find((n) => n.id === active)?.label ?? "Overview"}
            </p>
          </header>
          <main className="p-4 sm:p-6">
            {active === "home" && <Home onNavigate={navigate} />}
            {active === "osi" && <OsiExplorer />}
            {active === "dns" && <DnsSimulator />}
            {active === "tcp" && <TcpHandshake />}
            {active === "http" && <HttpFlow />}
            {active === "ping" && <PingTraceroute />}
            {active === "subnet" && <SubnetCalculator />}
            {active === "ports" && <PortReference />}
            <footer className="mt-10 pb-4 text-center text-[11px] text-slate-700">
              Built for learning — all IPs, domains and packet data are simulated.
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
