import { cn } from "@/lib/utils";

export type BarDatum = { label: string; value: number; caption?: string };

/**
 * One measure per chart — two measures with different units get two charts,
 * never a second axis. Every bar carries its value as text, so colour is never
 * the only channel.
 */
export function BarRows({
  data,
  format,
  tone = "brand",
  className,
}: {
  data: BarDatum[];
  format: (value: number) => string;
  tone?: "brand" | "ink" | "gold";
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const fill = {
    brand: "bg-brand-600",
    ink: "bg-ink-700 dark:bg-ink-300",
    gold: "bg-gold-500",
  }[tone];

  return (
    <div className={cn("space-y-2", className)}>
      {data.map((d) => (
        <div key={d.label} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate">{d.label}</span>
          <span className="h-2.5 rounded-full bg-black/[.06] dark:bg-white/[.08]">
            <span
              className={cn("block h-2.5 rounded-full", fill)}
              style={{ width: `${Math.max((d.value / max) * 100, d.value > 0 ? 3 : 0)}%` }}
            />
          </span>
          <span className="text-right font-medium tabular-nums">{format(d.value)}</span>
        </div>
      ))}
      {data.length === 0 ? <p className="muted text-sm">—</p> : null}
    </div>
  );
}

/** A compact daily series. Values are labelled on hover and summarised below. */
export function Sparkbars({
  data,
  format,
}: {
  data: { key: string; value: number }[];
  format: (value: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex h-24 items-end gap-[2px]">
      {data.map((d) => (
        <span
          key={d.key}
          title={`${d.key}: ${format(d.value)}`}
          className="flex-1 rounded-t bg-brand-600"
          style={{ height: `${Math.max((d.value / max) * 100, 2)}%` }}
        />
      ))}
    </div>
  );
}
