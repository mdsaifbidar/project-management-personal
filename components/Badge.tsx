"use client";

import { COLORS } from "@/lib/constants";
import { formatTime, relativeDay, todayKey } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { ColorKey, Priority } from "@/lib/types";
import { cn } from "@/lib/utils";
import { IconCalendar, IconFlag } from "./icons";

const PRIORITY_STYLE: Record<Priority, string> = {
  URGENT: "bg-rose-600 text-white dark:bg-rose-500",
  HIGH: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  LOW: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
};

export const PRIORITY_DOT: Record<Priority, string> = {
  URGENT: "bg-rose-600",
  HIGH: "bg-rose-400",
  MEDIUM: "bg-amber-400",
  LOW: "bg-stone-300 dark:bg-stone-600",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        PRIORITY_STYLE[priority]
      )}
    >
      {priority}
    </span>
  );
}

export function MetaChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[12px] text-stone-500 dark:text-stone-400", className)}>
      {children}
    </span>
  );
}

export function TagChip({ tag, onClick }: { tag: string; onClick?: () => void }) {
  const { settings } = useStore();
  const color: ColorKey = settings.tagColors[tag] ?? "stone";
  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-px text-[11px] font-medium",
        COLORS[color].soft,
        onClick && "cursor-pointer hover:opacity-80"
      )}
    >
      #{tag}
    </span>
  );
}

export function ColorDot({ color, className }: { color?: ColorKey; className?: string }) {
  return <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", COLORS[color ?? "stone"].dot, className)} />;
}

export function DateChip({
  date,
  time,
  kind,
  done,
}: {
  date: string;
  time?: string;
  kind: "scheduled" | "due";
  done?: boolean;
}) {
  const today = todayKey();
  const overdue = !done && date < today;
  const isToday = date === today;
  return (
    <MetaChip
      className={cn(
        overdue && "font-medium text-rose-600 dark:text-rose-400",
        !overdue && isToday && "font-medium text-emerald-600 dark:text-emerald-400"
      )}
    >
      {kind === "due" ? <IconFlag width={12} height={12} /> : <IconCalendar width={12} height={12} />}
      {kind === "due" ? "Due " : ""}
      {relativeDay(date, today)}
      {time ? ` · ${formatTime(time)}` : ""}
    </MetaChip>
  );
}

export function TypeIcon({ type, className }: { type: string; className?: string }) {
  const { typeMap } = useStore();
  return (
    <span className={className} aria-hidden title={typeMap[type]?.label ?? type}>
      {typeMap[type]?.icon ?? "•"}
    </span>
  );
}
