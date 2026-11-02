"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as A from "./actions";
import { BUILTIN_TEMPLATES } from "./templates";
import * as storage from "./storage";
import {
  SyncOp,
  SyncStatus,
  applyOpsToState,
  compact,
  diffStates,
  fetchRemote,
  isEmptyState,
  loadPending,
  pushOps,
  savePending,
} from "./sync";
import {
  AppState,
  Goal,
  Item,
  ItemStatus,
  NewItem,
  PeriodNote,
  Settings,
  Template,
  TypeDef,
} from "./types";

const HISTORY_LIMIT = 40;

interface StoreValue {
  state: AppState;
  items: Item[];
  goals: Goal[];
  settings: Settings;
  ready: boolean;
  activeProjects: Item[];
  projects: Item[];
  typeMap: Record<string, TypeDef>;
  templates: Template[];

  add: (input: NewItem) => Item | null;
  update: (id: string, patch: Partial<Item>) => void;
  remove: (id: string) => void;
  moveTo: (id: string, status: ItemStatus) => void;
  /** Returns the next occurrence date for recurring items. */
  complete: (id: string) => string | null;
  duplicate: (id: string) => Item | null;
  getById: (id: string) => Item | undefined;
  /** False if it's a PROJECT and the WIP limit is already reached. */
  canActivateProject: (id: string) => boolean;

  startTimer: (id: string, mode?: "track" | "pomodoro") => void;
  stopTimer: () => void;
  advancePomodoro: () => void;

  saveGoal: (goal: Partial<Goal> & { title: string }) => void;
  removeGoal: (id: string) => void;
  setNote: (key: string, patch: Partial<PeriodNote>) => void;
  updateSettings: (patch: Partial<Settings>) => void;

  applyTemplate: (
    tpl: Template,
    opts: { title: string; startDate: string; areaId?: string; status?: ItemStatus }
  ) => Item;
  saveProjectAsTemplate: (projectId: string) => Template | null;

  importState: (next: AppState, mode: "replace" | "merge") => void;
  resetAll: () => void;
  clearSamples: () => void;

  undo: () => boolean;
  canUndo: boolean;

  /** "local" when no database is configured. */
  syncStatus: SyncStatus;
  lastSynced: Date | null;
  syncNow: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(storage.emptyState);
  const [ready, setReady] = useState(false);
  const [historySize, setHistorySize] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const ref = useRef(state);
  const history = useRef<AppState[]>([]);

  // Cloud sync bookkeeping.
  const cloud = useRef(false);
  const pending = useRef<SyncOp[]>([]);
  const flushing = useRef(false);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelay = useRef(2000);
  const rev = useRef<string | null>(null);

  /** Replace the whole state (no undo entry). */
  const replaceState = useCallback((next: AppState) => {
    ref.current = next;
    setState(next);
    storage.saveState(next);
  }, []);

  const flush = useCallback(async () => {
    if (!cloud.current || flushing.current) return;
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    const batch = pending.current;
    if (!batch.length) {
      setSyncStatus("synced");
      return;
    }
    flushing.current = true;
    setSyncStatus("saving");
    const result = await pushOps(batch);
    flushing.current = false;
    if (result === "ok") {
      // Drop what was sent; anything queued meanwhile stays.
      const sent = new Set(batch);
      pending.current = pending.current.filter((o) => !sent.has(o));
      savePending(pending.current);
      retryDelay.current = 2000;
      rev.current = null; // our own write changed the server rev
      setLastSynced(new Date());
      if (pending.current.length) void flush();
      else setSyncStatus("synced");
    } else if (result === "signed-out") {
      setSyncStatus("signed-out");
    } else {
      setSyncStatus(navigator.onLine ? "error" : "offline");
      flushTimer.current = setTimeout(() => void flush(), retryDelay.current);
      retryDelay.current = Math.min(60000, retryDelay.current * 2);
    }
  }, []);

