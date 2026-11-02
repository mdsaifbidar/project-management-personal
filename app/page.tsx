"use client";

import { useMemo } from "react";
import Link from "next/link";
import FocusCard from "@/components/FocusCard";
import ItemCard from "@/components/ItemCard";
import QuickCapture from "@/components/QuickCapture";
import WipIndicator from "@/components/WipIndicator";
import { Card, ProgressBar, SectionLabel } from "@/components/primitives";
import { COLORS, SAMPLE_ID_PREFIX } from "@/lib/constants";
import { addDays, periodKeyFor, relativeDay, weekDays, weekdayShort } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import { calendarEntries, goalProgress, groupByDate, overdueItems, plannedMinutes } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { cn, projectProgress, shortMinutes } from "@/lib/utils";

export default function HomePage() {
  const { items, goals, activeProjects, settings, ready, clearSamples, undo } = useStore();
  const { toast } = useUI();
  const today = useToday();

  const week = useMemo(() => weekDays(today, settings.weekStartsOn), [today, settings.weekStartsOn]);
  const byDay = useMemo(() => groupByDate(calendarEntries(items, week[0], week[6])), [items, week]);
  const todays = byDay.get(today) ?? [];
  const overdue = useMemo(() => overdueItems(items, today), [items, today]);
  const upcoming = useMemo(
    () =>
      calendarEntries(items, addDays(today, 1), addDays(today, 7))
        .filter((e) => !e.virtual && e.item.status !== "DONE")
        .slice(0, 6),
    [items, today]
  );
  const periodGoals = goals.filter(
    (g) =>
      (g.period === "MONTH" && g.periodKey === periodKeyFor("MONTH", today)) ||
      (g.period === "WEEK" && g.periodKey === periodKeyFor("WEEK", today)) ||
      (g.period === "YEAR" && g.periodKey === periodKeyFor("YEAR", today))
  );
  const count = (s: string) => items.filter((i) => i.status === s).length;
  const hasSamples = items.some((i) => i.id.startsWith(SAMPLE_ID_PREFIX));
  const hour = new Date().getHours();

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          {hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"}.
        </h1>
        <p className="mt-1 text-[15px] text-stone-500 dark:text-stone-400">Capture everything. Decide what matters. Work on less.</p>
      </header>

      <QuickCapture />

      <FocusCard heading="What should I work on?" />

      {ready ? (
        <>
          {/* Week strip */}
          <Card className="p-4">
            <SectionLabel right={<Link href="/planner" className="text-[12px] text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">Open planner →</Link>}>
              This week
            </SectionLabel>
            <div className="grid grid-cols-7 gap-1.5">
              {week.map((d) => {
                const e = byDay.get(d) ?? [];
                const load = plannedMinutes(e);
                const done = e.filter((x) => x.item.status === "DONE").length;
                return (
                  <Link
                    key={d}
                    href="/planner"
                    className={cn(
                      "rounded-xl border p-2 text-center transition hover:border-stone-300 dark:hover:border-stone-600",
                      d === today ? "border-stone-800 dark:border-stone-300" : "border-stone-100 dark:border-stone-800"
                    )}
                  >
                    <p className="text-[10px] uppercase tracking-wide text-stone-400">{weekdayShort(d)}</p>
                    <p className="text-lg font-semibold text-stone-800 dark:text-stone-100">{Number(d.slice(8))}</p>
                    <p className="text-[10px] text-stone-400">{e.length ? `${done}/${e.length}` : "—"}</p>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                      <div
                        className={cn("h-full", load > settings.dailyCapacityMinutes ? "bg-rose-500" : "bg-emerald-500")}
                        style={{ width: `${Math.min(100, (load / settings.dailyCapacityMinutes) * 100)}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <section>
              <SectionLabel right={<Link href="/today" className="text-[12px] text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">Today →</Link>}>
                Today · {todays.filter((e) => e.item.status !== "DONE").length} open
                {overdue.length ? <span className="text-rose-500">· {overdue.length} overdue</span> : null}
              </SectionLabel>
              <div className="space-y-2">
                {[...overdue.slice(0, 3), ...todays.filter((e) => !e.virtual).map((e) => e.item)]
                  .filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i)
                  .slice(0, 6)
                  .map((i) => (
                    <ItemCard key={i.id} item={i} compact />
                  ))}
                {todays.length + overdue.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-stone-200 p-4 text-center text-sm text-stone-400 dark:border-stone-800">
                    Nothing planned today. <Link href="/today" className="underline">Plan your day</Link>
                  </p>
                ) : null}
              </div>
            </section>

            <section>
              <SectionLabel>Coming up</SectionLabel>
              <div className="space-y-1">
                {upcoming.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-stone-200 p-4 text-center text-sm text-stone-400 dark:border-stone-800">Clear week ahead.</p>
                ) : (
                  upcoming.map((e) => (
                    <div key={`${e.item.id}-${e.kind}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-white dark:hover:bg-stone-900">
                      <span className="w-20 shrink-0 text-[12px] text-stone-400">{relativeDay(e.date, today)}</span>
                      <span className="truncate text-stone-700 dark:text-stone-200">
                        {e.kind === "due" ? "⚑ " : ""}
                        {e.item.title}
                      </span>
                      {e.item.estimatedMinutes ? <span className="ml-auto shrink-0 text-[11px] text-stone-400">{shortMinutes(e.item.estimatedMinutes)}</span> : null}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <section>
              <SectionLabel right={<WipIndicator compact />}>Active projects</SectionLabel>
              <div className="space-y-2">
                {activeProjects.length === 0 ? (
                  <p className="text-sm text-stone-400">No active project. <Link href="/projects" className="underline">Pick one</Link>.</p>
                ) : (
                  activeProjects.map((p) => {
                    const { percent, done, total } = projectProgress(p, items);
                    return (
                      <Link key={p.id} href={`/projects/${p.id}`} className="block rounded-xl border border-stone-200 bg-white p-3 transition hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 font-medium text-stone-800 dark:text-stone-100">
                            <span className={cn("h-2 w-2 rounded-full", COLORS[p.color ?? "stone"].dot)} />
                            {p.title}
                          </span>
                          <span className="text-[12px] text-stone-400">
                            {done}/{total}
                          </span>
                        </div>
                        <ProgressBar percent={percent} className="mt-2" barClass={COLORS[p.color ?? "stone"].bar} />
                      </Link>
                    );
                  })
                )}
              </div>
            </section>
            <section>
              <SectionLabel right={<Link href="/goals" className="text-[12px] text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">Goals →</Link>}>Goals in play</SectionLabel>
              <div className="space-y-2">
                {periodGoals.length === 0 ? (
                  <p className="text-sm text-stone-400">
                    No goals for this week, month or year. <Link href="/goals" className="underline">Set one</Link>.
                  </p>
                ) : (
                  periodGoals.map((g) => (
                    <div key={g.id} className="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate text-stone-800 dark:text-stone-100">🎯 {g.title}</span>
                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-stone-400">{g.period.toLowerCase()}</span>
                      </div>
                      <ProgressBar percent={goalProgress(g, items)} className="mt-2" barClass="bg-emerald-500" />
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[12px] text-stone-400">
            <Link href="/inbox" className="rounded-lg border border-stone-200 px-2.5 py-1.5 hover:border-stone-300 dark:border-stone-800 dark:hover:border-stone-700">
              {count("NOW")} now · {count("NEXT")} next · {count("LATER")} later
            </Link>
            <Link href="/jail" className="rounded-lg border border-stone-200 px-2.5 py-1.5 hover:border-stone-300 dark:border-stone-800 dark:hover:border-stone-700">
              {count("JAIL")} in Idea Jail 🔒
            </Link>
            {hasSamples ? (
              <button
                onClick={() => {
                  clearSamples();
                  toast("Sample data cleared.", { label: "Undo", run: () => void undo() });
                }}
                className="ml-auto underline-offset-2 hover:text-stone-600 hover:underline dark:hover:text-stone-300"
              >
                Clear sample data
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
