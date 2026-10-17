import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { cn } from "../utils/cn";

interface PlayerControlsProps {
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
  speed: number;
  onSpeed: (s: number) => void;
  index: number;
  total: number;
  onGoTo: (i: number) => void;
  isFirst: boolean;
  isLast: boolean;
}

export default function PlayerControls({
  playing,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onReset,
  speed,
  onSpeed,
  index,
  total,
  onGoTo,
  isFirst,
  isLast,
}: PlayerControlsProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            onClick={() => onGoTo(i)}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= index ? "bg-cyan-400" : "bg-slate-700 hover:bg-slate-600"
            )}
            title={`Step ${i + 1}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrev}
            disabled={isFirst}
            className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          {playing ? (
            <button
              onClick={onPause}
              className="rounded-lg bg-cyan-500 p-2 text-slate-950 hover:bg-cyan-400"
            >
              <Pause className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={onPlay}
              className="rounded-lg bg-cyan-500 p-2 text-slate-950 hover:bg-cyan-400"
            >
              <Play className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onNext}
            disabled={isLast}
            className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
          >
            <SkipForward className="h-4 w-4" />
          </button>
          <button
            onClick={onReset}
            className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="hidden sm:inline">Speed</span>
          {[0.5, 1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => onSpeed(s)}
              className={cn(
                "rounded-md px-2 py-1 font-mono text-[11px] font-bold",
                speed === s ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              )}
            >
              {s}x
            </button>
          ))}
        </div>
        <span className="font-mono text-xs text-slate-500">
          {index + 1}/{total}
        </span>
      </div>
    </div>
  );
}
