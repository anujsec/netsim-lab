import { useState } from "react";
import { Users } from "lucide-react";
import SimulatorLayout from "../components/SimulatorLayout";
import ModuleHeader from "../components/ModuleHeader";
import ScenarioTabs from "../components/ScenarioTabs";
import SidePanel from "../components/SidePanel";
import { L, mk, pkt } from "../utils/packets";
import type { SimStep, TopoEdge, TopoNode } from "../types";

type Mode = "cs" | "p2p";

const csNodes: TopoNode[] = [
  { id: "c1", label: "Client 1", x: 10, y: 15, icon: "laptop" },
  { id: "c2", label: "Client 2", x: 10, y: 38, icon: "phone" },
  { id: "c3", label: "Client 3", x: 10, y: 62, icon: "pc" },
  { id: "c4", label: "Client 4", x: 10, y: 85, icon: "laptop" },
  { id: "srv", label: "Central Server", sublabel: "holds ALL the data", x: 75, y: 50, icon: "server" },
];
const csEdges: TopoEdge[] = ["c1", "c2", "c3", "c4"].map((c) => ({ from: c, to: "srv" }));

const csSteps: SimStep[] = [
  mk({
    id: "req1",
    title: "Client 1 requests a file from the server",
    desc: "In the client-server model, clients only ask. One powerful, always-on server owns the data and answers every request.",
    from: "c1",
    to: "srv",
    badge: "Request",
    packet: pkt("GET /video", "#38bdf8", [L.app("Application — HTTP", "REQ", [["Request", "GET /video.mp4"]])]),
    log: "[Client 1 → Server] GET /video.mp4",
  }),
  mk({
    id: "resp1",
    title: "The server sends the whole file",
    desc: "Everything flows from the server to the client. The server uploads the full file.",
    from: "srv",
    to: "c1",
    badge: "Response",
    packet: pkt("200 OK", "#22c55e", [L.app("Application — HTTP", "RESP", [["Status", "200 OK"], ["Size", "100 MB"]])]),
    log: "[Server → Client 1] 200 OK, 100 MB. Server upload used: 100 MB.",
  }),
  {
    ...mk({
      id: "all",
      title: "All 4 clients ask at the same time",
      desc: "Every client hits the same server. The server's CPU, memory and uplink are shared by all of them — it becomes the bottleneck.",
      from: "c3",
      to: "srv",
      badge: "Load",
      packet: pkt("GET /video", "#f59e0b", [L.app("Application — HTTP", "REQ", [["Request", "GET /video.mp4"]])]),
      log: "[Clients 1–4 → Server] 4 simultaneous requests. Server upload needed: 400 MB.",
    }),
    activeNodes: ["c1", "c2", "c3", "c4", "srv"],
    activeEdges: [["c1", "srv"], ["c2", "srv"], ["c3", "srv"], ["c4", "srv"]],
  },
  mk({
    id: "slow",
    title: "More clients = slower for everyone",
    desc: "If the server's bandwidth is 100 Mbps and 4 clients download at once, each client only gets about 25 Mbps. Bigger servers or CDNs are needed to scale.",
    from: "srv",
    nodes: ["srv"],
    badge: "Bottleneck",
    log: "[Server] Bandwidth split 4 ways → ~25 Mbps per client.",
  }),
  {
    ...mk({
      id: "down",
      title: "If the server goes down, nobody gets anything",
      desc: "The server is a single point of failure: when it crashes, every client loses the service. The upside: central control, easy security, backups and updates.",
      from: "c2",
      to: "srv",
      badge: "Failure",
      packet: pkt("TIMEOUT", "#f43f5e", [L.app("Application", "ERR", [["Result", "Connection timed out"]])]),
      log: "[Server] OFFLINE → all clients fail. Single point of failure.",
    }),
    activeNodes: ["srv"],
  },
];

const p2pNodes: TopoNode[] = [
  { id: "p1", label: "Peer 1", sublabel: "wants file", x: 50, y: 12, icon: "laptop" },
  { id: "p2", label: "Peer 2", sublabel: "has chunk A", x: 88, y: 40, icon: "pc" },
  { id: "p3", label: "Peer 3", sublabel: "has chunk B", x: 74, y: 85, icon: "phone" },
  { id: "p4", label: "Peer 4", sublabel: "has chunk C", x: 26, y: 85, icon: "laptop" },
  { id: "p5", label: "Peer 5", sublabel: "has A + B", x: 12, y: 40, icon: "pc" },
];
const p2pEdges: TopoEdge[] = [
  ["p1", "p2"], ["p1", "p3"], ["p1", "p4"], ["p1", "p5"],
  ["p2", "p3"], ["p3", "p4"], ["p4", "p5"], ["p5", "p2"],
].map(([from, to]) => ({ from, to }));

