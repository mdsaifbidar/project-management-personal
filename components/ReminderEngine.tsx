"use client";

import { useEffect, useMemo } from "react";
import { toKey } from "@/lib/dates";
import { useNow } from "@/lib/hooks";
import { chime, showNotification } from "@/lib/notify";
import { dueReminders, remindersForDay } from "@/lib/reminders";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui";

const FIRED_KEY = "decision-inbox:reminders:fired:v1";

/** Fired reminder keys, shared by all tabs so each reminder fires once. */
function loadFired(): Record<string, number> {
  try {
    return JSON.parse(window.localStorage.getItem(FIRED_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveFired(map: Record<string, number>) {
  const cutoff = Date.now() - 3 * 86_400_000;
  for (const [k, t] of Object.entries(map)) if (t < cutoff) delete map[k];
  try {
    window.localStorage.setItem(FIRED_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** Mounted once in the shell; fires reminders while the app is open. */
export default function ReminderEngine() {
  const { items, settings, ready, getById } = useStore();
  const { toast, openEdit } = useUI();
  const now = useNow(20_000);
  const day = toKey(now);
  const list = useMemo(() => remindersForDay(items, settings.reminders, day), [items, settings.reminders, day]);

  useEffect(() => {
    if (!ready || !settings.reminders.enabled) return;
    const fired = loadFired();
    const due = dueReminders(list, Date.now(), new Set(Object.keys(fired)));
    if (!due.length) return;
    // Mark first so a second tab doing the same check skips them.
    for (const r of due) fired[r.key] = Date.now();
    saveFired(fired);
    chime();
    for (const r of due) {
      void showNotification(r.title, { body: r.body, tag: r.key, url: r.url });
      const item = r.itemId ? getById(r.itemId) : undefined;
      // Stays longer than normal toasts: you may not be looking at the screen.
      toast(`🔔 ${r.title}`, item ? { label: "Open", run: () => openEdit(item) } : undefined, 15_000);
    }
  }, [now, list, ready, settings.reminders.enabled, getById, openEdit, toast]);

  return null;
}
