import { useMemo, useState } from "react";
import { Layers } from "lucide-react";
import SimulatorLayout from "../components/SimulatorLayout";
import type { PacketLayer, SimStep, TopoEdge, TopoNode } from "../types";

const nodes: TopoNode[] = [
  { id: "sender", label: "Your PC", sublabel: "192.168.1.10", x: 18, y: 50, icon: "pc" },
  { id: "receiver", label: "Web Server", sublabel: "93.184.216.34", x: 82, y: 50, icon: "server" },
];
const edges: TopoEdge[] = [{ from: "sender", to: "receiver" }];

const LAYER_META = [
  { key: "l7", name: "Layer 7 — Application", short: "HTTP", color: "#f59e0b" },
  { key: "l6", name: "Layer 6 — Presentation", short: "TLS/Encoding", color: "#fb923c" },
  { key: "l5", name: "Layer 5 — Session", short: "Session mgmt", color: "#ec4899" },
  { key: "l4", name: "Layer 4 — Transport", short: "TCP", color: "#8b5cf6" },
  { key: "l3", name: "Layer 3 — Network", short: "IP", color: "#3b82f6" },
  { key: "l2", name: "Layer 2 — Data Link", short: "Ethernet", color: "#14b8a6" },
  { key: "l1", name: "Layer 1 — Physical", short: "Bits", color: "#94a3b8" },
];

function toBinaryPreview(text: string) {
  return text
    .slice(0, 6)
    .split("")
    .map((c) => c.charCodeAt(0).toString(2).padStart(8, "0"))
    .join(" ") + " …";
}

function buildLayer(key: string, message: string): PacketLayer {
  const meta = LAYER_META.find((m) => m.key === key)!;
  switch (key) {
    case "l7":
      return {
        ...meta,
        fields: [
          { label: "Method", value: "GET /index.html" },
          { label: "Host", value: "www.example.com" },
          { label: "Payload", value: message },
        ],
      };
    case "l6":
      return {
        ...meta,
        fields: [
          { label: "Encoding", value: "UTF-8" },
          { label: "Encryption", value: "TLS 1.3 (ClientHello negotiated)" },
          { label: "Compression", value: "gzip" },
        ],
      };
    case "l5":
      return {
        ...meta,
        fields: [
          { label: "Session ID", value: "sess_8f21ac" },
          { label: "Dialog control", value: "Full-duplex, checkpoints enabled" },
        ],
      };
    case "l4":
      return {
        ...meta,
        fields: [
          { label: "Src Port", value: "51322" },
          { label: "Dst Port", value: "443 (HTTPS)" },
          { label: "Seq Number", value: "1000" },
          { label: "Flags", value: "PSH, ACK" },
        ],
      };
    case "l3":
      return {
        ...meta,
        fields: [
          { label: "Src IP", value: "192.168.1.10" },
          { label: "Dst IP", value: "93.184.216.34" },
          { label: "TTL", value: "64" },
          { label: "Protocol", value: "TCP (6)" },
        ],
      };
    case "l2":
      return {
        ...meta,
        fields: [
          { label: "Src MAC", value: "AA:BB:CC:00:11:22" },
          { label: "Dst MAC", value: "FE:DC:BA:99:88:77 (gateway)" },
          { label: "EtherType", value: "0x0800 (IPv4)" },
          { label: "Trailer", value: "FCS checksum" },
        ],
      };
    default:
      return {
        ...meta,
        fields: [
          { label: "Medium", value: "Copper / Fiber / Radio" },
          { label: "Signal preview", value: toBinaryPreview(message) },
        ],
      };
  }
}

const ORDER = ["l7", "l6", "l5", "l4", "l3", "l2", "l1"];

