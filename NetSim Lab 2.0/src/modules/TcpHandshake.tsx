import { Cable } from "lucide-react";
import SimulatorLayout from "../components/SimulatorLayout";
import type { SimStep, TopoEdge, TopoNode } from "../types";

const nodes: TopoNode[] = [
  { id: "client", label: "Client", sublabel: "CLOSED", x: 20, y: 50, icon: "pc" },
  { id: "server", label: "Server", sublabel: "LISTEN", x: 80, y: 50, icon: "server" },
];
const edges: TopoEdge[] = [{ from: "client", to: "server" }];

function tcpLayer(fields: { label: string; value: string }[], short: string, color = "#8b5cf6") {
  return [
    {
      key: "tcp",
      name: "Transport — TCP Segment",
      short,
      color,
      fields,
    },
  ];
}

const steps: SimStep[] = [
  {
    id: "start",
    title: "Initial state",
    description:
      'The server runs a process that is LISTENING on port 443. The client is CLOSED — it has no active connection yet and wants to start one.',
    from: "client",
    to: "client",
    activeNodes: ["client", "server"],
    badge: "Before handshake",
    packet: null,
    log: "[System] Server socket state: LISTEN (port 443). Client state: CLOSED.",
    duration: 800,
  },
  {
    id: "syn",
    title: "Step 1/3 — Client sends SYN",
    description:
      "The client picks a random Initial Sequence Number (ISN) and sends a segment with the SYN flag set, asking to synchronize sequence numbers and open a connection.",
    from: "client",
    to: "server",
    activeNodes: ["client", "server"],
    activeEdges: [["client", "server"]],
    badge: "SYN",
    packet: {
      label: "SYN",
      color: "#38bdf8",
      layers: tcpLayer(
        [
          { label: "Src Port", value: "51322" },
          { label: "Dst Port", value: "443" },
          { label: "Flags", value: "SYN" },
          { label: "Seq Number", value: "1000 (ISN)" },
          { label: "Window Size", value: "65535" },
        ],
        "SYN",
        "#38bdf8"
      ),
    },
    log: "[Client → Server] SYN, seq=1000. Client state → SYN_SENT.",
    duration: 1300,
  },
  {
    id: "syn-ack",
    title: "Step 2/3 — Server replies SYN-ACK",
    description:
      "The server acknowledges the client's SYN (ack = client seq + 1) and sends its own SYN with its own ISN, proposing to synchronize in the other direction too.",
    from: "server",
    to: "client",
    activeNodes: ["server", "client"],
    activeEdges: [["server", "client"]],
    badge: "SYN-ACK",
    packet: {
      label: "SYN-ACK",
      color: "#a855f7",
      layers: tcpLayer(
        [
          { label: "Src Port", value: "443" },
          { label: "Dst Port", value: "51322" },
          { label: "Flags", value: "SYN, ACK" },
          { label: "Seq Number", value: "5000 (ISN)" },
          { label: "Ack Number", value: "1001" },
        ],
        "SYN-ACK",
        "#a855f7"
      ),
    },
    log: "[Server → Client] SYN, ACK, seq=5000, ack=1001. Server state → SYN_RECEIVED.",
    duration: 1300,
  },
  {
    id: "ack",
    title: "Step 3/3 — Client sends final ACK",
    description:
      "The client acknowledges the server's SYN (ack = server seq + 1). Both sides have now confirmed sequence numbers in both directions — the connection is established!",
    from: "client",
    to: "server",
    activeNodes: ["client", "server"],
    activeEdges: [["client", "server"]],
    badge: "ACK",
    packet: {
      label: "ACK",
      color: "#38bdf8",
      layers: tcpLayer(
        [
          { label: "Src Port", value: "51322" },
          { label: "Dst Port", value: "443" },
          { label: "Flags", value: "ACK" },
          { label: "Seq Number", value: "1001" },
          { label: "Ack Number", value: "5001" },
        ],
        "ACK",
        "#38bdf8"
      ),
    },
    log: "[Client → Server] ACK, seq=1001, ack=5001. Both sides → ESTABLISHED.",
    duration: 1300,
  },
  {
    id: "established",
    title: "Connection ESTABLISHED 🎉",
    description:
      "The 3-way handshake (SYN, SYN-ACK, ACK) is complete. Both client and server can now reliably exchange application data (e.g. an HTTP request) over this connection.",
    from: "client",
    to: "client",
    activeNodes: ["client", "server"],
    badge: "Established",
    packet: null,
    log: "[System] TCP connection ESTABLISHED between client:51322 and server:443.",
    duration: 900,
  },
  {
    id: "data",
    title: "Data transfer begins",
    description:
      "With the connection open, the client can now send real application data — for example an HTTP GET request — carried inside TCP segments with the PSH and ACK flags.",
    from: "client",
    to: "server",
    activeNodes: ["client", "server"],
    activeEdges: [["client", "server"]],
    badge: "Data",
    packet: {
      label: "DATA",
      color: "#22c55e",
      layers: tcpLayer(
        [
          { label: "Flags", value: "PSH, ACK" },
          { label: "Seq Number", value: "1001" },
          { label: "Ack Number", value: "5001" },
          { label: "Payload", value: "GET /index.html HTTP/1.1" },
        ],
        "DATA",
        "#22c55e"
      ),
    },
    log: "[Client → Server] PSH, ACK — application data (e.g. HTTP request) delivered reliably.",
    duration: 1300,
  },
  {
    id: "fin1",
    title: "Teardown 1/4 — Client sends FIN",
    description:
      "When the client has no more data to send, it initiates connection termination with a FIN flag. Client moves to FIN_WAIT_1.",
    from: "client",
    to: "server",
    activeNodes: ["client", "server"],
    activeEdges: [["client", "server"]],
    badge: "FIN",
    packet: {
      label: "FIN",
      color: "#f97316",
      layers: tcpLayer(
        [
          { label: "Flags", value: "FIN, ACK" },
          { label: "Seq Number", value: "1121" },
        ],
        "FIN",
        "#f97316"
      ),
    },
    log: "[Client → Server] FIN, ACK. Client state → FIN_WAIT_1.",
    duration: 1200,
  },
  {
    id: "fin1-ack",
    title: "Teardown 2/4 — Server ACKs the FIN",
    description:
      "The server acknowledges the client's FIN. The server may still have data to send, so it doesn't close immediately — it enters CLOSE_WAIT.",
    from: "server",
    to: "client",
    activeNodes: ["server", "client"],
    activeEdges: [["server", "client"]],
    badge: "ACK",
    packet: {
      label: "ACK",
      color: "#f97316",
      layers: tcpLayer([{ label: "Flags", value: "ACK" }, { label: "Ack Number", value: "1122" }], "ACK", "#f97316"),
    },
    log: "[Server → Client] ACK. Server state → CLOSE_WAIT, Client state → FIN_WAIT_2.",
    duration: 1200,
  },
  {
    id: "fin2",
    title: "Teardown 3/4 — Server sends its own FIN",
    description: "Once the server is also done sending data, it sends its own FIN and enters LAST_ACK.",
    from: "server",
    to: "client",
    activeNodes: ["server", "client"],
    activeEdges: [["server", "client"]],
    badge: "FIN",
    packet: {
      label: "FIN",
      color: "#f97316",
      layers: tcpLayer([{ label: "Flags", value: "FIN, ACK" }, { label: "Seq Number", value: "5301" }], "FIN", "#f97316"),
    },
    log: "[Server → Client] FIN, ACK. Server state → LAST_ACK.",
    duration: 1200,
  },
  {
    id: "fin2-ack",
    title: "Teardown 4/4 — Client ACKs, connection closed",
    description:
      "The client acknowledges the server's FIN, enters TIME_WAIT (to catch any stray packets) and then finally closes. The server, upon receiving this ACK, also closes.",
    from: "client",
    to: "server",
    activeNodes: ["client", "server"],
    activeEdges: [["client", "server"]],
    badge: "ACK",
    packet: {
      label: "ACK",
      color: "#f97316",
      layers: tcpLayer([{ label: "Flags", value: "ACK" }, { label: "Ack Number", value: "5302" }], "ACK", "#f97316"),
    },
    log: "[Client → Server] ACK. Client → TIME_WAIT → CLOSED. Server → CLOSED.",
    duration: 1200,
  },
];

export default function TcpHandshake() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
          <Cable className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-100">TCP Handshake & Teardown</h2>
          <p className="text-sm text-slate-500">
            The 3-way handshake that opens every TCP connection, plus the 4-way teardown that closes it.
          </p>
        </div>
      </div>
      <SimulatorLayout
        nodes={nodes}
        edges={edges}
        steps={steps}
        resetKey="tcp"
        topologyHeight={280}
        sideExtra={
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">
              TCP Flags Cheatsheet
            </h4>
            <ul className="space-y-1">
              <li><span className="font-mono text-cyan-300">SYN</span> — synchronize, start a connection</li>
              <li><span className="font-mono text-cyan-300">ACK</span> — acknowledge received data</li>
              <li><span className="font-mono text-cyan-300">FIN</span> — finish, gracefully close</li>
              <li><span className="font-mono text-cyan-300">PSH</span> — push data to the app immediately</li>
              <li><span className="font-mono text-cyan-300">RST</span> — reset/abort the connection</li>
              <li><span className="font-mono text-cyan-300">URG</span> — urgent pointer is valid</li>
            </ul>
          </div>
        }
      />
    </div>
  );
}
