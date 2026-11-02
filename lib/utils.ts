import {
  COLOR_KEYS,
  DEFAULT_SETTINGS,
  ITEM_STATUSES,
  PRIORITIES,
} from "./constants";
import { isDateKey } from "./dates";
import {
  ActiveTimer,
  AppState,
  Area,
  ChecklistEntry,
  ColorKey,
  Goal,
  GoalPeriod,
  Item,
  ItemStatus,
  PeriodNote,
  Priority,
  Recurrence,
  RecurrenceFreq,
  Settings,
  Template,
  TimeLog,
  TypeDef,
} from "./types";

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatMinutes(min?: number): string {
  if (!min || min <= 0) return "No estimate";
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** Compact duration: "45m", "1h 30m". */
export function shortMinutes(min?: number): string {
  if (!min || min <= 0) return "0m";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatDate(isoOrKey?: string): string {
  if (!isoOrKey) return "";
  const d = isDateKey(isoOrKey)
    ? new Date(`${isoOrKey}T00:00:00`)
    : new Date(isoOrKey);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function trackedMinutes(item: Item): number {
  return item.timeLogs.reduce((sum, l) => sum + l.minutes, 0);
}

export function slugTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : undefined;
const dateKey = (v: unknown) => (isDateKey(v) ? v : undefined);
const iso = (v: unknown) =>
  typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : undefined;
const color = (v: unknown): ColorKey | undefined =>
  isOneOf<ColorKey>(v, COLOR_KEYS) ? v : undefined;

const FREQS: RecurrenceFreq[] = ["DAILY", "WEEKDAYS", "WEEKLY", "MONTHLY", "YEARLY"];

function sanitizeRecurrence(raw: unknown): Recurrence | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  if (!isOneOf<RecurrenceFreq>(r.freq, FREQS)) return undefined;
  return { freq: r.freq, interval: num(r.interval) ?? 1 };
}

function sanitizeChecklist(raw: unknown): ChecklistEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c) => c && typeof c === "object" && str((c as ChecklistEntry).text))
    .map((c) => ({
      id: str(c.id) ?? uid(),
      text: String(c.text).trim(),
      done: c.done === true,
    }));
}

function sanitizeLogs(raw: unknown): TimeLog[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l) => l && iso(l.start) && iso(l.end) && num(l.minutes))
    .map((l) => ({ start: l.start, end: l.end, minutes: Math.round(l.minutes) }));
}

/**
 * Coerce an unknown record into a valid Item, or return null if it cannot be
 * salvaged (e.g. missing/empty title). Keeps corrupted storage from crashing.
 * Also upgrades v1 items (`deadline` → `dueDate`).
 */
export function sanitizeItem(raw: unknown, typeIds?: string[]): Item | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const title = str(r.title);
  if (!title) return null;

  const type =
    typeof r.type === "string" && (!typeIds || typeIds.includes(r.type))
      ? r.type
      : "IDEA";
  const status: ItemStatus = isOneOf<ItemStatus>(r.status, ITEM_STATUSES)
    ? r.status
    : "JAIL";
  const priority: Priority = isOneOf<Priority>(r.priority, PRIORITIES)
    ? r.priority
    : "MEDIUM";

  const createdAt = iso(r.createdAt) ?? nowIso();
  const updatedAt = iso(r.updatedAt) ?? createdAt;
  const scheduledTime =
    typeof r.scheduledTime === "string" && /^\d{2}:\d{2}$/.test(r.scheduledTime)
      ? r.scheduledTime
      : undefined;

  return {
    id: str(r.id) ?? uid(),
    title,
    description: str(r.description),
    type,
    status,
    priority,
    estimatedMinutes: num(r.estimatedMinutes),
    projectId: str(r.projectId),
    areaId: str(r.areaId),
    tags: Array.isArray(r.tags)
      ? Array.from(new Set(r.tags.filter((t) => typeof t === "string").map(slugTag).filter(Boolean)))
      : [],
    scheduledDate: dateKey(r.scheduledDate),
    scheduledTime,
    dueDate: dateKey(r.dueDate) ?? dateKey(r.deadline),
    startDate: dateKey(r.startDate),
    recurrence: sanitizeRecurrence(r.recurrence),
    goal: str(r.goal),
    successMetric: str(r.successMetric),
    color: color(r.color),
    checklist: sanitizeChecklist(r.checklist),
    timeLogs: sanitizeLogs(r.timeLogs),
    completedAt: iso(r.completedAt) ?? (status === "DONE" ? updatedAt : undefined),
    createdAt,
    updatedAt,
  };
}

