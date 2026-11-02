"use client";

import { cn } from "@/lib/utils";

export interface Bar {
  key: string;
  label: string;
  value: number;
  /** Optional secondary value shown as a lighter stacked segment. */
  title?: string;
  highlight?: boolean;
}

/** Lightweight dependency-free bar chart. */
export default function BarChart({
  bars,
  height = 140,
  format = (v: number) => String(v),
  barClass = "bg-stone-800 dark:bg-stone-200",
}: {
  bars: Bar[];
  height?: number;
  format?: (v: number) => string;
  barClass?: string;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const showEvery = bars.length > 16 ? Math.ceil(bars.length / 10) : 1;
  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {bars.map((b) => (
          <div key={b.key} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className={cn("w-full rounded-t-[3px] transition-all duration-500", b.value ? barClass : "bg-stone-100 dark:bg-stone-800", b.highlight && "ring-2 ring-rose-400")}
              style={{ height: `${Math.max(b.value ? 4 : 2, (b.value / max) * 100)}%` }}
            />
            <span className="pointer-events-none absolute -top-6 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-stone-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block dark:bg-stone-100 dark:text-stone-900">
              {b.title ?? b.label}: {format(b.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[3px]">
        {bars.map((b, i) => (
          <span key={b.key} className="flex-1 truncate text-center text-[9px] text-stone-400">
            {i % showEvery === 0 ? b.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
