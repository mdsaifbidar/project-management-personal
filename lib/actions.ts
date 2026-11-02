import { SAMPLE_ID_PREFIX } from "./constants";
import { addDays, todayKey } from "./dates";
import { nextOccurrence } from "./recurrence";
import {
  AppState,
  Goal,
  Item,
  ItemStatus,
  NewItem,
  PeriodNote,
  Settings,
  Template,
} from "./types";
import { nowIso, slugTag, uid } from "./utils";

/**
 * Pure state transitions. Every function takes the current AppState and
 * returns a new one; persistence lives in storage.ts and React wiring in
 * store.tsx.
 */

export function buildItem(input: NewItem): Item {
  const ts = nowIso();
  const status = input.status ?? "JAIL";
  return {
    id: uid(),
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    type: input.type ?? "IDEA",
    status,
    priority: input.priority ?? "MEDIUM",
    estimatedMinutes:
      typeof input.estimatedMinutes === "number" && input.estimatedMinutes > 0
        ? Math.round(input.estimatedMinutes)
        : undefined,
    projectId: input.projectId || undefined,
    areaId: input.areaId || undefined,
    tags: Array.from(new Set((input.tags ?? []).map(slugTag).filter(Boolean))),
    scheduledDate: input.scheduledDate || undefined,
    scheduledTime: input.scheduledDate ? input.scheduledTime || undefined : undefined,
    dueDate: input.dueDate || undefined,
    startDate: input.startDate || undefined,
    recurrence: input.recurrence,
    goal: input.goal?.trim() || undefined,
    successMetric: input.successMetric?.trim() || undefined,
    color: input.color,
    checklist: input.checklist ?? [],
    timeLogs: input.timeLogs ?? [],
    completedAt: status === "DONE" ? ts : undefined,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function addItem(state: AppState, input: NewItem): [AppState, Item | null] {
  if (!input.title.trim()) return [state, null];
  const item = buildItem(input);
  return [{ ...state, items: [item, ...state.items] }, item];
}

export function updateItem(state: AppState, id: string, patch: Partial<Item>): AppState {
  return {
    ...state,
    items: state.items.map((it) => {
      if (it.id !== id) return it;
      const next: Item = { ...it, ...patch, id: it.id, createdAt: it.createdAt, updatedAt: nowIso() };
      if (patch.status && patch.status !== it.status) {
        next.completedAt = patch.status === "DONE" ? nowIso() : undefined;
      }
      if (!next.scheduledDate) next.scheduledTime = undefined;
      return next;
    }),
  };
}

export function deleteItem(state: AppState, id: string): AppState {
  return {
    ...state,
    items: state.items
      .filter((it) => it.id !== id)
      .map((it) => (it.projectId === id ? { ...it, projectId: undefined } : it)),
    goals: state.goals.map((g) =>
      g.linkedIds.includes(id) ? { ...g, linkedIds: g.linkedIds.filter((x) => x !== id) } : g
    ),
    timer: state.timer?.itemId === id ? undefined : state.timer,
  };
}

/**
 * Complete an item. Recurring items log a DONE copy for history and roll the
 * original forward to its next occurrence (Todoist-style).
 * Returns the next occurrence date if the item recurred.
 */
export function completeItem(state: AppState, id: string): [AppState, string | null] {
  const item = state.items.find((i) => i.id === id);
  if (!item) return [state, null];
  let s = stopTimerIfFor(state, id);

  if (!item.recurrence) {
    return [updateItem(s, id, { status: "DONE" }), null];
  }

  const ts = nowIso();
  const base = item.scheduledDate ?? item.dueDate ?? todayKey();
  let next = nextOccurrence(base, item.recurrence);
  // Don't leave the next occurrence in the past.
  while (next < todayKey()) next = nextOccurrence(next, item.recurrence);
  const shift = (key?: string) =>
    key ? addDays(next, Math.round((Date.parse(key) - Date.parse(base)) / 86400000)) : undefined;

  const doneCopy: Item = {
    ...item,
    id: uid(),
    status: "DONE",
    recurrence: undefined,
    completedAt: ts,
    updatedAt: ts,
  };
  // Re-read after the timer stop so its time log lands on the done copy.
  const current = s.items.find((i) => i.id === id) ?? item;
  doneCopy.timeLogs = current.timeLogs;

  s = {
    ...s,
    items: [
      doneCopy,
      ...s.items.map((i) =>
        i.id === id
          ? {
              ...i,
              status: (i.status === "NOW" ? "NEXT" : i.status) as ItemStatus,
              scheduledDate: item.scheduledDate ? next : undefined,
              dueDate: item.dueDate ? shift(item.dueDate) : undefined,
              checklist: i.checklist.map((c) => ({ ...c, done: false })),
              timeLogs: [],
              updatedAt: ts,
            }
          : i
      ),
    ],
  };
  return [s, next];
}

export function duplicateItem(state: AppState, id: string): [AppState, Item | null] {
  const src = state.items.find((i) => i.id === id);
  if (!src) return [state, null];
  const ts = nowIso();
  const copy: Item = {
    ...src,
    id: uid(),
    title: `${src.title} (copy)`,
    status: src.status === "DONE" ? "NEXT" : src.status === "NOW" && src.type === "PROJECT" ? "NEXT" : src.status,
    checklist: src.checklist.map((c) => ({ ...c, id: uid(), done: false })),
    timeLogs: [],
    completedAt: undefined,
    createdAt: ts,
    updatedAt: ts,
  };
  let items = [copy, ...state.items];
  if (src.type === "PROJECT") {
    const children = state.items
      .filter((i) => i.projectId === src.id)
      .map((c) => ({
        ...c,
        id: uid(),
        projectId: copy.id,
        status: (c.status === "DONE" ? "NEXT" : c.status) as ItemStatus,
        checklist: c.checklist.map((x) => ({ ...x, id: uid(), done: false })),
        timeLogs: [],
        completedAt: undefined,
        createdAt: ts,
        updatedAt: ts,
      }));
    items = [...children, ...items];
  }
  return [{ ...state, items }, copy];
}

// ---------- Timer ----------

function stopTimerIfFor(state: AppState, id: string): AppState {
  return state.timer?.itemId === id ? stopTimer(state) : state;
}

export function startTimer(
  state: AppState,
  itemId: string,
  mode: "track" | "pomodoro"
): AppState {
  let s = state.timer ? stopTimer(state) : state;
  const start = nowIso();
  s = {
    ...s,
    timer: {
      itemId,
      start,
      mode,
      phase: "work",
      endsAt:
        mode === "pomodoro"
          ? new Date(Date.now() + s.settings.pomodoroWork * 60000).toISOString()
          : undefined,
    },
  };
  // Starting a timer means you're working on it.
  const item = s.items.find((i) => i.id === itemId);
  if (item && item.status !== "NOW" && item.status !== "DONE" && item.type !== "PROJECT") {
    s = updateItem(s, itemId, { status: "NOW" });
  }
  return s;
}

/** Stop the timer and log the elapsed work time (breaks aren't logged). */
export function stopTimer(state: AppState): AppState {
  const t = state.timer;
  if (!t) return state;
  const end = nowIso();
  const minutes = Math.round((Date.parse(end) - Date.parse(t.start)) / 60000);
  let s: AppState = { ...state, timer: undefined };
  if (t.phase === "work" && minutes >= 1) {
    s = {
      ...s,
      items: s.items.map((i) =>
        i.id === t.itemId
          ? { ...i, timeLogs: [...i.timeLogs, { start: t.start, end, minutes }], updatedAt: end }
          : i
      ),
    };
  }
  return s;
}

/** Pomodoro: switch work ↔ break, logging the finished work block. */
export function advancePomodoro(state: AppState): AppState {
  const t = state.timer;
  if (!t || t.mode !== "pomodoro") return state;
  const logged = t.phase === "work" ? stopTimer(state) : { ...state, timer: undefined };
  const nextPhase = t.phase === "work" ? "break" : "work";
  const mins = nextPhase === "work" ? state.settings.pomodoroWork : state.settings.pomodoroBreak;
  return {
    ...logged,
    timer: {
      itemId: t.itemId,
      start: nowIso(),
      mode: "pomodoro",
      phase: nextPhase,
      endsAt: new Date(Date.now() + mins * 60000).toISOString(),
    },
  };
}

// ---------- Goals, notes, settings ----------

export function upsertGoal(state: AppState, goal: Partial<Goal> & { title: string }): AppState {
  const ts = nowIso();
  if (goal.id && state.goals.some((g) => g.id === goal.id)) {
    return {
      ...state,
      goals: state.goals.map((g) => (g.id === goal.id ? { ...g, ...goal, updatedAt: ts } as Goal : g)),
    };
  }
  const created: Goal = {
    id: uid(),
    title: goal.title.trim(),
    description: goal.description,
    period: goal.period ?? "MONTH",
    periodKey: goal.periodKey ?? todayKey().slice(0, 7),
    target: goal.target,
    current: goal.current,
    unit: goal.unit,
    linkedIds: goal.linkedIds ?? [],
    done: false,
    createdAt: ts,
    updatedAt: ts,
  };
  return { ...state, goals: [...state.goals, created] };
}

export function deleteGoal(state: AppState, id: string): AppState {
  return { ...state, goals: state.goals.filter((g) => g.id !== id) };
}

export function setNote(state: AppState, key: string, patch: Partial<PeriodNote>): AppState {
  const prev: PeriodNote = state.notes[key] ?? {
    key,
    bigThree: [],
    notes: "",
    wins: "",
    improve: "",
  };
  return { ...state, notes: { ...state.notes, [key]: { ...prev, ...patch, key } } };
}

export function updateSettings(state: AppState, patch: Partial<Settings>): AppState {
  return { ...state, settings: { ...state.settings, ...patch } };
}

// ---------- Templates ----------

export function applyTemplate(
  state: AppState,
  tpl: Template,
  opts: { title: string; startDate: string; areaId?: string; status?: ItemStatus }
): [AppState, Item] {
  const project = buildItem({
    title: opts.title || tpl.name,
    type: "PROJECT",
    status: opts.status ?? "NEXT",
    priority: tpl.project.priority,
    description: tpl.project.description,
    goal: tpl.project.goal,
    successMetric: tpl.project.successMetric,
    color: tpl.project.color,
    areaId: opts.areaId,
    startDate: opts.startDate,
    dueDate: tpl.project.durationDays ? addDays(opts.startDate, tpl.project.durationDays) : undefined,
  });
  const tasks = tpl.tasks.map((t) =>
    buildItem({
      title: t.title,
      type: "TASK",
      status: "NEXT",
      priority: t.priority ?? "MEDIUM",
      estimatedMinutes: t.estimatedMinutes,
      projectId: project.id,
      areaId: opts.areaId,
      scheduledDate: t.offsetDays !== undefined ? addDays(opts.startDate, t.offsetDays) : undefined,
      checklist: (t.checklist ?? []).map((text) => ({ id: uid(), text, done: false })),
    })
  );
  return [{ ...state, items: [project, ...tasks, ...state.items] }, project];
}

export function templateFromProject(state: AppState, projectId: string): Template | null {
  const p = state.items.find((i) => i.id === projectId);
  if (!p) return null;
  const start = p.startDate ?? p.createdAt.slice(0, 10);
  const children = state.items
    .filter((i) => i.projectId === projectId)
    .sort((a, b) => (a.scheduledDate ?? "9").localeCompare(b.scheduledDate ?? "9"));
  const offset = (key?: string) =>
    key ? Math.max(0, Math.round((Date.parse(key) - Date.parse(start)) / 86400000)) : undefined;
  return {
    id: uid(),
    name: p.title,
    description: p.description,
    project: {
      description: p.description,
      goal: p.goal,
      successMetric: p.successMetric,
      priority: p.priority,
      color: p.color,
      durationDays: offset(p.dueDate),
    },
    tasks: children.map((c) => ({
      title: c.title,
      offsetDays: offset(c.scheduledDate),
      estimatedMinutes: c.estimatedMinutes,
      priority: c.priority,
      checklist: c.checklist.map((x) => x.text),
    })),
  };
}

export function clearSampleData(state: AppState): AppState {
  const isSample = (id: string) => id.startsWith(SAMPLE_ID_PREFIX);
  return {
    ...state,
    items: state.items
      .filter((i) => !isSample(i.id))
      .map((i) => (i.projectId && isSample(i.projectId) ? { ...i, projectId: undefined } : i)),
    goals: state.goals.filter((g) => !isSample(g.id)),
  };
}