/** Validate and de-duplicate a list of raw items. */
export function sanitizeItems(raw: unknown, typeIds?: string[]): Item[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const entry of raw) {
    const item = sanitizeItem(entry, typeIds);
    if (!item) continue;
    if (seen.has(item.id)) item.id = uid();
    seen.add(item.id);
    out.push(item);
  }
  // Drop dangling project links.
  const ids = new Set(out.map((i) => i.id));
  for (const i of out) if (i.projectId && !ids.has(i.projectId)) i.projectId = undefined;
  return out;
}

const PERIODS: GoalPeriod[] = ["YEAR", "QUARTER", "MONTH", "WEEK"];

export function sanitizeGoals(raw: unknown): Goal[] {
  if (!Array.isArray(raw)) return [];
  const out: Goal[] = [];
  for (const g of raw) {
    if (!g || typeof g !== "object") continue;
    const title = str(g.title);
    const periodKey = str(g.periodKey);
    if (!title || !periodKey || !isOneOf<GoalPeriod>(g.period, PERIODS)) continue;
    const createdAt = iso(g.createdAt) ?? nowIso();
    out.push({
      id: str(g.id) ?? uid(),
      title,
      description: str(g.description),
      period: g.period,
      periodKey,
      target: num(g.target),
      current: typeof g.current === "number" && g.current >= 0 ? g.current : undefined,
      unit: str(g.unit),
      linkedIds: Array.isArray(g.linkedIds)
        ? g.linkedIds.filter((x: unknown) => typeof x === "string")
        : [],
      done: g.done === true,
      createdAt,
      updatedAt: iso(g.updatedAt) ?? createdAt,
    });
  }
  return out;
}

const rating = (v: unknown) =>
  typeof v === "number" && v >= 1 && v <= 5 ? Math.round(v) : undefined;

export function sanitizeNotes(raw: unknown): Record<string, PeriodNote> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, PeriodNote> = {};
  for (const [key, n] of Object.entries(raw as Record<string, unknown>)) {
    if (!n || typeof n !== "object") continue;
    const v = n as Record<string, unknown>;
    out[key] = {
      key,
      bigThree: Array.isArray(v.bigThree)
        ? v.bigThree.filter((x) => typeof x === "string").slice(0, 3)
        : [],
      notes: typeof v.notes === "string" ? v.notes : "",
      wins: typeof v.wins === "string" ? v.wins : "",
      improve: typeof v.improve === "string" ? v.improve : "",
      mood: rating(v.mood),
      energy: rating(v.energy),
    };
  }
  return out;
}

function sanitizeTypes(raw: unknown): TypeDef[] {
  const list = Array.isArray(raw)
    ? raw
        .filter((t) => t && str(t.id) && str(t.label))
        .map((t) => ({ id: String(t.id).trim(), label: String(t.label).trim(), icon: str(t.icon) ?? "•" }))
    : [];
  // Core types must always exist.
  for (const core of DEFAULT_SETTINGS.types.slice(0, 3)) {
    if (!list.some((t) => t.id === core.id)) list.unshift(core);
  }
  return list;
}

function sanitizeAreas(raw: unknown): Area[] {
  if (!Array.isArray(raw)) return DEFAULT_SETTINGS.areas;
  return raw
    .filter((a) => a && str(a.id) && str(a.name))
    .map((a) => ({
      id: String(a.id),
      name: String(a.name).trim(),
      icon: str(a.icon) ?? "•",
      color: color(a.color) ?? "stone",
    }));
}

