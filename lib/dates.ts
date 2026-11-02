import { GoalPeriod } from "./types";

/**
 * Date helpers. Everything works on local "YYYY-MM-DD" keys so planning never
 * drifts across time zones.
 */

const pad = (n: number) => String(n).padStart(2, "0");

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function isDateKey(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export function todayKey(): string {
  return toKey(new Date());
}

/** Local date key for an ISO timestamp. */
export function isoToKey(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : toKey(d);
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function addMonths(key: string, n: number): string {
  const d = fromKey(key);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toKey(d);
}

export function addYears(key: string, n: number): string {
  return addMonths(key, n * 12);
}

export function diffDays(a: string, b: string): number {
  return Math.round((fromKey(a).getTime() - fromKey(b).getTime()) / 86400000);
}

export function startOfWeek(key: string, weekStartsOn: 0 | 1): string {
  const d = fromKey(key);
  const shift = (d.getDay() - weekStartsOn + 7) % 7;
  return addDays(key, -shift);
}

export function weekDays(key: string, weekStartsOn: 0 | 1): string[] {
  const start = startOfWeek(key, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function startOfMonth(key: string): string {
  return key.slice(0, 8) + "01";
}

export function endOfMonth(key: string): string {
  const d = fromKey(key);
  return toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/** 6×7 grid of day keys covering the month of `key`. */
export function monthGrid(key: string, weekStartsOn: 0 | 1): string[] {
  const first = startOfWeek(startOfMonth(key), weekStartsOn);
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export function isoWeek(key: string): { year: number; week: number } {
  const d = fromKey(key);
  const day = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - day + 3); // Thursday of this week
  const year = d.getFullYear();
  const jan4 = new Date(year, 0, 4);
  const week =
    1 +
    Math.round(
      ((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7
    );
  return { year, week };
}

export function periodKeyFor(period: GoalPeriod | "DAY", key: string): string {
  switch (period) {
    case "DAY":
      return key;
    case "WEEK": {
      const { year, week } = isoWeek(key);
      return `${year}-W${pad(week)}`;
    }
    case "MONTH":
      return key.slice(0, 7);
    case "QUARTER":
      return `${key.slice(0, 4)}-Q${Math.floor((Number(key.slice(5, 7)) - 1) / 3) + 1}`;
    case "YEAR":
      return key.slice(0, 4);
  }
}

/** Inclusive [start, end] day keys of the period containing `key`. */
export function periodRange(
  period: GoalPeriod | "DAY",
  key: string,
  weekStartsOn: 0 | 1
): [string, string] {
  switch (period) {
    case "DAY":
      return [key, key];
    case "WEEK": {
      const s = startOfWeek(key, weekStartsOn);
      return [s, addDays(s, 6)];
    }
    case "MONTH":
      return [startOfMonth(key), endOfMonth(key)];
    case "QUARTER": {
      const q = Math.floor((Number(key.slice(5, 7)) - 1) / 3);
      const s = `${key.slice(0, 4)}-${pad(q * 3 + 1)}-01`;
      return [s, endOfMonth(addMonths(s, 2))];
    }
    case "YEAR":
      return [`${key.slice(0, 4)}-01-01`, `${key.slice(0, 4)}-12-31`];
  }
}

export function shiftPeriod(
  period: GoalPeriod | "DAY",
  key: string,
  n: number
): string {
  switch (period) {
    case "DAY":
      return addDays(key, n);
    case "WEEK":
      return addDays(key, n * 7);
    case "MONTH":
      return addMonths(key, n);
    case "QUARTER":
      return addMonths(key, n * 3);
    case "YEAR":
      return addYears(key, n);
  }
}

const fmt = (key: string, opts: Intl.DateTimeFormatOptions) =>
  fromKey(key).toLocaleDateString(undefined, opts);

export function periodLabel(
  period: GoalPeriod | "DAY",
  key: string,
  weekStartsOn: 0 | 1
): string {
  switch (period) {
    case "DAY":
      return fmt(key, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    case "WEEK": {
      const [s, e] = periodRange("WEEK", key, weekStartsOn);
      const { week } = isoWeek(key);
      return `Week ${week} · ${fmt(s, { month: "short", day: "numeric" })} – ${fmt(e, {
        month: "short",
        day: "numeric",
      })}`;
    }
    case "MONTH":
      return fmt(key, { month: "long", year: "numeric" });
    case "QUARTER":
      return periodKeyFor("QUARTER", key).replace("-", " ");
    case "YEAR":
      return key.slice(0, 4);
  }
}

export function shortDay(key: string): string {
  return fmt(key, { month: "short", day: "numeric" });
}

export function weekdayShort(key: string): string {
  return fmt(key, { weekday: "short" });
}

/** "Today", "Tomorrow", "Yesterday", "Mon", or "Nov 14". */
export function relativeDay(key: string, today = todayKey()): string {
  const d = diffDays(key, today);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  if (d > 1 && d < 7) return weekdayShort(key);
  if (key.slice(0, 4) !== today.slice(0, 4))
    return fmt(key, { month: "short", day: "numeric", year: "numeric" });
  return shortDay(key);
}

/** Button label for a picked date: "Today", "Tomorrow", "Mon, Nov 3", "Mon, Jan 5, 2027". */
export function dateLabel(key: string, today = todayKey()): string {
  const d = diffDays(key, today);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  return fmt(key, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: key.slice(0, 4) !== today.slice(0, 4) ? "numeric" : undefined,
  });
}

/**
 * Parse a typed time: "3pm", "3:30 pm", "15:00", "1530", "9", "noon",
 * "midnight". Returns "HH:MM" or null.
 */
export function parseTimePhrase(input: string): string | null {
  const p = input.trim().toLowerCase().replace(/\s+/g, "").replace(/\./g, "");
  if (!p) return null;
  if (p === "noon") return "12:00";
  if (p === "midnight") return "00:00";
  const m = p.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm|a|p)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const ap = m[3]?.[0];
  if (min > 59) return null;
  if (ap) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (ap === "p" ? 12 : 0);
  } else if (h > 23) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function addMinutesToTime(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const t = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** Mid-sentence form: "today", "tomorrow", "on Fri", "on Nov 14". */
export function relativePhrase(key: string, today = todayKey()): string {
  const r = relativeDay(key, today);
  return ["Today", "Tomorrow", "Yesterday"].includes(r) ? r.toLowerCase() : `on ${r}`;
}

export function formatTime(hhmm?: string): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * Parse a natural date phrase ("today", "tmr", "fri", "next week",
 * "in 3 days", "nov 15", "15 nov", "2026-11-15", "eom"). Returns a day key or
 * null when the phrase isn't a date.
 */
export function parseDatePhrase(
  phrase: string,
  weekStartsOn: 0 | 1 = 1,
  today = todayKey()
): string | null {
  const p = phrase.trim().toLowerCase().replace(/\s+/g, " ");
  if (!p) return null;
  if (p === "today" || p === "tod") return today;
  if (p === "tomorrow" || p === "tmr" || p === "tmrw") return addDays(today, 1);
  if (p === "yesterday") return addDays(today, -1);
  if (p === "next week") return addDays(startOfWeek(today, weekStartsOn), 7);
  if (p === "next month") return startOfMonth(addMonths(today, 1));
  if (p === "eow" || p === "end of week") return addDays(startOfWeek(today, weekStartsOn), 6);
  if (p === "eom" || p === "end of month") return endOfMonth(today);
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return p;

  let m = p.match(/^in (\d+) (day|days|week|weeks|month|months)$/);
  if (m) {
    const n = Number(m[1]);
    if (m[2].startsWith("day")) return addDays(today, n);
    if (m[2].startsWith("week")) return addDays(today, n * 7);
    return addMonths(today, n);
  }

  m = p.match(/^(next )?(sun|mon|tue|wed|thu|fri|sat)[a-z]*$/);
  if (m) {
    const target = WEEKDAYS.indexOf(m[2]);
    const cur = fromKey(today).getDay();
    let delta = (target - cur + 7) % 7;
    if (delta === 0) delta = 7;
    if (m[1]) delta += delta < 7 ? 7 : 0;
    return addDays(today, delta);
  }

  m = p.match(/^([a-z]{3})[a-z]* (\d{1,2})$/) || p.match(/^(\d{1,2}) ([a-z]{3})[a-z]*$/);
  if (m) {
    const [mon, day] = /^\d/.test(m[1]) ? [m[2], m[1]] : [m[1], m[2]];
    const mi = MONTHS.indexOf(mon);
    if (mi >= 0) {
      const year = Number(today.slice(0, 4));
      let key = `${year}-${pad(mi + 1)}-${pad(Number(day))}`;
      if (key < today) key = `${year + 1}-${pad(mi + 1)}-${pad(Number(day))}`;
      return key;
    }
  }
  return null;
}
