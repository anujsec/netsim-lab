import { cn } from "../utils/cn";

const COLORS: Record<string, string> = {
  cyan: "bg-cyan-500/15 text-cyan-400",
  amber: "bg-amber-500/15 text-amber-400",
  violet: "bg-violet-500/15 text-violet-400",
  emerald: "bg-emerald-500/15 text-emerald-400",
  orange: "bg-orange-500/15 text-orange-400",
  pink: "bg-pink-500/15 text-pink-400",
  indigo: "bg-indigo-500/15 text-indigo-400",
  rose: "bg-rose-500/15 text-rose-400",
  sky: "bg-sky-500/15 text-sky-400",
  teal: "bg-teal-500/15 text-teal-400",
  lime: "bg-lime-500/15 text-lime-400",
  fuchsia: "bg-fuchsia-500/15 text-fuchsia-400",
  yellow: "bg-yellow-500/15 text-yellow-400",
  red: "bg-red-500/15 text-red-400",
};

export default function ModuleHeader({
  icon: Icon,
  color,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", COLORS[color])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-100">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}