const p2pSteps: SimStep[] = [
  mk({
    id: "start",
    title: "No central server — every peer is both client AND server",
    desc: "In peer-to-peer, each computer holds part of the data and shares it directly with others. Peer 1 wants a file that is spread over several peers.",
    from: "p1",
    nodes: ["p1", "p2", "p3", "p4", "p5"],
    badge: "Start",
    log: "[Network] 5 peers online. File = chunks A, B, C spread across peers.",
  }),
  mk({
    id: "a",
    title: "Peer 1 downloads chunk A from Peer 2",
    desc: "Instead of one big download from one place, the file is fetched in chunks from different peers at the same time.",
    from: "p2",
    to: "p1",
    badge: "Chunk A",
    packet: pkt("CHUNK A", "#38bdf8", [L.app("P2P protocol", "DATA", [["Chunk", "A"], ["From", "Peer 2"]])]),
    log: "[Peer 2 → Peer 1] chunk A",
  }),
  mk({
    id: "b",
    title: "…and chunk B from Peer 5 in parallel",
    desc: "Multiple sources upload small parts at once, so the load is shared and the total speed adds up.",
    from: "p5",
    to: "p1",
    badge: "Chunk B",
    packet: pkt("CHUNK B", "#a78bfa", [L.app("P2P protocol", "DATA", [["Chunk", "B"], ["From", "Peer 5"]])]),
    log: "[Peer 5 → Peer 1] chunk B",
  }),
  mk({
    id: "c",
    title: "…and chunk C from Peer 4",
    desc: "Peer 1 now has A, B and C: the complete file, assembled from three different computers.",
    from: "p4",
    to: "p1",
    badge: "Chunk C",
    packet: pkt("CHUNK C", "#22c55e", [L.app("P2P protocol", "DATA", [["Chunk", "C"], ["From", "Peer 4"]])]),
    log: "[Peer 4 → Peer 1] chunk C. File complete.",
  }),
  mk({
    id: "share",
    title: "Peer 1 becomes a source itself",
    desc: "The more peers have the file, the MORE sources exist — P2P gets stronger as it grows. Peer 3 now downloads from Peer 1.",
    from: "p1",
    to: "p3",
    badge: "Seeding",
    packet: pkt("CHUNK A", "#38bdf8", [L.app("P2P protocol", "DATA", [["Chunk", "A"], ["From", "Peer 1"]])]),
    log: "[Peer 1 → Peer 3] now sharing chunk A. Peers = clients + servers.",
  }),
  {
    ...mk({
      id: "offline",
      title: "Peer 2 goes offline — the network keeps working",
      desc: "No single point of failure: chunk A is still available from Peers 1 and 5. The trade-off: harder to secure, control and guarantee quality or legality of content.",
      from: "p3",
      to: "p5",
      badge: "Resilient",
      packet: pkt("CHUNK A", "#22c55e", [L.app("P2P protocol", "DATA", [["Chunk", "A"], ["From", "Peer 5"]])]),
      log: "[Peer 2] OFFLINE. Peer 3 fetches chunk A from Peer 5 instead.",
    }),
    activeNodes: ["p3", "p5"],
    activeEdges: [["p3", "p4"], ["p4", "p5"]],
  },
];

const ROWS: Array<[string, string, string]> = [
  ["Data location", "Central server", "Spread across peers"],
  ["Scaling", "Needs bigger servers", "More peers = more capacity"],
  ["Failure", "Single point of failure", "Very resilient"],
  ["Control / security", "Easy to manage", "Harder to control"],
  ["Examples", "Websites, e-mail, banking", "BitTorrent, blockchain, Skype (early)"],
];

export default function ClientServerP2P() {
  const [mode, setMode] = useState<Mode>("cs");
  const isCs = mode === "cs";

  return (
    <div className="flex flex-col gap-4">
      <ModuleHeader
        icon={Users}
        color="lime"
        title="Client-Server vs Peer-to-Peer"
        subtitle="Two ways to organise who holds the data and who does the work."
      />
      <SimulatorLayout
        nodes={isCs ? csNodes : p2pNodes}
        edges={isCs ? csEdges : p2pEdges}
        steps={isCs ? csSteps : p2pSteps}
        resetKey={`cs-${mode}`}
        topologyHeight={340}
        topBar={
          <ScenarioTabs
            label="Model"
            value={mode}
            onChange={setMode}
            options={[
              { id: "cs", label: "Client-Server" },
              { id: "p2p", label: "Peer-to-Peer" },
            ]}
          />
        }
        sideExtra={
          <SidePanel title="Side-by-side">
            <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 text-[11px]">
              <div className="grid grid-cols-3 gap-2 px-2 py-1 font-bold text-slate-300">
                <span />
                <span className={isCs ? "text-cyan-300" : ""}>Client-Server</span>
                <span className={!isCs ? "text-cyan-300" : ""}>P2P</span>
              </div>
              {ROWS.map((r) => (
                <div key={r[0]} className="grid grid-cols-3 gap-2 px-2 py-1">
                  <span className="text-slate-500">{r[0]}</span>
                  <span className={isCs ? "text-slate-200" : "text-slate-500"}>{r[1]}</span>
                  <span className={!isCs ? "text-slate-200" : "text-slate-500"}>{r[2]}</span>
                </div>
              ))}
            </div>
          </SidePanel>
        }
      />
    </div>
  );
}