  const queue = useCallback(
    (ops: SyncOp[]) => {
      if (!cloud.current || !ops.length) return;
      pending.current = compact([...pending.current, ...ops]);
      savePending(pending.current);
      setSyncStatus("saving");
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(() => void flush(), 600);
    },
    [flush]
  );

  /** Pull the server copy; keep unsynced local edits on top of it. */
  const pull = useCallback(
    async (initial = false) => {
      const remote = await fetchRemote();
      if (remote.kind === "local") {
        cloud.current = false;
        setSyncStatus("local");
        return;
      }
      if (remote.kind === "signed-out") {
        setSyncStatus("signed-out");
        return;
      }
      if (remote.kind === "error") {
        if (initial) cloud.current = true; // keep queueing; retry later
        setSyncStatus(navigator.onLine ? "error" : "offline");
        return;
      }
      cloud.current = true;
      if (initial && remote.empty && !isEmptyState(ref.current)) {
        // First connection: upload everything this browser already has.
        queue(diffStates(storage.emptyState(), ref.current));
        return;
      }
      if (!initial && remote.rev === rev.current) {
        setSyncStatus(pending.current.length ? "saving" : "synced");
        return;
      }
      rev.current = remote.rev;
      replaceState(applyOpsToState(remote.state, pending.current));
      // Undo history would now diff against stale data.
      history.current = [];
      setHistorySize(0);
      setLastSynced(new Date());
      if (pending.current.length) void flush();
      else setSyncStatus("synced");
    },
    [flush, queue, replaceState]
  );

  useEffect(() => {
    const loaded = storage.loadState();
    ref.current = loaded;
    setState(loaded);
    pending.current = loadPending();
    setReady(true);
    void pull(true);
  }, [pull]);

