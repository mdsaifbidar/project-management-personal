"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addMinutesToTime, formatTime, parseTimePhrase } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { IconClock } from "../icons";
import Popover from "./Popover";
import { QuickChip, Trigger, panelInput } from "./shared";

const QUICK = ["09:00", "12:00", "15:00", "18:00"];

/** Time list (every 15 min) with typing ("3pm", "15:30") and quick picks. */
export function TimePanel({
  value,
  onPick,
  duration,
  allowClear = true,
}: {
  value?: string;
  onPick: (hhmm: string | undefined) => void;
  /** Minutes; shows the end time next to each slot. */
  duration?: number;
  allowClear?: boolean;
}) {
  const { settings } = useStore();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const parsed = text.trim() ? parseTimePhrase(text) : null;
  const slots = useMemo(() => Array.from({ length: 96 }, (_, i) => addMinutesToTime("00:00", i * 15)), []);

  // Scroll the selected time — or now / the start of your planner day — into view.
  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const h = new Date().getHours();
    const anchor = value ?? `${pad(h >= settings.dayStartHour && h < settings.dayEndHour ? h : settings.dayStartHour)}:00`;
    const [ah, am] = anchor.split(":").map(Number);
    const slot = addMinutesToTime("00:00", Math.floor((ah * 60 + am) / 15) * 15);
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-time="${slot}"]`);
    if (el && list) list.scrollTop = el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2;
  }, [value, settings.dayStartHour, settings.dayEndHour]);

  // Desktop: focus the type-a-time box. Phones: don't pop the keyboard over the list.
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (window.matchMedia("(min-width: 640px)").matches) inputRef.current?.focus();
  }, []);

  return (
    <div className="space-y-3">
      <div>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && parsed) {
              e.preventDefault();
              onPick(parsed);
            }
          }}
          placeholder="Type a time — 3pm, 9:30, 15:45"
          aria-label="Type a time"
          className={panelInput}
        />
        {text.trim() ? (
          <p className="mt-1 px-1 text-[12px] text-stone-500">
            {parsed ? (
              <>
                ↵ <span className="font-medium text-stone-800 dark:text-stone-200">{formatTime(parsed)}</span>
              </>
            ) : (
              "Try 3pm or 15:30"
            )}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {QUICK.map((t) => (
          <QuickChip key={t} active={value === t} onClick={() => onPick(t)}>
            {formatTime(t)}
          </QuickChip>
        ))}
      </div>
      <div ref={listRef} role="listbox" aria-label="Times" className="relative max-h-56 overflow-y-auto rounded-xl border border-stone-100 p-1 dark:border-stone-800">
        {slots.map((t) => {
          const selected = t === value;
          const off = Number(t.slice(0, 2)) < settings.dayStartHour || Number(t.slice(0, 2)) >= settings.dayEndHour;
          return (
            <button
              key={t}
              type="button"
              role="option"
              aria-selected={selected}
              data-time={t}
              onClick={() => onPick(t)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-[13px] tabular-nums transition",
                selected
                  ? "bg-stone-900 font-semibold text-white dark:bg-stone-100 dark:text-stone-900"
                  : off
                    ? "text-stone-400 hover:bg-stone-50 dark:text-stone-500 dark:hover:bg-stone-800"
                    : "text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
              )}
            >
              <span>{formatTime(t)}</span>
              {duration ? (
                <span className={cn("text-[11px]", selected ? "opacity-80" : "text-stone-400")}>→ {formatTime(addMinutesToTime(t, duration))}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      {allowClear && value ? (
        <button
          type="button"
          onClick={() => onPick(undefined)}
          className="w-full rounded-lg py-1.5 text-[13px] font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 dark:hover:bg-stone-800 dark:hover:text-stone-200"
        >
          No specific time
        </button>
      ) : null}
    </div>
  );
}

export default function TimeField({
  value,
  onChange,
  disabled,
  duration,
  label,
  placeholder = "Any time",
}: {
  value?: string;
  onChange: (hhmm: string | undefined) => void;
  disabled?: boolean;
  duration?: number;
  label: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Trigger
        ref={ref}
        open={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onClear={value ? () => onChange(undefined) : undefined}
        placeholder={!value}
        ariaLabel={`${label}: ${value ? formatTime(value) : "none"}`}
        icon={<IconClock width={15} height={15} />}
      >
        {value ? formatTime(value) : placeholder}
      </Trigger>
      <Popover open={open} onClose={() => setOpen(false)} anchor={ref} label={label} width={304}>
        <TimePanel
          value={value}
          duration={duration}
          onPick={(t) => {
            onChange(t);
            setOpen(false);
            ref.current?.focus();
          }}
        />
      </Popover>
    </>
  );
}
