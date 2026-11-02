"use client";

import { useState } from "react";
import { addDays, addMinutesToTime, dateLabel, formatTime, parseTimePhrase, startOfWeek, todayKey } from "@/lib/dates";
import { useStore } from "@/lib/store";
import Calendar from "./Calendar";
import { QuickChip, panelInput, useDayLoad } from "./shared";

const TIMES = ["09:00", "11:00", "14:00", "16:00", "19:00"];

/** Date + time in one panel (used from an item's ••• menu). */
export default function SchedulePicker({
  date: initialDate,
  time: initialTime,
  duration,
  onDone,
  onCancel,
}: {
  date?: string;
  time?: string;
  duration?: number;
  onDone: (date: string | undefined, time: string | undefined) => void;
  onCancel: () => void;
}) {
  const { settings } = useStore();
  const load = useDayLoad();
  const today = todayKey();
  const [date, setDate] = useState<string | undefined>(initialDate ?? today);
  const [time, setTime] = useState<string | undefined>(initialTime);
  const [typed, setTyped] = useState("");
  const typedTime = typed.trim() ? parseTimePhrase(typed) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["Today", today],
            ["Tomorrow", addDays(today, 1)],
            ["Next week", addDays(startOfWeek(today, settings.weekStartsOn), 7)],
          ] as const
        ).map(([label, key]) => (
          <QuickChip key={label} active={date === key} onClick={() => setDate(key)}>
            {label}
          </QuickChip>
        ))}
      </div>

      <Calendar value={date} onChange={setDate} weekStartsOn={settings.weekStartsOn} load={load} />

      <div className="space-y-2 border-t border-stone-100 pt-3 dark:border-stone-800">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Time</p>
        <div className="flex flex-wrap gap-1.5">
          <QuickChip active={!time} onClick={() => setTime(undefined)}>
            Any time
          </QuickChip>
          {TIMES.map((t) => (
            <QuickChip key={t} active={time === t} onClick={() => setTime(t)}>
              {formatTime(t)}
            </QuickChip>
          ))}
        </div>
        <input
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            const t = parseTimePhrase(e.target.value);
            if (t) setTime(t);
          }}
          placeholder="Or type a time — 4:30pm"
          aria-label="Type a time"
          className={panelInput}
        />
        {typed.trim() && !typedTime ? <p className="px-1 text-[12px] text-stone-500">Try 4pm or 16:30</p> : null}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-stone-100 pt-3 dark:border-stone-800">
        <p className="min-w-0 truncate text-[13px] text-stone-600 dark:text-stone-300">
          {date ? (
            <>
              <span className="font-semibold text-stone-900 dark:text-stone-100">{dateLabel(date, today)}</span>
              {time ? ` · ${formatTime(time)}${duration ? `–${formatTime(addMinutesToTime(time, duration))}` : ""}` : ""}
            </>
          ) : (
            "No date"
          )}
        </p>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onDone(date, date ? time : undefined)}
            className="rounded-lg bg-stone-900 px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900"
          >
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
