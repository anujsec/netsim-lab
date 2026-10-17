import { useState } from "react";
import {
  BookOpenCheck,
  Calculator,
  Cable,
  DoorOpen,
  Fingerprint,
  Gauge,
  Globe2,
  Hash,
  Home as HomeIcon,
  Layers,
  Layers3,
  Lock,
  Mail,
  Menu,
  Network,
  Radar,
  Radio,
  Router as RouterIcon,
  Send,
  ShieldAlert,
  Shuffle,
  Skull,
  Users,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import Home from "./modules/Home";
import OsiExplorer from "./modules/OsiExplorer";
import DnsSimulator from "./modules/DnsSimulator";
import TcpHandshake from "./modules/TcpHandshake";
import HttpFlow from "./modules/HttpFlow";
import PingTraceroute from "./modules/PingTraceroute";
import SubnetCalculator from "./modules/SubnetCalculator";
import PortReference from "./modules/PortReference";
import NetworkDevices from "./modules/NetworkDevices";
import PacketSwitching from "./modules/PacketSwitching";
import ClientServerP2P from "./modules/ClientServerP2P";
import BandwidthLatency from "./modules/BandwidthLatency";
import OsiTcpModels from "./modules/OsiTcpModels";
import IpAddressing from "./modules/IpAddressing";
import NatLab from "./modules/NatLab";
import DhcpLab from "./modules/DhcpLab";
import ArpLab from "./modules/ArpLab";
import PortRanges from "./modules/PortRanges";
import DnsAttacks from "./modules/DnsAttacks";
import SecureProtocols from "./modules/SecureProtocols";
import EmailProtocols from "./modules/EmailProtocols";
import SynFlood from "./modules/SynFlood";
import UdpLab from "./modules/UdpLab";
import AttackSurface from "./modules/AttackSurface";
import { cn } from "./utils/cn";

export type ModuleId =
  | "home"
  | "osi"
  | "dns"
  | "tcp"
  | "http"
  | "ping"
  | "subnet"
  | "ports"
  | "devices"
  | "switching"
  | "clientserver"
  | "bandwidth"
  | "models"
  | "ipaddr"
  | "nat"
  | "dhcp"
  | "arp"
  | "portranges"
  | "dnsattacks"
  | "secureproto"
  | "email"
  | "synflood"
  | "udp"
  | "attacksurface";

const NAV: Array<{
  id: ModuleId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
}> = [
  { id: "home", label: "Overview", icon: HomeIcon },
  { id: "osi", label: "OSI Lab", icon: Layers },
  { id: "dns", label: "DNS Resolution", icon: Globe2 },
  { id: "tcp", label: "TCP Handshake", icon: Cable },
  { id: "http", label: "HTTP Journey", icon: Send },
  { id: "ping", label: "Ping / Traceroute", icon: Radar },
  { id: "subnet", label: "Subnet Calculator", icon: Calculator },
  { id: "ports", label: "Ports & Protocols", icon: BookOpenCheck },
  { id: "devices", label: "Network Types & Devices", icon: RouterIcon, section: "Network Fundamentals" },
  { id: "switching", label: "Packet Switching", icon: Shuffle, section: "Network Fundamentals" },
  { id: "clientserver", label: "Client-Server vs P2P", icon: Users, section: "Network Fundamentals" },
  { id: "bandwidth", label: "Bandwidth vs Latency", icon: Gauge, section: "Network Fundamentals" },
  { id: "models", label: "OSI vs TCP/IP & Attacks", icon: Layers3, section: "Network Fundamentals" },
  { id: "ipaddr", label: "IP Addressing Lab", icon: Hash, section: "IP & Local Network" },
  { id: "nat", label: "Public/Private IP & NAT", icon: Shuffle, section: "IP & Local Network" },
  { id: "dhcp", label: "DHCP & Attacks", icon: Wifi, section: "IP & Local Network" },
  { id: "arp", label: "ARP & MAC Spoofing", icon: Fingerprint, section: "IP & Local Network" },
  { id: "portranges", label: "Port Ranges", icon: DoorOpen, section: "Ports, Protocols & Attacks" },
  { id: "dnsattacks", label: "DNS Poisoning & Tunnelling", icon: ShieldAlert, section: "Ports, Protocols & Attacks" },
  { id: "secureproto", label: "HTTPS / SSH / SFTP vs Plain", icon: Lock, section: "Ports, Protocols & Attacks" },
  { id: "email", label: "Email: SMTP, IMAP, POP3", icon: Mail, section: "Ports, Protocols & Attacks" },
  { id: "synflood", label: "SYN Flood & Cookies", icon: Zap, section: "Transport & Big Picture" },
  { id: "udp", label: "TCP vs UDP & Amplification", icon: Radio, section: "Transport & Big Picture" },
  { id: "attacksurface", label: "Attack Surface Map", icon: Skull, section: "Transport & Big Picture" },
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
            "fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-slate-800 bg-slate-950/95 backdrop-blur transition-transform lg:static lg:translate-x-0 overflow-y-auto",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500">
              <Network className="h-4.5 w-4.5 text-slate-950" />
            </div>
            <div>
              <p className="text-sm font-black leading-none text-white">NetSim Lab 2.0</p>
              <p className="text-[10px] text-slate-500">practical networking</p>
            </div>
            <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 p-3">
            {NAV.map((item, i) => (
              <div key={item.id} className="flex flex-col gap-1">
                {item.section && item.section !== NAV[i - 1]?.section && (
                  <p className="mt-3 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    {item.section}
                  </p>
                )}
                <button
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
              </div>
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
            {active === "devices" && <NetworkDevices />}
            {active === "switching" && <PacketSwitching />}
            {active === "clientserver" && <ClientServerP2P />}
            {active === "bandwidth" && <BandwidthLatency />}
            {active === "models" && <OsiTcpModels />}
            {active === "ipaddr" && <IpAddressing />}
            {active === "nat" && <NatLab />}
            {active === "dhcp" && <DhcpLab />}
            {active === "arp" && <ArpLab />}
            {active === "portranges" && <PortRanges />}
            {active === "dnsattacks" && <DnsAttacks />}
            {active === "secureproto" && <SecureProtocols />}
            {active === "email" && <EmailProtocols />}
            {active === "synflood" && <SynFlood />}
            {active === "udp" && <UdpLab />}
            {active === "attacksurface" && <AttackSurface />}
            <footer className="mt-10 pb-4 text-center text-[11px] text-slate-700">
              Built for learning — all IPs, domains and packet data are simulated.
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
