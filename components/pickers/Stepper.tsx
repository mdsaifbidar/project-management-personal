"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Number field with − / + buttons (replaces <input type="number">). */
export default function Stepper({
  value,
  onChange,
  min = 0,
  max = 100000,
  step = 1,
  suffix,
  placeholder = "—",
  label,
  className,
  allowEmpty = false,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  placeholder?: string;
  label: string;
  className?: string;
  allowEmpty?: boolean;
}) {
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));
  useEffect(() => setDraft(value === undefined ? "" : String(value)), [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const commit = (raw: string) => {
    if (raw.trim() === "") {
      if (allowEmpty) onChange(undefined);
      else setDraft(value === undefined ? "" : String(value));
      return;
    }
    const n = Number(raw);
    if (Number.isFinite(n)) onChange(clamp(n));
    else setDraft(value === undefined ? "" : String(value));
  };
  const bump = (dir: 1 | -1) => {
    // Empty counts as 0 (estimate + → 15, count + → 1); with a positive min, + lands on min.
    const base = value ?? (min > 0 ? min - step : 0);
    // Snap to the step grid (e.g. 45 → 60 with step 15).
    const next = dir > 0 ? Math.floor(base / step) * step + step : Math.ceil(base / step) * step - step;
    onChange(clamp(Number(next.toFixed(4))));
  };

  const btn =
    "flex h-full w-9 shrink-0 items-center justify-center text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-stone-700 dark:hover:text-stone-100";

  return (
    <div
      className={cn(
        "flex h-[38px] items-stretch overflow-hidden rounded-lg border border-stone-200 bg-white transition focus-within:border-stone-400 focus-within:ring-2 focus-within:ring-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:focus-within:ring-stone-700",
        className
      )}
    >
      <button type="button" aria-label={`Decrease ${label}`} disabled={value !== undefined && value <= min} onClick={() => bump(-1)} className={cn(btn, "border-r border-stone-100 dark:border-stone-700")}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <label className="flex min-w-0 flex-1 items-center justify-center gap-1 px-1">
        <input
          inputMode="decimal"
          aria-label={label}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ""))}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
            else if (e.key === "ArrowUp") {
              e.preventDefault();
              bump(1);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              bump(-1);
            }
          }}
          className="w-full min-w-0 bg-transparent text-center text-sm tabular-nums text-stone-900 outline-none placeholder:text-stone-400 dark:text-stone-100"
        />
        {suffix && draft !== "" ? <span className="shrink-0 text-[12px] text-stone-400">{suffix}</span> : null}
      </label>
      <button type="button" aria-label={`Increase ${label}`} disabled={value !== undefined && value >= max} onClick={() => bump(1)} className={cn(btn, "border-l border-stone-100 dark:border-stone-700")}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <path d="M2.5 6h7M6 2.5v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
