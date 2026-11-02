import { RECURRENCE_LABEL } from "./constants";
import { addDays, addMonths, addYears, fromKey } from "./dates";
import { Recurrence } from "./types";

/** The next occurrence strictly after `key`. */
export function nextOccurrence(key: string, rec: Recurrence): string {
  const n = Math.max(1, rec.interval || 1);
  switch (rec.freq) {
    case "DAILY":
      return addDays(key, n);
    case "WEEKDAYS": {
      let next = addDays(key, 1);
      while ([0, 6].includes(fromKey(next).getDay())) next = addDays(next, 1);
      return next;
    }
    case "WEEKLY":
      return addDays(key, 7 * n);
    case "MONTHLY":
      return addMonths(key, n);
    case "YEARLY":
      return addYears(key, n);
  }
}

export function describeRecurrence(rec?: Recurrence): string {
  if (!rec) return "";
  if (rec.freq === "WEEKDAYS") return "Every weekday";
  const unit = RECURRENCE_LABEL[rec.freq];
  return rec.interval > 1 ? `Every ${rec.interval} ${unit}s` : `Every ${unit}`;
}

/** All occurrences of a recurring item within [from, to], starting at `anchor`. */
export function occurrencesBetween(
  anchor: string,
  rec: Recurrence,
  from: string,
  to: string,
  max = 400
): string[] {
  const out: string[] = [];
  let cur = anchor;
  let guard = 0;
  while (cur <= to && guard++ < max) {
    if (cur >= from) out.push(cur);
    cur = nextOccurrence(cur, rec);
  }
  return out;
}
