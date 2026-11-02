"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePref } from "@/lib/hooks";
import { NotifyPermission, notifyPermission, requestNotifyPermission } from "@/lib/notify";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { Button } from "./primitives";

/** One-time nudge on Today to allow notifications for reminders. */
export default function ReminderPrompt() {
  const { settings } = useStore();
  const { toast } = useUI();
  const [dismissed, setDismissed] = usePref("reminder-prompt-dismissed", false);
  const [perm, setPerm] = useState<NotifyPermission>("granted");
  useEffect(() => setPerm(notifyPermission()), []);

  if (!settings.reminders.enabled || perm !== "default" || dismissed) return null;

  return (
    <div className="animate-fade-in flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/30">
      <span className="text-xl" aria-hidden>
        🔔
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Get reminders for your time blocks</p>
        <p className="text-[12px] text-amber-800/80 dark:text-amber-200/70">
          {settings.reminders.leadMinutes ? `${settings.reminders.leadMinutes} min before each planned task` : "When each planned task starts"}
          {settings.reminders.digest ? " + a morning summary" : ""} ·{" "}
          <Link href="/settings" className="underline">
            change
          </Link>
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
          Not now
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={async () => {
            const p = await requestNotifyPermission();
            setPerm(p);
            if (p !== "default") setDismissed(true);
            toast(p === "granted" ? "Reminders on 🔔" : "Okay — you'll still get in-app alerts while the app is open.");
          }}
        >
          Turn on
        </Button>
      </div>
    </div>
  );
}
