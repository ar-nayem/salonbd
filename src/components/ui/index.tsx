import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none";

const variants = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
  dark: "bg-ink-900 text-white hover:bg-ink-800",
  outline: "border border-[var(--line)] hover:bg-black/[.03] dark:hover:bg-white/[.05]",
  ghost: "hover:bg-black/[.04] dark:hover:bg-white/[.06]",
  danger: "bg-red-600 text-white hover:bg-red-700",
  gold: "bg-gold-500 text-ink-950 hover:bg-gold-400",
} as const;

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10",
} as const;

export type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof variants; size?: keyof typeof sizes }) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("card rounded-2xl", className)} {...props} />;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border p-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border px-3 text-sm outline-none focus:border-brand-500",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-sm font-medium", className)} {...props} />;
}

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "green" | "amber" | "red" | "blue";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200",
    green: "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    red: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200",
    blue: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center">
      {icon ? <div className="muted mb-3">{icon}</div> : null}
      <p className="font-medium">{title}</p>
      {body ? <p className="muted mt-1 max-w-sm text-sm">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {action}
    </div>
  );
}
