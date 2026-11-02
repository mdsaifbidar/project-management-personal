"use client";

import { useEffect, useMemo, useState } from "react";
import Backlog from "@/components/planner/Backlog";
import MonthView from "@/components/planner/MonthView";
import PeriodNav from "@/components/planner/PeriodNav";
import TimeGrid from "@/components/planner/TimeGrid";
import YearView from "@/components/planner/YearView";
import { Button, Segmented } from "@/components/primitives";
import { IconPlus } from "@/components/icons";
import { addDays, shortDay, todayKey, weekDays } from "@/lib/dates";
import { useMediaQuery, usePref } from "@/lib/hooks";
import { calendarEntries } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui";

type View = "DAY" | "WEEK" | "MONTH" | "YEAR";

export default function PlannerPage() {
  const { items, settings, ready } = useStore();
  const { openNew } = useUI();
  const [view, setView] = usePref<View>("planner-view", "WEEK");
  const [anchor, setAnchor] = useState(todayKey);
  const [showBacklog, setShowBacklog] = usePref("planner-backlog", true);

  // Deep links: /planner?view=month&date=2026-11-15
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const v = q.get("view")?.toUpperCase();
    if (v === "DAY" || v === "WEEK" || v === "MONTH" || v === "YEAR") setView(v);
    const d = q.get("date");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setAnchor(d);
    // Read once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phones get a 3-day window instead of a cramped 7-day week.
  const narrow = useMediaQuery("(max-width: 639px)");
  const threeDay = narrow && view === "WEEK";
  const days = useMemo(
    () =>
      view === "DAY"
        ? [anchor]
        : threeDay
          ? [anchor, addDays(anchor, 1), addDays(anchor, 2)]
          : weekDays(anchor, settings.weekStartsOn),
    [view, anchor, settings.weekStartsOn, threeDay]
  );
  const entries = useMemo(
    () => (view === "DAY" || view === "WEEK" ? calendarEntries(items, days[0], days[days.length - 1]) : []),
    [items, days, view]
  );

  const goDay = (d: string) => {
    setAnchor(d);
    setView("DAY");
  };

  const withBacklog = showBacklog && view !== "YEAR";

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">Planner</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">Plan by the hour, day, week, month and year.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "DAY", label: "Day" },
              { value: "WEEK", label: narrow ? "3 days" : "Week" },
              { value: "MONTH", label: "Month" },
              { value: "YEAR", label: "Year" },
            ]}
          />
          {view !== "YEAR" ? (
            <Button size="sm" variant={showBacklog ? "primary" : "outline"} onClick={() => setShowBacklog(!showBacklog)}>
              Backlog
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={() => openNew({ type: "TASK", status: "NEXT", scheduledDate: view === "DAY" ? anchor : todayKey() })}
          >
            <IconPlus width={14} height={14} /> Add
          </Button>
        </div>
      </header>

      <PeriodNav
        period={view}
        anchor={anchor}
        onChange={setAnchor}
        stepDays={threeDay ? 3 : undefined}
        label={threeDay ? `${shortDay(days[0])} – ${shortDay(days[2])}` : undefined}
      />

      {!ready ? (
        <div className="h-96 animate-pulse rounded-2xl bg-stone-100 dark:bg-stone-900" />
      ) : (
        <div className={withBacklog ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]" : undefined}>
          <div className="min-w-0">
            {view === "DAY" || view === "WEEK" ? (
              <TimeGrid
                days={days}
                entries={entries}
                hourHeight={view === "DAY" ? 64 : 52}
                onDayClick={view === "WEEK" ? goDay : undefined}
              />
            ) : view === "MONTH" ? (
              <MonthView anchor={anchor} onDayClick={goDay} />
            ) : (
              <YearView
                year={anchor.slice(0, 4)}
                onDayClick={goDay}
                onMonthClick={(m) => {
                  setAnchor(m);
                  setView("MONTH");
                }}
              />
            )}
            <p className="mt-2 text-[11px] text-stone-400">
              {view === "MONTH"
                ? "Drag tasks between days · double-click a day to add · click a date to open it."
                : view === "YEAR"
                  ? "Shading = planned + completed items. Click a day or month to zoom in."
                  : "Click an empty slot to add · drag to move · drag the bottom edge to resize · dashed = upcoming repeats."}
            </p>
          </div>
          {withBacklog ? (
            <div className="lg:sticky lg:top-6 lg:self-start">
              <Backlog />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
