"use client";

import { useMemo } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/constants";
import { addMonths, diffDays, fromKey, isoToKey, monthGrid, todayKey } from "@/lib/dates";
import { calendarEntries } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { cn, projectProgress } from "@/lib/utils";

const HEAT = [
  "bg-stone-100 dark:bg-stone-800/60",
  "bg-emerald-200 dark:bg-emerald-900",
  "bg-emerald-300 dark:bg-emerald-700",
  "bg-emerald-500 dark:bg-emerald-500",
  "bg-emerald-700 dark:bg-emerald-300",
];

/**
 * Year at a glance: 12 mini-calendars shaded by activity (planned + done),
 * plus a project timeline across the year.
 */
export default function YearView({
  year,
  onDayClick,
  onMonthClick,
}: {
  year: string;
  onDayClick: (day: string) => void;
  onMonthClick: (monthKey: string) => void;
}) {
  const { items, projects, settings } = useStore();
  const today = todayKey();
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const activity = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of calendarEntries(items, from, to)) {
      if (!e.virtual) map.set(e.date, (map.get(e.date) ?? 0) + 1);
    }
    for (const i of items) {
      const k = i.status === "DONE" ? isoToKey(i.completedAt) : undefined;
      if (k && k >= from && k <= to) map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [items, from, to]);

  const level = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4);
  const months = Array.from({ length: 12 }, (_, m) => addMonths(from, m));

  const timeline = projects
    .filter((p) => (p.startDate ?? p.createdAt.slice(0, 10)) <= to && (p.dueDate ?? to) >= from)
    .sort((a, b) => (a.startDate ?? a.createdAt).localeCompare(b.startDate ?? b.createdAt));
  const yearDays = diffDays(to, from) + 1;
  const pos = (key: string) => (Math.max(0, Math.min(yearDays, diffDays(key, from))) / yearDays) * 100;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {months.map((m) => {
          const grid = monthGrid(m, settings.weekStartsOn);
          const mk = m.slice(0, 7);
          const total = grid.filter((d) => d.startsWith(mk)).reduce((s, d) => s + (activity.get(d) ?? 0), 0);
          return (
            <div key={m} className="rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
              <button
                onClick={() => onMonthClick(m)}
                className="mb-2 flex w-full items-baseline justify-between text-left"
              >
                <span className={cn("text-sm font-semibold hover:underline", mk === today.slice(0, 7) ? "text-rose-600 dark:text-rose-400" : "text-stone-800 dark:text-stone-200")}>
                  {fromKey(m).toLocaleDateString(undefined, { month: "long" })}
                </span>
                <span className="text-[10px] text-stone-400">{total || ""}</span>
              </button>
              <div className="grid grid-cols-7 gap-[3px]">
                {grid.map((d) =>
                  d.startsWith(mk) ? (
                    <button
                      key={d}
                      onClick={() => onDayClick(d)}
                      title={`${d}: ${activity.get(d) ?? 0} items`}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-[4px] text-[10px] tabular-nums leading-none transition hover:ring-1 hover:ring-stone-500",
                        HEAT[level(activity.get(d) ?? 0)],
                        level(activity.get(d) ?? 0) >= 3 ? "text-white dark:text-stone-900" : "text-stone-500 dark:text-stone-400",
                        d === today && "font-bold ring-2 ring-rose-500"
                      )}
                    >
                      {fromKey(d).getDate()}
                    </button>
                  ) : (
                    <span key={d} />
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-1.5 text-[10px] text-stone-400">
        Less
        {HEAT.map((c, i) => (
          <span key={i} className={cn("h-2.5 w-2.5 rounded-[3px]", c)} />
        ))}
        More
      </div>

      {timeline.length ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-stone-400">Project timeline · {year}</p>
          <div className="relative">
            <div className="mb-2 grid grid-cols-12 text-[10px] text-stone-400">
              {months.map((m) => (
                <span key={m}>{fromKey(m).toLocaleDateString(undefined, { month: "short" })}</span>
              ))}
            </div>
            <div className="space-y-2">
              {timeline.map((p) => {
                const s = pos(p.startDate ?? p.createdAt.slice(0, 10));
                const e = pos(p.dueDate ?? to);
                const { percent } = projectProgress(p, items);
                return (
                  <Link key={p.id} href={`/projects/${p.id}`} className="relative block h-6">
                    <div
                      className={cn("absolute inset-y-0 flex items-center overflow-hidden rounded-md px-2 text-[11px] font-medium", COLORS[p.color ?? "stone"].soft)}
                      style={{ left: `${s}%`, width: `${Math.max(3, e - s)}%` }}
                      title={p.title}
                    >
                      <div className={cn("absolute inset-y-0 left-0 opacity-25", COLORS[p.color ?? "stone"].bar)} style={{ width: `${percent}%` }} />
                      <span className="relative truncate">{p.title}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
            {today.startsWith(year) ? (
              <div className="pointer-events-none absolute bottom-0 top-5 w-px bg-rose-500" style={{ left: `${pos(today)}%` }} />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
