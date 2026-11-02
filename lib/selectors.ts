import { PRIORITY_WEIGHT } from "./constants";
import { addDays, isoToKey } from "./dates";
import { occurrencesBetween } from "./recurrence";
import { Goal, Item } from "./types";
import { projectProgress } from "./utils";

export const isOpen = (i: Item) => i.status !== "DONE" && i.status !== "JAIL";
export const isProject = (i: Item) => i.type === "PROJECT";

export interface CalendarEntry {
  item: Item;
  date: string;
  kind: "scheduled" | "due";
  /** A projected future occurrence of a recurring item. */
  virtual: boolean;
}

/**
 * Everything that lands on days within [from, to]: scheduled items (open or
 * done), due dates of unscheduled items, and projected recurrences.
 */
export function calendarEntries(items: Item[], from: string, to: string): CalendarEntry[] {
  const out: CalendarEntry[] = [];
  for (const item of items) {
    if (item.status === "JAIL" || isProject(item)) continue;
    const d = item.scheduledDate;
    if (d && d >= from && d <= to) out.push({ item, date: d, kind: "scheduled", virtual: false });
    if (item.dueDate && item.dueDate !== d && item.dueDate >= from && item.dueDate <= to) {
      if (!d || item.status !== "DONE") out.push({ item, date: item.dueDate, kind: "due", virtual: false });
    }
    if (item.recurrence && d && item.status !== "DONE") {
      for (const occ of occurrencesBetween(d, item.recurrence, from, to)) {
        if (occ !== d) out.push({ item, date: occ, kind: "scheduled", virtual: true });
      }
    }
  }
  return out.sort(compareEntries);
}

function compareEntries(a: CalendarEntry, b: CalendarEntry) {
  const ta = a.kind === "scheduled" ? a.item.scheduledTime ?? "99" : "99";
  const tb = b.kind === "scheduled" ? b.item.scheduledTime ?? "99" : "99";
  return (
    a.date.localeCompare(b.date) ||
    ta.localeCompare(tb) ||
    Number(a.item.status === "DONE") - Number(b.item.status === "DONE") ||
    PRIORITY_WEIGHT[b.item.priority] - PRIORITY_WEIGHT[a.item.priority]
  );
}

export function groupByDate(entries: CalendarEntry[]): Map<string, CalendarEntry[]> {
  const map = new Map<string, CalendarEntry[]>();
  for (const e of entries) {
    const arr = map.get(e.date) ?? [];
    arr.push(e);
    map.set(e.date, arr);
  }
  return map;
}

export function overdueItems(items: Item[], today: string): Item[] {
  return items.filter(
    (i) =>
      isOpen(i) &&
      !isProject(i) &&
      ((i.scheduledDate && i.scheduledDate < today) || (i.dueDate && i.dueDate < today))
  );
}

export function unscheduledItems(items: Item[]): Item[] {
  return items
    .filter((i) => isOpen(i) && !isProject(i) && !i.scheduledDate)
    .sort(
      (a, b) =>
        Number(b.status === "NOW") - Number(a.status === "NOW") ||
        PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] ||
        (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9")
    );
}

export function plannedMinutes(entries: CalendarEntry[]): number {
  return entries
    .filter((e) => e.kind === "scheduled" && e.item.status !== "DONE")
    .reduce((s, e) => s + (e.item.estimatedMinutes ?? 0), 0);
}

export interface PeriodStats {
  completed: Item[];
  trackedMinutes: number;
  created: number;
  byDay: Map<string, { done: number; minutes: number }>;
  byProject: { id: string | null; done: number; minutes: number }[];
  byType: Map<string, number>;
}

