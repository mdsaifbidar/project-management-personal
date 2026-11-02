"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/constants";
import { addDays, addMonths, diffDays, fromKey, shortDay, startOfMonth, startOfWeek, todayKey } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { Item } from "@/lib/types";
import { cn, projectProgress } from "@/lib/utils";
import { Segmented } from "./primitives";

type Span = "1M" | "3M" | "6M" | "1Y";
const SPAN_MONTHS: Record<Span, number> = { "1M": 1, "3M": 3, "6M": 6, "1Y": 12 };

/**
 * Gantt-style roadmap: one bar per project from start to deadline, progress
 * fill, milestone diamonds and a today line. Bars without dates are hinted.
 */
export default function ProjectTimeline({ projects }: { projects: Item[] }) {
  const { items, settings } = useStore();
  const [span, setSpan] = useState<Span>("3M");
  const today = todayKey();
  const from = startOfWeek(addDays(today, -14), settings.weekStartsOn);
  const to = addMonths(from, SPAN_MONTHS[span]);
  const total = diffDays(to, from);
  const pct = (key: string) => (Math.max(0, Math.min(total, diffDays(key, from))) / total) * 100;

  const ticks = useMemo(() => {
    const out: { key: string; label: string; major: boolean }[] = [];
    if (span === "1M" || span === "3M") {
      for (let k = from; k <= to; k = addDays(k, 7)) out.push({ key: k, label: shortDay(k), major: false });
    }
    for (let k = startOfMonth(addMonths(from, 1)); k <= to; k = addMonths(k, 1)) {
      out.push({ key: k, label: fromKey(k).toLocaleDateString(undefined, { month: "short", year: k.slice(5, 7) === "01" ? "numeric" : undefined }), major: true });
    }
    return out;
  }, [from, to, span]);

  const milestones = useMemo(
    () => items.filter((i) => i.type === "MILESTONE" && i.dueDate && i.projectId),
    [items]
  );

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Roadmap</p>
        <Segmented size="sm" value={span} onChange={setSpan} options={(["1M", "3M", "6M", "1Y"] as Span[]).map((s) => ({ value: s, label: s }))} />
      </div>
      <div className="overflow-x-auto">
        <div className="relative min-w-[640px]">
          <div className="relative mb-2 h-5 border-b border-stone-100 dark:border-stone-800">
            {ticks.map((t) => (
              <span
                key={`${t.key}-${t.major}`}
                className={cn("absolute -translate-x-1/2 whitespace-nowrap text-[10px]", t.major ? "font-semibold text-stone-500" : "text-stone-400")}
                style={{ left: `${pct(t.key)}%` }}
              >
                {t.label}
              </span>
            ))}
          </div>

          <div className="relative space-y-2 py-1">
            {ticks.filter((t) => t.major).map((t) => (
              <div key={t.key} className="pointer-events-none absolute inset-y-0 w-px bg-stone-100 dark:bg-stone-800" style={{ left: `${pct(t.key)}%` }} />
            ))}
            {projects.map((p) => {
              const start = p.startDate ?? p.createdAt.slice(0, 10);
              const end = p.dueDate ?? addDays(start < today ? today : start, 14);
              if (end < from || start > to) return null;
              const left = pct(start);
              const width = Math.max(2, pct(end) - left);
              const { percent } = projectProgress(p, items);
              const c = COLORS[p.color ?? "stone"];
              return (
                <div key={p.id} className="relative h-8">
                  <Link
                    href={`/projects/${p.id}`}
                    title={`${p.title} · ${shortDay(start)} → ${p.dueDate ? shortDay(p.dueDate) : "no deadline"}`}
                    className={cn(
                      "absolute inset-y-0 flex items-center overflow-hidden rounded-lg px-2 text-[12px] font-medium transition hover:brightness-95",
                      c.soft,
                      !p.dueDate && "border border-dashed border-stone-400/50[mask-image:linear-gradient(to_right,black_75%,transparent)]",
                      p.status === "DONE" && "opacity-50"
                    )}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <span className={cn("absolute inset-y-0 left-0 opacity-30", c.bar)} style={{ width: `${percent}%` }} />
                    <span className="relative truncate">{p.title}</span>
                    <span className="relative ml-auto pl-2 text-[10px] opacity-70">{percent}%</span>
                  </Link>
                  {milestones
                    .filter((m) => m.projectId === p.id && m.dueDate! >= from && m.dueDate! <= to)
                    .map((m) => (
                      <span
                        key={m.id}
                        title={`🏁 ${m.title} · ${shortDay(m.dueDate!)}`}
                        className={cn(
                          "absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-white dark:border-stone-900",
                          m.status === "DONE" ? "bg-emerald-500" : "bg-stone-800 dark:bg-stone-200"
                        )}
                        style={{ left: `${pct(m.dueDate!)}%` }}
                      />
                    ))}
                </div>
              );
            })}
            <div className="pointer-events-none absolute -top-1 bottom-0 z-20 w-px bg-rose-500" style={{ left: `${pct(today)}%` }}>
              <span className="absolute -top-1 -translate-x-1/2 rounded bg-rose-500 px-1 text-[9px] font-semibold text-white">today</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
