import type { PacketLayer, SimPacket, SimStep } from "../types";

export const COLORS = {
  app: "#22d3ee",
  tls: "#a78bfa",
  tcp: "#8b5cf6",
  ip: "#38bdf8",
  eth: "#f59e0b",
  danger: "#f43f5e",
  ok: "#22c55e",
  warn: "#f97316",
};

export type Fields = Array<[string, string]>;

export function layer(
  key: string,
  name: string,
  short: string,
  color: string,
  fields: Fields = []
): PacketLayer {
  return { key, name, short, color, fields: fields.map(([label, value]) => ({ label, value })) };
}

export const L = {
  eth: (src: string, dst: string, type = "0x0800") =>
    layer("eth", "Data Link — Ethernet", "L2", COLORS.eth, [
      ["Src MAC", src],
      ["Dst MAC", dst],
      ["EtherType", type],
    ]),
  ip: (src: string, dst: string, extra: Fields = []) =>
    layer("ip", "Network — IPv4", "L3", COLORS.ip, [["Src IP", src], ["Dst IP", dst], ...extra]),
  tcp: (sp: string, dp: string, flags: string, extra: Fields = []) =>
    layer("tcp", "Transport — TCP", "L4", COLORS.tcp, [
      ["Src Port", sp],
      ["Dst Port", dp],
      ["Flags", flags],
      ...extra,
    ]),
  udp: (sp: string, dp: string, extra: Fields = []) =>
    layer("udp", "Transport — UDP", "L4", COLORS.tcp, [["Src Port", sp], ["Dst Port", dp], ...extra]),
  app: (name: string, short: string, fields: Fields, color: string = COLORS.app) =>
    layer("app", name, short, color, fields),
};

export function pkt(label: string, color: string, layers: PacketLayer[]): SimPacket {
  return { label, color, layers };
}

interface MkOpts {
  id: string;
  title: string;
  desc: string;
  from: string;
  to?: string;
  log: string;
  badge?: string;
  packet?: SimPacket | null;
  duration?: number;
  nodes?: string[];
  edges?: Array<[string, string]>;
}

/** Small helper that builds a SimStep with sensible defaults (active nodes / edge). */
export function mk(o: MkOpts): SimStep {
  const to = o.to ?? o.from;
  const moving = o.from !== to;
  return {
    id: o.id,
    title: o.title,
    description: o.desc,
    from: o.from,
    to,
    activeNodes: o.nodes ?? Array.from(new Set([o.from, to])),
    activeEdges: o.edges ?? (moving ? [[o.from, to]] : undefined),
    badge: o.badge,
    packet: o.packet ?? null,
    log: o.log,
    duration: o.duration ?? (moving ? 1200 : 900),
  };
}
