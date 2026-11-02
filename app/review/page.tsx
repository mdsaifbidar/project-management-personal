"use client";

import { useMemo, useState } from "react";
import BarChart, { Bar } from "@/components/BarChart";
import EmptyState from "@/components/EmptyState";
import ItemCard from "@/components/ItemCard";
import PageHeader from "@/components/PageHeader";
import BigThree from "@/components/planner/BigThree";
import Journal from "@/components/planner/Journal";
import PeriodNav from "@/components/planner/PeriodNav";
import { Card, Count, ProgressBar, SectionLabel, Segmented } from "@/components/primitives";
import { COLORS, EMPTY_STATES } from "@/lib/constants";
import { addDays, addMonths, fromKey, periodKeyFor, periodRange, todayKey } from "@/lib/dates";
import { usePref } from "@/lib/hooks";
import { calendarEntries, completionStreak, periodStats } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { GoalPeriod } from "@/lib/types";
import { shortMinutes } from "@/lib/utils";

type P = GoalPeriod | "DAY";

const PROMPTS: Record<P, { notes: string; wins: string; improve: string }> = {
  DAY: { notes: "How did today go?", wins: "Wins today", improve: "Tomorrow I'll…" },
  WEEK: { notes: "Weekly review: what happened, what's next?", wins: "Wins this week", improve: "Next week I'll change…" },
  MONTH: { notes: "Monthly review", wins: "Highlights of the month", improve: "Next month's focus" },
  QUARTER: { notes: "Quarterly review", wins: "Biggest results", improve: "Stop / start / continue" },
  YEAR: { notes: "Year in review", wins: "Proudest moments", improve: "Themes for next year" },
};

export default function ReviewPage() {
  const { items, settings, projects } = useStore();
  const [period, setPeriod] = usePref<P>("review-period", "WEEK");
  const [anchor, setAnchor] = useState(todayKey);
  const [from, to] = periodRange(period, anchor, settings.weekStartsOn);
  const key = periodKeyFor(period, anchor);
  const today = todayKey();

  const stats = useMemo(() => periodStats(items, from, to), [items, from, to]);
  const planned = useMemo(
    () => calendarEntries(items, from, to).filter((e) => !e.virtual && e.kind === "scheduled"),
    [items, from, to]
  );
  const plannedDone = planned.filter((e) => e.item.status === "DONE").length;
  const streak = useMemo(() => completionStreak(items, today), [items, today]);

  const bars: { done: Bar[]; minutes: Bar[] } = useMemo(() => {
    const done: Bar[] = [];
    const minutes: Bar[] = [];
    if (period === "YEAR" || period === "QUARTER") {
      for (let m = from; m <= to; m = addMonths(m, 1)) {
        const mk = m.slice(0, 7);
        let d = 0;
        let mins = 0;
        stats.byDay.forEach((v, k) => {
          if (k.startsWith(mk)) {
            d += v.done;
            mins += v.minutes;
          }
        });
        const label = fromKey(m).toLocaleDateString(undefined, { month: "short" });
        done.push({ key: mk, label, value: d, highlight: today.startsWith(mk) });
        minutes.push({ key: mk, label, value: mins, highlight: today.startsWith(mk) });
      }
    } else {
      for (let d = from; d <= to; d = addDays(d, 1)) {
        const v = stats.byDay.get(d) ?? { done: 0, minutes: 0 };
        const label = period === "WEEK" ? fromKey(d).toLocaleDateString(undefined, { weekday: "short" }) : String(fromKey(d).getDate());
        done.push({ key: d, label, value: v.done, title: d, highlight: d === today });
        minutes.push({ key: d, label, value: v.minutes, title: d, highlight: d === today });
      }
    }
    return { done, minutes };
  }, [stats, from, to, period, today]);

  const maxProj = Math.max(1, ...stats.byProject.map((p) => p.done));

  return (
    <div className="space-y-6">
      <PageHeader title="Review" subtitle="Look back to steer forward. Daily, weekly, monthly, yearly." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodNav period={period} anchor={anchor} onChange={setAnchor} />
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { value: "DAY", label: "Day" },
            { value: "WEEK", label: "Week" },
            { value: "MONTH", label: "Month" },
            { value: "QUARTER", label: "Qtr" },
            { value: "YEAR", label: "Year" },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Completed" value={String(stats.completed.length)} sub={`${stats.created} captured`} />
        <Tile label="Focus time" value={shortMinutes(stats.trackedMinutes)} sub="tracked" />
        <Tile
          label="Plan hit rate"
          value={planned.length ? `${Math.round((plannedDone / planned.length) * 100)}%` : "—"}
          sub={`${plannedDone}/${planned.length} planned items done`}
        />
        <Tile label="Streak" value={`${streak} 🔥`} sub="days in a row with a finish" />
      </div>

      {period !== "DAY" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="p-4">
            <SectionLabel>Completed</SectionLabel>
            <BarChart bars={bars.done} />
          </Card>
          <Card className="p-4">
            <SectionLabel>Focus time</SectionLabel>
            <BarChart bars={bars.minutes} format={shortMinutes} barClass="bg-emerald-500" />
          </Card>
        </div>
      ) : null}

      {stats.byProject.length ? (
        <Card className="p-4">
          <SectionLabel>Where the work went</SectionLabel>
          <div className="space-y-2.5">
            {stats.byProject.slice(0, 8).map((p) => {
              const proj = p.id ? projects.find((x) => x.id === p.id) : undefined;
              return (
                <div key={p.id ?? "none"} className="flex items-center gap-3 text-sm">
                  <span className="w-40 shrink-0 truncate text-stone-700 dark:text-stone-200">{proj?.title ?? "Standalone tasks"}</span>
                  <ProgressBar percent={(p.done / maxProj) * 100} className="h-2 flex-1" barClass={COLORS[proj?.color ?? "stone"].bar} />
                  <span className="w-28 shrink-0 text-right text-[12px] tabular-nums text-stone-400">
                    {p.done} done{p.minutes ? ` · ${shortMinutes(p.minutes)}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-5">
          <Journal periodKey={key} title="Reflection" prompts={PROMPTS[period]} showRatings={period === "DAY" || period === "WEEK"} />
          <section>
            <SectionLabel>
              Finished <Count n={stats.completed.length} />
            </SectionLabel>
            {stats.completed.length === 0 ? (
              <EmptyState title={EMPTY_STATES.done} />
            ) : (
              <div className="space-y-2">
                {stats.completed.slice(0, 50).map((i) => (
                  <ItemCard key={i.id} item={i} compact draggable={false} />
                ))}
              </div>
            )}
          </section>
        </div>
        <div className="space-y-5">
          <BigThree periodKey={key} title={`Big 3 for this ${period === "DAY" ? "day" : period.toLowerCase()}`} />
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-stone-900 dark:text-stone-100">{value}</p>
      {sub ? <p className="text-[11px] text-stone-400">{sub}</p> : null}
    </Card>
  );
}
