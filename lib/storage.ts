import {
  DEFAULT_SETTINGS,
  LEGACY_ITEMS_KEY,
  SEED_FLAG_KEY,
  STATE_KEY,
  buildSampleState,
} from "./constants";
import { AppState, Item } from "./types";
import { sanitizeItems, sanitizeState } from "./utils";

/**
 * Persistence. Everything lives in localStorage under one versioned key.
 * Swap these functions for an API to move to a real database.
 */

const isBrowser = () => typeof window !== "undefined";

export function emptyState(): AppState {
  return { version: 2, items: [], goals: [], notes: {}, settings: DEFAULT_SETTINGS };
}

/** Load state. Never throws; migrates v1 and resets safely on corruption. */
export function loadState(): AppState {
  if (!isBrowser()) return emptyState();
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (raw !== null) return sanitizeState(JSON.parse(raw));

    // Migrate v1 (a bare item array).
    const legacy = window.localStorage.getItem(LEGACY_ITEMS_KEY);
    if (legacy !== null) {
      const state = { ...emptyState(), items: sanitizeItems(JSON.parse(legacy)) };
      saveState(state);
      return state;
    }

    // First ever launch — seed sample data once.
    if (window.localStorage.getItem(SEED_FLAG_KEY) === null) {
      window.localStorage.setItem(SEED_FLAG_KEY, "1");
      const seeded = buildSampleState();
      saveState(seeded);
      return seeded;
    }
    return emptyState();
  } catch {
    try {
      window.localStorage.removeItem(STATE_KEY);
    } catch {
      /* ignore */
    }
    return emptyState();
  }
}

export function saveState(state: AppState): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable — ignore */
  }
}

// ---------- Import / export ----------

export function exportJSON(state: AppState): string {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

/** Parse a backup file. Accepts a v2 state or a v1 item array. */
export function parseImport(text: string): AppState {
  const data = JSON.parse(text);
  if (Array.isArray(data)) return { ...emptyState(), items: sanitizeItems(data) };
  return sanitizeState(data);
}

/** Merge imported data into current state; imported records win on id clash. */
export function mergeStates(cur: AppState, inc: AppState): AppState {
  const byId = <T extends { id: string }>(a: T[], b: T[]) => {
    const map = new Map(a.map((x) => [x.id, x]));
    for (const x of b) map.set(x.id, x);
    return Array.from(map.values());
  };
  return {
    ...cur,
    items: byId(cur.items, inc.items),
    goals: byId(cur.goals, inc.goals),
    notes: { ...cur.notes, ...inc.notes },
  };
}

const csvCell = (v: unknown) => {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportCSV(items: Item[]): string {
  const byId = new Map(items.map((i) => [i.id, i]));
  const cols = [
    "title", "type", "status", "priority", "project", "tags", "scheduledDate",
    "scheduledTime", "dueDate", "estimatedMinutes", "trackedMinutes", "completedAt",
    "description",
  ];
  const rows = items.map((i) =>
    [
      i.title, i.type, i.status, i.priority,
      i.projectId ? byId.get(i.projectId)?.title : "",
      i.tags.join(" "), i.scheduledDate, i.scheduledTime, i.dueDate,
      i.estimatedMinutes, i.timeLogs.reduce((s, l) => s + l.minutes, 0), i.completedAt,
      i.description,
    ].map(csvCell).join(",")
  );
  return [cols.join(","), ...rows].join("\n");
}

const icsDate = (key: string) => key.replace(/-/g, "");
const icsEscape = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** iCalendar feed of scheduled and due items — import into Google/Apple/Outlook. */
export function exportICS(items: Item[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const events: string[] = [];
  for (const i of items) {
    if (i.status === "DONE") continue;
    const add = (key: string, label: string, time?: string) => {
      const lines = ["BEGIN:VEVENT", `UID:${i.id}-${label}@decision-inbox`, `DTSTAMP:${stamp}`];
      if (time) {
        const [h, m] = time.split(":");
        const start = `${icsDate(key)}T${h}${m}00`;
        const endD = new Date(`${key}T${time}:00`);
        endD.setMinutes(endD.getMinutes() + (i.estimatedMinutes ?? 30));
        const p = (n: number) => String(n).padStart(2, "0");
        const end = `${endD.getFullYear()}${p(endD.getMonth() + 1)}${p(endD.getDate())}T${p(endD.getHours())}${p(endD.getMinutes())}00`;
        lines.push(`DTSTART:${start}`, `DTEND:${end}`);
      } else {
        lines.push(`DTSTART;VALUE=DATE:${icsDate(key)}`);
      }
      lines.push(`SUMMARY:${icsEscape(label === "due" ? `Due: ${i.title}` : i.title)}`);
      if (i.description) lines.push(`DESCRIPTION:${icsEscape(i.description)}`);
      lines.push("END:VEVENT");
      events.push(lines.join("\r\n"));
    };
    if (i.scheduledDate) add(i.scheduledDate, "plan", i.scheduledTime);
    if (i.dueDate) add(i.dueDate, "due");
  }
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Decision Inbox//EN", ...events, "END:VCALENDAR"].join("\r\n");
}

export function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
