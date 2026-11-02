"use client";

import { forwardRef, useMemo } from "react";
import { addMonths, todayKey } from "@/lib/dates";
import { calendarEntries } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { IconX } from "../icons";

/** Planned-item counts per day, for calendar dots. */
export function useDayLoad(): Map<string, number> {
  const { items } = useStore();
  return useMemo(() => {
    const map = new Map<string, number>();
    const t = todayKey();
    for (const e of calendarEntries(items, addMonths(t, -2), addMonths(t, 14))) {
      if (e.item.status !== "DONE") map.set(e.date, (map.get(e.date) ?? 0) + 1);
    }
    return map;
  }, [items]);
}

/** Field-style trigger button shared by the pickers and Select. */
export const Trigger = forwardRef<
  HTMLButtonElement,
  {
    icon?: React.ReactNode;
    children: React.ReactNode;
    placeholder?: boolean;
    open?: boolean;
    disabled?: boolean;
    onClick: () => void;
    onClear?: () => void;
    size?: "md" | "sm";
    ariaLabel?: string;
    className?: string;
  }
>(function Trigger({ icon, children, placeholder, open, disabled, onClick, onClear, size = "md", ariaLabel, className }, ref) {
  return (
    <div className={cn("relative", className)}>
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border bg-white text-left outline-none transition dark:bg-stone-800",
          size === "md" ? "h-[38px] px-3 text-sm" : "h-8 px-2.5 text-[12px]",
          open
            ? "border-stone-400 ring-2 ring-stone-100 dark:border-stone-500 dark:ring-stone-700"
            : "border-stone-200 hover:border-stone-300 dark:border-stone-700 dark:hover:border-stone-600",
          "focus-visible:border-stone-400 focus-visible:ring-2 focus-visible:ring-stone-100 dark:focus-visible:ring-stone-700",
          disabled && "cursor-not-allowed opacity-50",
          onClear && "pr-8"
        )}
      >
        {icon ? <span className="shrink-0 text-stone-400">{icon}</span> : null}
        <span className={cn("min-w-0 flex-1 truncate", placeholder ? "text-stone-400" : "text-stone-900 dark:text-stone-100")}>{children}</span>
      </button>
      {onClear && !disabled ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear"
          className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-700 dark:hover:text-stone-200"
        >
          <IconX width={13} height={13} />
        </button>
      ) : null}
    </div>
  );
});

export function QuickChip({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[12px] font-medium transition",
        active
          ? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
          : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
      )}
    >
      {children}
    </button>
  );
}

export const panelInput =
  "w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:bg-white dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-stone-500";
