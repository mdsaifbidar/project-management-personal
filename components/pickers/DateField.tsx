"use client";

import { useEffect, useRef, useState } from "react";
import { addDays, addMonths, dateLabel, fromKey, parseDatePhrase, startOfWeek, todayKey } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { IconCalendar, IconFlag } from "../icons";
import Calendar from "./Calendar";
import Popover from "./Popover";
import { QuickChip, Trigger, panelInput, useDayLoad } from "./shared";

/** Calendar panel with quick picks and natural-language typing ("fri", "nov 15"). */
export function DatePanel({
  value,
  onPick,
  allowClear = true,
}: {
  value?: string;
  onPick: (key: string | undefined) => void;
  allowClear?: boolean;
}) {
  const { settings } = useStore();
  const load = useDayLoad();
  const [text, setText] = useState("");
  const today = todayKey();
  const parsed = text.trim() ? parseDatePhrase(text, settings.weekStartsOn) : null;
  // Desktop: focus the type-a-date box. Phones: don't pop the keyboard over the calendar.
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (window.matchMedia("(min-width: 640px)").matches) inputRef.current?.focus();
  }, []);
  const sat = addDays(today, (6 - fromKey(today).getDay() + 7) % 7 || 7);
  const quick: [string, string][] = [
    ["Today", today],
    ["Tomorrow", addDays(today, 1)],
    ["This weekend", sat],
    ["Next week", addDays(startOfWeek(today, settings.weekStartsOn), 7)],
    ["In 2 weeks", addDays(today, 14)],
    ["Next month", addMonths(today, 1)],
  ];

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
          placeholder="Type a date — fri, nov 15, in 3 days"
          aria-label="Type a date"
          className={panelInput}
        />
        {text.trim() ? (
          <p className="mt-1 px-1 text-[12px] text-stone-500">
            {parsed ? (
              <>
                ↵ <span className="font-medium text-stone-800 dark:text-stone-200">{dateLabel(parsed, today)}</span>
              </>
            ) : (
              "Not a date I know yet"
            )}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {quick.map(([label, key]) => (
          <QuickChip key={label} active={value === key} onClick={() => onPick(key)}>
            {label}
          </QuickChip>
        ))}
      </div>
      <Calendar value={value} onChange={onPick} weekStartsOn={settings.weekStartsOn} load={load} />
      {allowClear && value ? (
        <button
          type="button"
          onClick={() => onPick(undefined)}
          className="w-full rounded-lg py-1.5 text-[13px] font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 dark:hover:bg-stone-800 dark:hover:text-stone-200"
        >
          Clear date
        </button>
      ) : null}
    </div>
  );
}

/** Form field that opens the date panel. */
export default function DateField({
  value,
  onChange,
  placeholder = "Pick a date",
  kind = "date",
  allowClear = true,
  label,
}: {
  value?: string;
  onChange: (key: string | undefined) => void;
  placeholder?: string;
  kind?: "date" | "due";
  allowClear?: boolean;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const today = todayKey();
  const overdue = kind === "due" && value && value < today;
  return (
    <>
      <Trigger
        ref={ref}
        open={open}
        onClick={() => setOpen((o) => !o)}
        onClear={allowClear && value ? () => onChange(undefined) : undefined}
        placeholder={!value}
        ariaLabel={`${label}: ${value ? dateLabel(value, today) : "none"}`}
        icon={kind === "due" ? <IconFlag width={15} height={15} /> : <IconCalendar width={15} height={15} />}
      >
        <span className={overdue ? "text-rose-600 dark:text-rose-400" : undefined}>{value ? dateLabel(value, today) : placeholder}</span>
      </Trigger>
      <Popover open={open} onClose={() => setOpen(false)} anchor={ref} label={label} width={304}>
        <DatePanel
          value={value}
          allowClear={allowClear}
          onPick={(k) => {
            onChange(k);
            setOpen(false);
            ref.current?.focus();
          }}
        />
      </Popover>
    </>
  );
}
