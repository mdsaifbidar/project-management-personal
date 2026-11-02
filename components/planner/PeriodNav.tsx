"use client";

import { addDays, periodLabel, shiftPeriod, todayKey } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { GoalPeriod } from "@/lib/types";
import { IconChevronLeft, IconChevronRight } from "../icons";

/** ‹ Today › navigator with a label for the current period. */
export default function PeriodNav({
  period,
  anchor,
  onChange,
  stepDays,
  label,
}: {
  period: GoalPeriod | "DAY";
  anchor: string;
  onChange: (key: string) => void;
  /** Step by N days instead of one period (e.g. the 3-day phone view). */
  stepDays?: number;
  label?: string;
}) {
  const { settings } = useStore();
  const shift = (n: number) => (stepDays ? addDays(anchor, n * stepDays) : shiftPeriod(period, anchor, n));
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="inline-flex shrink-0 items-center rounded-lg border border-stone-200 dark:border-stone-800">
        <button
          onClick={() => onChange(shift(-1))}
          aria-label="Previous"
          className="rounded-l-lg p-1.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          <IconChevronLeft width={16} height={16} />
        </button>
        <button
          onClick={() => onChange(todayKey())}
          className="border-x border-stone-200 px-2.5 py-1 text-[12px] font-medium text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          Today
        </button>
        <button
          onClick={() => onChange(shift(1))}
          aria-label="Next"
          className="rounded-r-lg p-1.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          <IconChevronRight width={16} height={16} />
        </button>
      </div>
      <h2 className="truncate text-[15px] font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        {label ?? periodLabel(period, anchor, settings.weekStartsOn)}
      </h2>
    </div>
  );
}
