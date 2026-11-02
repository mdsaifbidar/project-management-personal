"use client";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const LABEL = {
  local: "On this device",
  connecting: "Connecting…",
  synced: "Synced",
  saving: "Saving…",
  offline: "Offline — will sync",
  error: "Retrying sync…",
  "signed-out": "Signed out",
} as const;

const DOT = {
  local: "bg-stone-300 dark:bg-stone-600",
  connecting: "bg-stone-300 animate-pulse",
  synced: "bg-emerald-500",
  saving: "bg-amber-400 animate-pulse",
  offline: "bg-stone-400",
  error: "bg-rose-500 animate-pulse",
  "signed-out": "bg-rose-500",
} as const;

/** Small cloud-sync status pill. Click to sync now (or sign in again). */
export default function SyncBadge({ className }: { className?: string }) {
  const { syncStatus, syncNow, lastSynced } = useStore();
  return (
    <button
      onClick={() => (syncStatus === "signed-out" ? window.location.assign("/login") : void syncNow())}
      title={lastSynced ? `Last synced ${lastSynced.toLocaleTimeString()}` : "Sync status"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT[syncStatus])} />
      {LABEL[syncStatus]}
    </button>
  );
}