function buildSteps(message: string): SimStep[] {
  const steps: SimStep[] = [];

  ORDER.forEach((key, i) => {
    const layersSoFar = ORDER.slice(0, i + 1).map((k) => buildLayer(k, message));
    const meta = LAYER_META[i];
    steps.push({
      id: `enc-${key}`,
      title: `Sender encapsulates: ${meta.name}`,
      description: encapsulationExplain(key),
      from: "sender",
      to: "sender",
      activeNodes: ["sender"],
      badge: "Encapsulation",
      packet: {
        label: meta.short,
        color: meta.color,
        layers: [...layersSoFar].reverse(),
      },
      log: `[Sender] Added ${meta.name} header.`,
      duration: 900,
    });
  });

  steps.push({
    id: "wire",
    title: "Bits travel across the physical medium",
    description:
      "The fully encapsulated frame is converted into electrical signals, light pulses, or radio waves and transmitted across the physical link toward the destination.",
    from: "sender",
    to: "receiver",
    activeNodes: ["sender", "receiver"],
    activeEdges: [["sender", "receiver"]],
    badge: "Transmission",
    packet: {
      label: "BITS",
      color: "#94a3b8",
      layers: [...ORDER.map((k) => buildLayer(k, message))].reverse(),
    },
    log: "[Wire] Frame transmitted as raw bits to the receiver.",
    duration: 1600,
  });

  const REV = [...ORDER].reverse();
  REV.forEach((key, i) => {
    const remaining = REV.slice(i).reverse().map((k) => buildLayer(k, message));
    const meta = LAYER_META.find((m) => m.key === key)!;
    steps.push({
      id: `dec-${key}`,
      title: `Receiver decapsulates: ${meta.name}`,
      description: decapsulationExplain(key),
      from: "receiver",
      to: "receiver",
      activeNodes: ["receiver"],
      badge: "Decapsulation",
      packet: {
        label: meta.short,
        color: meta.color,
        layers: [...remaining].reverse(),
      },
      log: `[Receiver] Verified & stripped ${meta.name} header.`,
      duration: 900,
    });
  });

  steps.push({
    id: "done",
    title: "Message delivered to the application",
    description:
      "After all headers are removed in reverse order, the receiving application reads the exact same message the sender's application created. Encapsulation/decapsulation is symmetric!",
    from: "receiver",
    to: "receiver",
    activeNodes: ["receiver"],
    badge: "Complete",
    packet: {
      label: "HTTP",
      color: "#f59e0b",
      layers: [buildLayer("l7", message)],
    },
    log: "[Receiver] Application layer received the original message.",
    duration: 900,
  });

  return steps;
}

function encapsulationExplain(key: string) {
  switch (key) {
    case "l7":
      return "The Application layer creates the actual data your app wants to send — here, an HTTP request containing your message.";
    case "l6":
      return "The Presentation layer formats, encrypts (TLS) and/or compresses the data so it can be safely and efficiently transmitted.";
    case "l5":
      return "The Session layer establishes, manages and keeps track of the conversation (session) between the two applications.";
    case "l4":
      return "The Transport layer (TCP) adds source/destination ports and sequence numbers, breaking data into segments and ensuring reliable delivery.";
    case "l3":
      return "The Network layer (IP) adds source and destination IP addresses so routers know how to forward this packet across networks.";
    case "l2":
      return "The Data Link layer wraps the packet in a frame with source/destination MAC addresses for delivery on the local network segment.";
    default:
      return "The Physical layer converts the entire frame into bits (electrical, optical or radio signals) to be sent over the medium.";
  }
}

function decapsulationExplain(key: string) {
  switch (key) {
    case "l1":
      return "The receiver's NIC reads the raw electrical/optical/radio signal and reconstructs it into a stream of bits.";
    case "l2":
      return "The Data Link layer checks the destination MAC address and the frame checksum (FCS), then strips the Ethernet header.";
    case "l3":
      return "The Network layer checks the destination IP address, decrements wasn't needed (already at destination) and strips the IP header.";
    case "l4":
      return "The Transport layer uses the destination port to hand the segment to the correct application and reassembles/orders segments.";
    case "l5":
      return "The Session layer matches this data to the correct ongoing session/conversation.";
    case "l6":
      return "The Presentation layer decrypts and decompresses the data back into a readable format.";
    default:
      return "The Application layer finally reads the original message.";
  }
}

export default function OsiExplorer() {
  const [message, setMessage] = useState("Hello Server, please send me the homepage!");
  const steps = useMemo(() => buildSteps(message), [message]);

  return (
    <div className="flex flex-col gap-4">
      <ModuleHeader />
      <SimulatorLayout
        nodes={nodes}
        edges={edges}
        steps={steps}
        resetKey={message}
        topologyHeight={260}
        topBar={
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Message your application wants to send
            </label>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value || " ")}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-400"
              placeholder="Type any message…"
            />
            <p className="mt-2 text-xs text-slate-500">
              Watch how this single message gets wrapped with 6 extra headers on its way down the
              OSI stack, travels as raw bits, then gets unwrapped layer-by-layer on the other side.
            </p>
          </div>
        }
      />
    </div>
  );
}

function ModuleHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
        <Layers className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-100">OSI Encapsulation Lab</h2>
        <p className="text-sm text-slate-500">
          See exactly how data is wrapped and unwrapped as it moves down and up the 7 OSI layers.
        </p>
      </div>
    </div>
  );
}
