import { AppState } from "./types";
import { sanitizeState } from "./utils";

/**
 * Cloud sync. The browser keeps a full local copy (instant UI, works offline);
 * every change is diffed into row-level ops, queued in localStorage, and
 * flushed to /api/sync. The server is the source of truth on load and when
 * another device changes something.
 */

export type SyncTable = "items" | "goals" | "notes" | "kv";
export interface SyncOp {
  t: SyncTable;
  id: string;
  data: unknown | null;
}

export type SyncStatus = "local" | "connecting" | "synced" | "saving" | "offline" | "error" | "signed-out";

const PENDING_KEY = "decision-inbox:pending:v1";

/** Row-level diff. State updates are immutable, so unchanged rows keep identity. */
export function diffStates(prev: AppState, next: AppState): SyncOp[] {
  const ops: SyncOp[] = [];
  const byId = <T extends { id: string }>(t: SyncTable, a: T[], b: T[]) => {
    const old = new Map(a.map((x) => [x.id, x]));
    for (const x of b) {
      if (old.get(x.id) !== x) ops.push({ t, id: x.id, data: x });
      old.delete(x.id);
    }
    for (const id of Array.from(old.keys())) ops.push({ t, id, data: null });
  };
  byId("items", prev.items, next.items);
  byId("goals", prev.goals, next.goals);
  for (const [k, v] of Object.entries(next.notes)) if (prev.notes[k] !== v) ops.push({ t: "notes", id: k, data: v });
  for (const k of Object.keys(prev.notes)) if (!(k in next.notes)) ops.push({ t: "notes", id: k, data: null });
  if (prev.settings !== next.settings) ops.push({ t: "kv", id: "settings", data: next.settings });
  if (prev.timer !== next.timer) ops.push({ t: "kv", id: "timer", data: next.timer ?? null });
  return ops;
}

export function isEmptyState(s: AppState): boolean {
  return s.items.length === 0 && s.goals.length === 0 && Object.keys(s.notes).length === 0;
}

/** Build an AppState from a server snapshot. */
export function fromSnapshot(snap: {
  items: unknown[];
  goals: unknown[];
  notes: Record<string, unknown>;
  kv: Record<string, unknown>;
}): AppState {
  return sanitizeState({
    items: snap.items,
    goals: snap.goals,
    notes: snap.notes,
    settings: snap.kv.settings,
    timer: snap.kv.timer,
  });
}

/** Replay queued (not yet uploaded) ops on top of a server snapshot. */
export function applyOpsToState(state: AppState, ops: SyncOp[]): AppState {
  if (!ops.length) return state;
  const raw = {
    items: new Map(state.items.map((i) => [i.id, i as unknown])),
    goals: new Map(state.goals.map((g) => [g.id, g as unknown])),
    notes: { ...state.notes } as Record<string, unknown>,
    settings: state.settings as unknown,
    timer: state.timer as unknown,
  };
  for (const o of ops) {
    if (o.t === "items" || o.t === "goals") {
      if (o.data === null) raw[o.t].delete(o.id);
      else raw[o.t].set(o.id, o.data);
    } else if (o.t === "notes") {
      if (o.data === null) delete raw.notes[o.id];
      else raw.notes[o.id] = o.data;
    } else if (o.id === "settings") raw.settings = o.data;
    else if (o.id === "timer") raw.timer = o.data ?? undefined;
  }
  return sanitizeState({
    items: Array.from(raw.items.values()),
    goals: Array.from(raw.goals.values()),
    notes: raw.notes,
    settings: raw.settings,
    timer: raw.timer,
  });
}

export function loadPending(): SyncOp[] {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function savePending(ops: SyncOp[]): void {
  try {
    if (ops.length) window.localStorage.setItem(PENDING_KEY, JSON.stringify(ops));
    else window.localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

/** Keep only the latest op per row. */
export function compact(ops: SyncOp[]): SyncOp[] {
  const map = new Map<string, SyncOp>();
  for (const o of ops) {
    const k = `${o.t}:${o.id}`;
    map.delete(k);
    map.set(k, o);
  }
  return Array.from(map.values());
}

export type Fetched =
  | { kind: "local" }
  | { kind: "signed-out" }
  | { kind: "error" }
  | { kind: "ok"; state: AppState; rev: string; empty: boolean };

export async function fetchRemote(): Promise<Fetched> {
  try {
    const res = await fetch("/api/state", { cache: "no-store", credentials: "same-origin" });
    if (res.status === 401) return { kind: "signed-out" };
    if (res.status === 404) return { kind: "local" };
    if (!res.ok) return { kind: "error" };
    const body = await res.json();
    if (body.cloud === false) return { kind: "local" };
    const empty = body.items.length === 0 && body.goals.length === 0 && Object.keys(body.notes).length === 0 && !body.kv.settings;
    return { kind: "ok", state: fromSnapshot(body), rev: body.rev, empty };
  } catch {
    return { kind: "error" };
  }
}

export async function pushOps(ops: SyncOp[]): Promise<"ok" | "signed-out" | "error"> {
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ ops }),
    });
    if (res.status === 401) return "signed-out";
    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}
