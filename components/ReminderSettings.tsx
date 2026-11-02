"use client";

import { useEffect, useMemo, useState } from "react";
import { todayKey } from "@/lib/dates";
import { useNow } from "@/lib/hooks";
import { NotifyPermission, chime, notifyPermission, requestNotifyPermission, showNotification } from "@/lib/notify";
import { nextReminder, remindersForDay } from "@/lib/reminders";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { ReminderSettings as RS } from "@/lib/types";
import Select from "./pickers/Select";
import Switch from "./pickers/Switch";
import TimeField from "./pickers/TimeField";
import { Button, Field } from "./primitives";

const LEADS = [0, 5, 10, 15, 30, 60];

export default function ReminderSettings() {
  const { settings, updateSettings, items } = useStore();
  const { toast } = useUI();
  const rs = settings.reminders;
  const set = (patch: Partial<RS>) => updateSettings({ reminders: { ...rs, ...patch } });
  const [perm, setPerm] = useState<NotifyPermission>("default");
  useEffect(() => setPerm(notifyPermission()), []);

  const now = useNow(30_000);
  const upcoming = useMemo(() => {
    const today = todayKey();
    return nextReminder(remindersForDay(items, rs, today), now.getTime());
  }, [items, rs, now]);

  const ios = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const installed = typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches;

  return (
    <div className="space-y-4">
      <Switch label="Remind me about planned tasks" checked={rs.enabled} onChange={(v) => set({ enabled: v })} />

      {rs.enabled ? (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-stone-50 px-3 py-2.5 text-[13px] dark:bg-stone-800/50">
            {perm === "granted" ? (
              <span className="text-emerald-700 dark:text-emerald-400">✓ Notifications allowed on this device</span>
            ) : perm === "denied" ? (
              <span className="text-rose-600 dark:text-rose-400">
                Notifications are blocked for this site. Allow them in your browser&apos;s site settings (🔒 next to the address), then reload.
              </span>
            ) : perm === "unsupported" ? (
              <span className="text-stone-600 dark:text-stone-300">
                {ios && !installed
                  ? "On iPhone, add the app to your Home Screen (Share → Add to Home Screen) and open it from there to get notifications."
                  : "This browser can't show notifications — you'll still get in-app alerts."}
              </span>
            ) : (
              <>
                <span className="text-stone-600 dark:text-stone-300">Allow notifications so reminders show outside the app window.</span>
                <Button
                  size="sm"
                  variant="primary"
                  className="ml-auto"
                  onClick={async () => {
                    const p = await requestNotifyPermission();
                    setPerm(p);
                    toast(p === "granted" ? "Notifications on 🔔" : "Notifications not allowed — you'll still get in-app alerts.");
                  }}
                >
                  Allow notifications
                </Button>
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Remind me">
              <Select
                label="Reminder lead time"
                value={String(rs.leadMinutes)}
                onChange={(v) => set({ leadMinutes: Number(v) })}
                options={LEADS.map((m) => ({ value: String(m), label: m === 0 ? "At the start time" : `${m} min before` }))}
              />
            </Field>
            {rs.leadMinutes > 0 ? (
              <Field label="At start time">
                <div className="flex h-[38px] items-center">
                  <Switch label="Also when it starts" checked={rs.atStart} onChange={(v) => set({ atStart: v })} />
                </div>
              </Field>
            ) : (
              <div />
            )}
            <Field label="Morning summary">
              <div className="flex h-[38px] items-center">
                <Switch label="Today's plan, due & overdue" checked={rs.digest} onChange={(v) => set({ digest: v })} />
              </div>
            </Field>
            {rs.digest ? (
              <Field label="Summary time">
                <TimeField label="Summary time" value={rs.digestTime} onChange={(v) => set({ digestTime: v ?? "08:30" })} />
              </Field>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 pt-3 text-[12px] text-stone-500 dark:border-stone-800 dark:text-stone-400">
            <span className="min-w-0 flex-1">
              {upcoming
                ? `Next: ${upcoming.title} — ${new Date(upcoming.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                : "No more reminders today. Tasks with a time on today's plan get one."}
            </span>
            <Button
              size="sm"
              onClick={async () => {
                chime();
                const shown = await showNotification("🔔 Test reminder", { body: "This is how reminders will look.", tag: "test", url: "/today" });
                toast(shown ? "Test notification sent." : "In-app alert works. Allow notifications to also get system alerts.");
              }}
            >
              Send test
            </Button>
          </div>
          <p className="text-[12px] text-stone-400">
            Reminders fire while the app is open (any tab, or the installed app in the background on desktop/Android).
            Each reminder fires once across tabs.
          </p>
        </>
      ) : null}
    </div>
  );
}