export function periodStats(items: Item[], from: string, to: string): PeriodStats {
  const inRange = (k?: string) => !!k && k >= from && k <= to;
  const byDay = new Map<string, { done: number; minutes: number }>();
  const bump = (k: string, done: number, minutes: number) => {
    const cur = byDay.get(k) ?? { done: 0, minutes: 0 };
    byDay.set(k, { done: cur.done + done, minutes: cur.minutes + minutes });
  };
  const proj = new Map<string | null, { done: number; minutes: number }>();
  const bumpProj = (id: string | null, done: number, minutes: number) => {
    const cur = proj.get(id) ?? { done: 0, minutes: 0 };
    proj.set(id, { done: cur.done + done, minutes: cur.minutes + minutes });
  };
  const byType = new Map<string, number>();
  const completed: Item[] = [];
  let trackedMinutes = 0;
  let created = 0;

  for (const i of items) {
    const doneKey = i.status === "DONE" ? isoToKey(i.completedAt) : undefined;
    if (inRange(doneKey) && !isProject(i)) {
      completed.push(i);
      bump(doneKey!, 1, 0);
      bumpProj(i.projectId ?? null, 1, 0);
      byType.set(i.type, (byType.get(i.type) ?? 0) + 1);
    }
    if (inRange(isoToKey(i.createdAt))) created++;
    for (const log of i.timeLogs) {
      const k = isoToKey(log.start);
      if (!inRange(k)) continue;
      trackedMinutes += log.minutes;
      bump(k!, 0, log.minutes);
      bumpProj(i.projectId ?? (isProject(i) ? i.id : null), 0, log.minutes);
    }
  }

  return {
    completed: completed.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
    trackedMinutes,
    created,
    byDay,
    byProject: Array.from(proj.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.done + b.minutes / 30 - (a.done + a.minutes / 30)),
    byType,
  };
}

/** Consecutive days (ending today or yesterday) with at least one completion. */
export function completionStreak(items: Item[], today: string): number {
  const days = new Set(
    items.filter((i) => i.status === "DONE").map((i) => isoToKey(i.completedAt)).filter(Boolean)
  );
  let cur = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(cur)) {
    n++;
    cur = addDays(cur, -1);
  }
  return n;
}

/** 0–100. Numeric target wins; otherwise linked items roll up; else done flag. */
export function goalProgress(goal: Goal, items: Item[]): number {
  if (goal.done) return 100;
  if (goal.target) return Math.min(100, Math.round(((goal.current ?? 0) / goal.target) * 100));
  const linked = goal.linkedIds
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is Item => !!i);
  if (linked.length === 0) return 0;
  const sum = linked.reduce(
    (s, i) => s + (isProject(i) ? projectProgress(i, items).percent : i.status === "DONE" ? 100 : 0),
    0
  );
  return Math.round(sum / linked.length);
}

export function projectTrackedMinutes(project: Item, items: Item[]): number {
  return items
    .filter((i) => i.id === project.id || i.projectId === project.id)
    .reduce((s, i) => s + i.timeLogs.reduce((a, l) => a + l.minutes, 0), 0);
}

export function projectEstimate(project: Item, items: Item[]): { total: number; remaining: number } {
  const children = items.filter((i) => i.projectId === project.id);
  const total = children.reduce((s, i) => s + (i.estimatedMinutes ?? 0), 0);
  const remaining = children
    .filter((i) => i.status !== "DONE")
    .reduce((s, i) => s + (i.estimatedMinutes ?? 0), 0);
  return { total, remaining };
}

export function allTags(items: Item[]): string[] {
  const set = new Set<string>();
  for (const i of items) i.tags.forEach((t) => set.add(t));
  return Array.from(set).sort();
}

export interface ItemFilter {
  q?: string;
  projectId?: string;
  areaId?: string;
  tag?: string;
  type?: string;
  priority?: string;
}

export function applyFilter(items: Item[], f: ItemFilter): Item[] {
  const q = f.q?.trim().toLowerCase();
  return items.filter(
    (i) =>
      (!q ||
        i.title.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q) ||
        i.tags.some((t) => t.includes(q))) &&
      (!f.projectId || (f.projectId === "none" ? !i.projectId : i.projectId === f.projectId)) &&
      (!f.areaId || i.areaId === f.areaId) &&
      (!f.tag || i.tags.includes(f.tag)) &&
      (!f.type || i.type === f.type) &&
      (!f.priority || i.priority === f.priority)
  );
}
