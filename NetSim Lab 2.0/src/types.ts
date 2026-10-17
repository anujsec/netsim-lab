export type NodeId = string;

export type IconKind =
  | "pc"
  | "laptop"
  | "server"
  | "router"
  | "switch"
  | "cloud"
  | "dns"
  | "firewall"
  | "phone"
  | "wifi";

export interface TopoNode {
  id: NodeId;
  label: string;
  sublabel?: string;
  x: number; // percent 0-100
  y: number; // percent 0-100
  icon: IconKind;
}

export interface TopoEdge {
  from: NodeId;
  to: NodeId;
  label?: string;
  dashed?: boolean;
}

export interface PacketLayerField {
  label: string;
  value: string;
}

export interface PacketLayer {
  key: string;
  name: string;
  short: string;
  color: string;
  fields: PacketLayerField[];
}

export interface SimPacket {
  label: string;
  color: string;
  layers: PacketLayer[];
}

export interface SimStep {
  id: string;
  title: string;
  description: string;
  from?: NodeId;
  to?: NodeId;
  activeNodes?: NodeId[];
  activeEdges?: Array<[NodeId, NodeId]>;
  packet?: SimPacket | null;
  log: string;
  duration?: number;
  badge?: string;
}
