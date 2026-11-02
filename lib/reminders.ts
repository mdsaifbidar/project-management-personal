import { addMinutesToTime, formatTime, fromKey } from "./dates";
import { overdueItems } from "./selectors";
import { Item, ReminderSettings } from "./types";

/**
 * In-app reminders: pure scheduling logic (no timers, no DOM). The engine
 * component calls `dueReminders` every few seconds while the app is open.
 */

export interface Reminder {
  /** Stable id; includes the date+time so rescheduling re-arms it. */
  key: string;
  /** Epoch ms when it should fire. */
  at: number;
  title: string;
  body: string;
  itemId?: string;
  url: string;
}

/** Fire reminders up to this late (e.g. app opened a few minutes after). */
export const CATCH_UP_MS = 10 * 60_000;
/** The morning summary may still fire this long after its time. */
export const DIGEST_WINDOW_MS = 4 * 60 * 60_000;

const at = (dateKey: string, hhmm: string) => {
  const d = fromKey(dateKey);
  const [h, m] = hhmm.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};

export function remindersForDay(items: Item[], rs: ReminderSettings, day: string): Reminder[] {
  if (!rs.enabled) return [];
  const out: Reminder[] = [];

  for (const i of items) {
    if (i.status === "DONE" || i.status === "JAIL" || i.type === "PROJECT") continue;
    if (i.scheduledDate !== day || !i.scheduledTime) continue;
    const start = at(day, i.scheduledTime);
    const range = i.estimatedMinutes
      ? `${formatTime(i.scheduledTime)}–${formatTime(addMinutesToTime(i.scheduledTime, i.estimatedMinutes))}`
      : formatTime(i.scheduledTime);
    const url = `/today?date=${day}`;
    if (rs.leadMinutes > 0) {
      out.push({
        key: `${i.id}:${day}:${i.scheduledTime}:lead${rs.leadMinutes}`,
        at: start - rs.leadMinutes * 60_000,
        title: `In ${rs.leadMinutes} min: ${i.title}`,
        body: range,
        itemId: i.id,
        url,
      });
    }
    if (rs.atStart || rs.leadMinutes === 0) {
      out.push({
        key: `${i.id}:${day}:${i.scheduledTime}:start`,
        at: start,
        title: `Now: ${i.title}`,
        body: range,
        itemId: i.id,
        url,
      });
    }
  }

  if (rs.digest) {
    const open = (i: Item) => i.status !== "DONE" && i.status !== "JAIL" && i.type !== "PROJECT";
    const planned = items.filter((i) => open(i) && i.scheduledDate === day);
    const due = items.filter((i) => open(i) && i.dueDate === day);
    const overdue = overdueItems(items, day);
    if (planned.length + due.length + overdue.length > 0) {
      const parts = [
        planned.length && `${planned.length} planned`,
        due.length && `${due.length} due`,
        overdue.length && `${overdue.length} overdue`,
      ].filter(Boolean);
      const top = [...planned]
        .sort((a, b) => (a.scheduledTime ?? "99").localeCompare(b.scheduledTime ?? "99"))
        .slice(0, 3)
        .map((i) => `• ${i.scheduledTime ? `${formatTime(i.scheduledTime)} ` : ""}${i.title}`);
      out.push({
        key: `digest:${day}`,
        at: at(day, rs.digestTime),
        title: `Today: ${parts.join(" · ")}`,
        body: top.join("\n") || "Open the app to plan your day.",
        url: "/today",
      });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Reminders whose time has come (within the catch-up window) and haven't fired. */
export function dueReminders(list: Reminder[], nowMs: number, fired: Set<string>): Reminder[] {
  return list.filter((r) => {
    if (fired.has(r.key)) return false;
    const late = nowMs - r.at;
    const window = r.key.startsWith("digest:") ? DIGEST_WINDOW_MS : CATCH_UP_MS;
    return late >= 0 && late <= window;
  });
}

/** The next upcoming reminder (for the settings preview). */
export function nextReminder(list: Reminder[], nowMs: number): Reminder | undefined {
  return list.find((r) => r.at > nowMs);
}