function sanitizeTemplates(raw: unknown): Template[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t) => t && str(t.id) && str(t.name) && Array.isArray(t.tasks))
    .map((t) => ({
      id: String(t.id),
      name: String(t.name).trim(),
      description: str(t.description),
      project: {
        description: str(t.project?.description),
        goal: str(t.project?.goal),
        successMetric: str(t.project?.successMetric),
        priority: isOneOf<Priority>(t.project?.priority, PRIORITIES) ? t.project.priority : "MEDIUM",
        color: color(t.project?.color),
        durationDays: num(t.project?.durationDays),
      },
      tasks: t.tasks
        .filter((x: unknown) => x && str((x as { title?: unknown }).title))
        .map((x: Record<string, unknown>) => ({
          title: String(x.title).trim(),
          offsetDays: typeof x.offsetDays === "number" && x.offsetDays >= 0 ? Math.round(x.offsetDays) : undefined,
          estimatedMinutes: num(x.estimatedMinutes),
          priority: isOneOf<Priority>(x.priority, PRIORITIES) ? x.priority : undefined,
          checklist: Array.isArray(x.checklist)
            ? x.checklist.filter((c): c is string => typeof c === "string")
            : undefined,
        })),
    }));
}

const clampInt = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;

export function sanitizeSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, unknown>;
  const tagColors: Record<string, ColorKey> = {};
  if (r.tagColors && typeof r.tagColors === "object") {
    for (const [k, v] of Object.entries(r.tagColors as Record<string, unknown>)) {
      const c = color(v);
      if (c) tagColors[slugTag(k)] = c;
    }
  }
  const dayStartHour = clampInt(r.dayStartHour, 0, 22, d.dayStartHour);
  return {
    wipLimit: clampInt(r.wipLimit, 1, 20, d.wipLimit),
    enforceWip: typeof r.enforceWip === "boolean" ? r.enforceWip : d.enforceWip,
    types: sanitizeTypes(r.types ?? d.types),
    areas: sanitizeAreas(r.areas),
    tagColors,
    weekStartsOn: r.weekStartsOn === 0 ? 0 : 1,
    dailyCapacityMinutes: clampInt(r.dailyCapacityMinutes, 30, 1440, d.dailyCapacityMinutes),
    dayStartHour,
    dayEndHour: clampInt(r.dayEndHour, dayStartHour + 1, 24, d.dayEndHour),
    pomodoroWork: clampInt(r.pomodoroWork, 5, 120, d.pomodoroWork),
    pomodoroBreak: clampInt(r.pomodoroBreak, 1, 60, d.pomodoroBreak),
    captureStatus: isOneOf<ItemStatus>(r.captureStatus, ITEM_STATUSES) && r.captureStatus !== "DONE"
      ? r.captureStatus
      : d.captureStatus,
    templates: sanitizeTemplates(r.templates),
  };
}

function sanitizeTimer(raw: unknown): ActiveTimer | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const t = raw as Record<string, unknown>;
  const start = iso(t.start);
  if (!str(t.itemId) || !start) return undefined;
  return {
    itemId: String(t.itemId),
    start,
    mode: t.mode === "pomodoro" ? "pomodoro" : "track",
    phase: t.phase === "break" ? "break" : "work",
    endsAt: iso(t.endsAt),
  };
}

export function sanitizeState(raw: unknown): AppState {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const settings = sanitizeSettings(r.settings);
  return {
    version: 2,
    items: sanitizeItems(r.items, settings.types.map((t) => t.id)),
    goals: sanitizeGoals(r.goals),
    notes: sanitizeNotes(r.notes),
    settings,
    timer: sanitizeTimer(r.timer),
  };
}

export function projectProgress(
  project: Item,
  allItems: Item[]
): { total: number; done: number; percent: number } {
  const children = allItems.filter((i) => i.projectId === project.id);
  const total = children.length;
  const done = children.filter((i) => i.status === "DONE").length;
  const percent = total === 0 ? (project.status === "DONE" ? 100 : 0) : Math.round((done / total) * 100);
  return { total, done, percent };
}
