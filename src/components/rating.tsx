import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Rating({
  value,
  count,
  size = 14,
  className,
}: {
  value: number;
  count?: number;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star size={size} className="fill-gold-500 text-gold-500" />
      <span className="font-medium">{value > 0 ? value.toFixed(1) : "—"}</span>
      {typeof count === "number" ? <span className="muted text-xs">({count})</span> : null}
    </span>
  );
}

export function StarRow({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= value ? "fill-gold-500 text-gold-500" : "text-ink-300"}
        />
      ))}
    </span>
  );
}
