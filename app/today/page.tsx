"use client";

import { useMemo, useState } from "react";
import EmptyState from "@/components/EmptyState";
import ItemCard from "@/components/ItemCard";
import QuickCapture from "@/components/QuickCapture";
import Backlog from "@/components/planner/Backlog";
import BigThree from "@/components/planner/BigThree";
import Journal from "@/components/planner/Journal";
import PeriodNav from "@/components/planner/PeriodNav";
import TimeGrid from "@/components/planner/TimeGrid";
import { Card, SectionLabel, Segmented, Count } from "@/components/primitives";
import { EMPTY_STATES } from "@/lib/constants";
import { useToday } from "@/lib/hooks";
import { calendarEntries, overdueItems, periodStats, plannedMinutes } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { cn, shortMinutes } from "@/lib/utils";

export default function TodayPage() {
  const { items, settings, ready } = useStore();
  const today = useToday();
  const [day, setDay] = useState<string | null>(null);
  const [layout, setLayout] = useState<"timeline" | "list">("timeline");
  const key = day ?? today;
  const isToday = key === today;

  const entries = useMemo(() => calendarEntries(items, key, key), [items, key]);
  const stats = useMemo(() => periodStats(items, key, key), [items, key]);
  const overdue = useMemo(() => (isToday ? overdueItems(items, today) : []), [items, today, isToday]);
  const planned = plannedMinutes(entries);
  const capacity = settings.dailyCapacityMinutes;
  const open = entries.filter((e) => !e.virtual && e.item.status !== "DONE");
  const doneCount = stats.completed.length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-stone-500 dark:text-stone-400">{isToday ? greeting : "Planning ahead"} 👋</p>
          <PeriodNav period="DAY" anchor={key} onChange={(k) => setDay(k === today ? null : k)} />
        </div>
        <Segmented
          value={layout}
          onChange={setLayout}
          options={[
            { value: "timeline", label: "Timeline" },
            { value: "list", label: "List" },
          ]}
        />
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Planned"
          value={shortMinutes(planned)}
          sub={`of ${shortMinutes(capacity)} capacity`}
          percent={(planned / capacity) * 100}
          warn={planned > capacity}
        />
        <Stat label="Open" value={String(open.length)} sub={`${entries.filter((e) => e.kind === "due").length} due`} />
        <Stat label="Done" value={String(doneCount)} sub={doneCount ? "nice work" : "let's go"} />
        <Stat label="Focus time" value={shortMinutes(stats.trackedMinutes)} sub="tracked" />
      </div>

      <QuickCapture
        defaults={{ scheduledDate: key, status: "NEXT", type: "TASK" }}
        placeholder={`Add to ${isToday ? "today" : "this day"}…`}
      />

      {!ready ? (
        <div className="h-96 animate-pulse rounded-2xl bg-stone-100 dark:bg-stone-900" />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0 space-y-5">
            <div className="lg:hidden">
              <BigThree periodKey={key} title={isToday ? "Today's Big 3" : "Big 3"} />
            </div>
            {overdue.length ? (
              <section>
                <SectionLabel>
                  <span className="text-rose-500">Overdue</span> <Count n={overdue.length} />
                </SectionLabel>
                <div className="space-y-2">
                  {overdue.map((i) => (
                    <ItemCard key={i.id} item={i} compact />
                  ))}
                </div>
              </section>
            ) : null}

            {layout === "timeline" ? (
              <TimeGrid days={[key]} entries={entries} hourHeight={64} />
            ) : (
              <section>
                <SectionLabel>
                  {isToday ? "Today" : "This day"} <Count n={entries.length} />
                </SectionLabel>
                {entries.length === 0 ? (
                  <EmptyState title={EMPTY_STATES.day} />
                ) : (
                  <div className="space-y-2">
                    {entries.map((e) => (
                      <ItemCard key={`${e.item.id}-${e.kind}-${e.virtual}`} item={e.item} compact />
                    ))}
                  </div>
                )}
              </section>
            )}

            <Journal periodKey={key} title={isToday ? "Today's notes" : "Notes for this day"} />
          </div>

          <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <div className="hidden lg:block">
              <BigThree periodKey={key} title={isToday ? "Today's Big 3" : "Big 3"} />
            </div>
            <Backlog />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  percent,
  warn,
}: {
  label: string;
  value: string;
  sub?: string;
  percent?: number;
  warn?: boolean;
}) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums tracking-tight", warn ? "text-rose-600 dark:text-rose-400" : "text-stone-900 dark:text-stone-100")}>
        {value}
      </p>
      {sub ? <p className="text-[12px] text-stone-400">{sub}</p> : null}
      {percent !== undefined ? (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
          <div className={cn("h-full rounded-full", warn ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${Math.min(100, percent)}%` }} />
        </div>
      ) : null}
    </Card>
  );
}
