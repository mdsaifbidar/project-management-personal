"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, addMonths, fromKey, monthGrid, startOfMonth, todayKey, weekdayShort } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { IconChevronLeft, IconChevronRight } from "../icons";

/**
 * Month calendar with keyboard support (arrows, PageUp/PageDown, Home/End,
 * Enter). `load` marks busy days with dots (count of planned items).
 */
export default function Calendar({
  value,
  onChange,
  weekStartsOn,
  load,
  autoFocus = false,
}: {
  value?: string;
  onChange: (key: string) => void;
  weekStartsOn: 0 | 1;
  load?: Map<string, number>;
  autoFocus?: boolean;
}) {
  const today = todayKey();
  const [month, setMonth] = useState(startOfMonth(value ?? today));
  const [focus, setFocus] = useState(value ?? today);
  const grid = useMemo(() => monthGrid(month, weekStartsOn), [month, weekStartsOn]);
  const gridRef = useRef<HTMLDivElement>(null);
  const wantFocus = useRef(autoFocus);

  useEffect(() => {
    if (!wantFocus.current) return;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus();
  }, [focus, month]);

  const moveFocus = (key: string) => {
    wantFocus.current = true;
    setFocus(key);
    if (!key.startsWith(month.slice(0, 7))) setMonth(startOfMonth(key));
  };

  const onKey = (e: React.KeyboardEvent) => {
    const map: Record<string, () => string> = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      PageUp: () => addMonths(focus, -1),
      PageDown: () => addMonths(focus, 1),
      Home: () => addDays(focus, -((fromKey(focus).getDay() - weekStartsOn + 7) % 7)),
      End: () => addDays(focus, 6 - ((fromKey(focus).getDay() - weekStartsOn + 7) % 7)),
    };
    if (map[e.key]) {
      e.preventDefault();
      moveFocus(map[e.key]());
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(focus);
    }
  };

  const title = fromKey(month).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, -1))}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100"
        >
          <IconChevronLeft width={16} height={16} />
        </button>
        <button
          type="button"
          onClick={() => {
            setMonth(startOfMonth(today));
            moveFocus(today);
          }}
          className="rounded-full px-3 py-1 text-sm font-semibold text-stone-900 transition hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-800"
          aria-live="polite"
        >
          {title}
        </button>
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, 1))}
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100"
        >
          <IconChevronRight width={16} height={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center">
        {grid.slice(0, 7).map((d) => (
          <span key={d} className="pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            {weekdayShort(d).slice(0, 2)}
          </span>
        ))}
      </div>

      <div ref={gridRef} role="grid" aria-label={title} onKeyDown={onKey} className="grid grid-cols-7 gap-y-0.5">
        {grid.map((d) => {
          const inMonth = d.startsWith(month.slice(0, 7));
          const selected = d === value;
          const isToday = d === today;
          const busy = load?.get(d) ?? 0;
          return (
            <div key={d} className="flex justify-center">
              <button
                type="button"
                data-day={d}
                tabIndex={d === focus ? 0 : -1}
                onClick={() => onChange(d)}
                onFocus={() => setFocus(d)}
                aria-pressed={selected}
                aria-label={fromKey(d).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-full text-[13px] tabular-nums outline-none transition",
                  "focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-stone-900",
                  selected
                    ? "bg-stone-900 font-semibold text-white shadow-sm dark:bg-stone-100 dark:text-stone-900"
                    : isToday
                      ? "font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      : inMonth
                        ? "text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
                        : "text-stone-300 hover:bg-stone-50 dark:text-stone-600 dark:hover:bg-stone-800/50"
                )}
              >
                {fromKey(d).getDate()}
                {busy > 0 ? (
                  <span
                    className={cn(
                      "absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-[2px]",
                      selected ? "opacity-80" : ""
                    )}
                    aria-hidden
                  >
                    {Array.from({ length: Math.min(3, busy) }).map((_, i) => (
                      <span key={i} className={cn("h-[3px] w-[3px] rounded-full", selected ? "bg-white dark:bg-stone-900" : "bg-stone-400 dark:bg-stone-500")} />
                    ))}
                  </span>
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