  // Refresh from the server when the app comes back into view, and every minute.
  useEffect(() => {
    const refresh = () => {
      if (!cloud.current || document.visibilityState !== "visible") return;
      if (pending.current.length) void flush();
      else void pull();
    };
    const id = setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [flush, pull]);

  // Keep other tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === "decision-inbox:state:v2") {
        const loaded = storage.loadState();
        ref.current = loaded;
        setState(loaded);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** Apply a pure transition, persist it, sync it, and record it for undo. */
  const commit = useCallback(
    (fn: (s: AppState) => AppState, undoable = true) => {
      const prev = ref.current;
      const next = fn(prev);
      if (next === prev) return;
      if (undoable) {
        history.current = [...history.current.slice(-(HISTORY_LIMIT - 1)), prev];
        setHistorySize(history.current.length);
      }
      replaceState(next);
      queue(diffStates(prev, next));
    },
    [queue, replaceState]
  );

  const undo = useCallback(() => {
    const prev = history.current.pop();
    setHistorySize(history.current.length);
    if (!prev) return false;
    const cur = ref.current;
    replaceState(prev);
    queue(diffStates(cur, prev));
    return true;
  }, [queue, replaceState]);

  const syncNow = useCallback(async () => {
    if (pending.current.length) await flush();
    await pull();
  }, [flush, pull]);

  const add = useCallback(
    (input: NewItem) => {
      let created: Item | null = null;
      commit((s) => {
        const [next, item] = A.addItem(s, input);
        created = item;
        return next;
      });
      return created;
    },
    [commit]
  );

  const update = useCallback(
    (id: string, patch: Partial<Item>) => commit((s) => A.updateItem(s, id, patch)),
    [commit]
  );
  const remove = useCallback((id: string) => commit((s) => A.deleteItem(s, id)), [commit]);
  const moveTo = useCallback(
    (id: string, status: ItemStatus) => commit((s) => A.updateItem(s, id, { status })),
    [commit]
  );
  const complete = useCallback(
    (id: string) => {
      let next: string | null = null;
      commit((s) => {
        const [ns, occ] = A.completeItem(s, id);
        next = occ;
        return ns;
      });
      return next;
    },
    [commit]
  );
  const duplicate = useCallback(
    (id: string) => {
      let copy: Item | null = null;
      commit((s) => {
        const [ns, c] = A.duplicateItem(s, id);
        copy = c;
        return ns;
      });
      return copy;
    },
    [commit]
  );

  const startTimer = useCallback(
    (id: string, mode: "track" | "pomodoro" = "track") =>
      commit((s) => A.startTimer(s, id, mode), false),
    [commit]
  );
  const stopTimer = useCallback(() => commit(A.stopTimer, false), [commit]);
  const advancePomodoro = useCallback(() => commit(A.advancePomodoro, false), [commit]);

  const saveGoal = useCallback(
    (goal: Partial<Goal> & { title: string }) => commit((s) => A.upsertGoal(s, goal)),
    [commit]
  );
  const removeGoal = useCallback((id: string) => commit((s) => A.deleteGoal(s, id)), [commit]);
  const setNote = useCallback(
    (key: string, patch: Partial<PeriodNote>) => commit((s) => A.setNote(s, key, patch), false),
    [commit]
  );
  const updateSettings = useCallback(
    (patch: Partial<Settings>) => commit((s) => A.updateSettings(s, patch)),
    [commit]
  );

  const applyTemplate = useCallback(
    (
      tpl: Template,
      opts: { title: string; startDate: string; areaId?: string; status?: ItemStatus }
    ) => {
      let project!: Item;
      commit((s) => {
        const [ns, p] = A.applyTemplate(s, tpl, opts);
        project = p;
        return ns;
      });
      return project;
    },
    [commit]
  );

  const saveProjectAsTemplate = useCallback(
    (projectId: string) => {
      const tpl = A.templateFromProject(ref.current, projectId);
      if (tpl) {
        commit((s) => A.updateSettings(s, { templates: [...s.settings.templates, tpl] }));
      }
      return tpl;
    },
    [commit]
  );

  const importState = useCallback(
    (inc: AppState, mode: "replace" | "merge") =>
      commit((s) => (mode === "replace" ? inc : storage.mergeStates(s, inc))),
    [commit]
  );
  const resetAll = useCallback(() => commit(() => storage.emptyState()), [commit]);
  const clearSamples = useCallback(() => commit(A.clearSampleData), [commit]);

  const { items, goals, settings } = state;

  const activeProjects = useMemo(
    () => items.filter((i) => i.type === "PROJECT" && i.status === "NOW"),
    [items]
  );
  const projects = useMemo(() => items.filter((i) => i.type === "PROJECT"), [items]);
  const typeMap = useMemo(
    () => Object.fromEntries(settings.types.map((t) => [t.id, t])),
    [settings.types]
  );
  const templates = useMemo(
    () => [...settings.templates, ...BUILTIN_TEMPLATES],
    [settings.templates]
  );

  const getById = useCallback((id: string) => items.find((i) => i.id === id), [items]);

  const canActivateProject = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item || item.type !== "PROJECT" || item.status === "NOW") return true;
      if (!settings.enforceWip) return true;
      return activeProjects.length < settings.wipLimit;
    },
    [items, activeProjects, settings.enforceWip, settings.wipLimit]
  );

  const value: StoreValue = {
    state,
    items,
    goals,
    settings,
    ready,
    activeProjects,
    projects,
    typeMap,
    templates,
    add,
    update,
    remove,
    moveTo,
    complete,
    duplicate,
    getById,
    canActivateProject,
    startTimer,
    stopTimer,
    advancePomodoro,
    saveGoal,
    removeGoal,
    setNote,
    updateSettings,
    applyTemplate,
    saveProjectAsTemplate,
    importState,
    resetAll,
    clearSamples,
    undo,
    canUndo: historySize > 0,
    syncStatus,
    lastSynced,
    syncNow,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
