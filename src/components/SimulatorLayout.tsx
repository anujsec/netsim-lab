import type { ReactNode } from "react";
import { Info } from "lucide-react";
import Topology from "./Topology";
import PacketInspector from "./PacketInspector";
import EventLog from "./EventLog";
import PlayerControls from "./PlayerControls";
import { useStepPlayer } from "../hooks/useStepPlayer";
import type { SimStep, TopoEdge, TopoNode } from "../types";

interface SimulatorLayoutProps {
  nodes: TopoNode[];
  edges: TopoEdge[];
  steps: SimStep[];
  resetKey: string;
  topBar?: ReactNode;
  sideExtra?: ReactNode | ((ctx: { index: number; step: SimStep }) => ReactNode);
  topologyHeight?: number;
}

export default function SimulatorLayout({
  nodes,
  edges,
  steps,
  resetKey,
  topBar,
  sideExtra,
  topologyHeight,
}: SimulatorLayoutProps) {
  const player = useStepPlayer(steps, resetKey);
  const step = player.step;

  const packet =
    step?.packet && step.from && step.to
      ? {
          fromId: step.from,
          toId: step.to,
          progress: player.progress,
          color: step.packet.color,
          label: step.packet.label,
        }
      : null;

  return (
    <div className="flex flex-col gap-4">
      {topBar}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <Topology
            nodes={nodes}
            edges={edges}
            activeEdges={step?.activeEdges}
            activeNodes={step?.activeNodes}
            packet={packet}
            height={topologyHeight}
          />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-1 flex items-center gap-2">
              {step?.badge && (
                <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-300">
                  {step.badge}
                </span>
              )}
              <h3 className="text-sm font-bold text-slate-100">{step?.title}</h3>
            </div>
            <p className="flex gap-2 text-sm leading-relaxed text-slate-400">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
              <span>{step?.description}</span>
            </p>
          </div>
          <PlayerControls
            playing={player.playing}
            onPlay={player.play}
            onPause={player.pause}
            onNext={player.next}
            onPrev={player.prev}
            onReset={player.reset}
            speed={player.speed}
            onSpeed={player.setSpeed}
            index={player.index}
            total={player.total}
            onGoTo={player.goTo}
            isFirst={player.isFirst}
            isLast={player.isLast}
          />
        </div>
        <div className="flex flex-col gap-4">
          <PacketInspector packet={step?.packet} />
          {typeof sideExtra === "function" ? sideExtra({ index: player.index, step }) : sideExtra}
          <EventLog log={player.log} />
        </div>
      </div>
    </div>
  );
}
