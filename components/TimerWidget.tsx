"use client";

import { useEffect, useRef } from "react";
import { useNow } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { IconStop } from "./icons";

const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(r).padStart(2, "0")}`;
};

function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.18].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = i ? 880 : 660;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.4);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.45);
    });
  } catch {
    /* audio unavailable */
  }
}

/** Running-timer pill + pomodoro phase switching. Mounted once in the shell. */
export default function TimerWidget({ variant = "sidebar" }: { variant?: "sidebar" | "floating" }) {
  const { state, getById, stopTimer, advancePomodoro } = useStore();
  const { toast, openEdit } = useUI();
  const now = useNow(1000);
  const t = state.timer;
  const item = t ? getById(t.itemId) : undefined;
  const lastPhase = useRef<string | null>(null);

  // Auto-advance pomodoro phases (only one instance drives this).
  useEffect(() => {
    if (variant !== "sidebar" || !t || t.mode !== "pomodoro" || !t.endsAt) return;
    if (now.getTime() >= Date.parse(t.endsAt)) {
      const id = `${t.start}`;
      if (lastPhase.current === id) return;
      lastPhase.current = id;
      advancePomodoro();
      chime();
      const msg = t.phase === "work" ? "Pomodoro done — take a break ☕" : "Break over — back to it 🍅";
      toast(msg);
      try {
        if ("Notification" in window && Notification.permission === "granted") new Notification(msg);
      } catch {
        /* ignore */
      }
    }
  }, [now, t, variant, advancePomodoro, toast]);

  // Ask once for notification permission when a pomodoro starts.
  useEffect(() => {
    if (t?.mode === "pomodoro" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [t?.mode]);

  if (!t || !item) return null;

  const pomodoro = t.mode === "pomodoro" && t.endsAt;
  const seconds = pomodoro ? (Date.parse(t.endsAt!) - now.getTime()) / 1000 : (now.getTime() - Date.parse(t.start)) / 1000;
  const isBreak = t.phase === "break";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2",
        isBreak
          ? "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40"
          : "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
        variant === "floating" && "shadow-lift"
      )}
    >
      <span className={cn("h-2 w-2 shrink-0 animate-pulse rounded-full", isBreak ? "bg-sky-500" : "bg-emerald-500")} />
      <button onClick={() => openEdit(item)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-[12px] font-medium text-stone-800 dark:text-stone-100">
          {isBreak ? "Break" : item.title}
        </p>
        <p className="font-mono text-[13px] font-semibold tabular-nums text-stone-900 dark:text-stone-100">
          {pomodoro ? "🍅 " : ""}
          {fmt(seconds)}
        </p>
      </button>
      <button
        onClick={() => {
          stopTimer();
          toast(isBreak ? "Pomodoro stopped." : "Time logged.");
        }}
        aria-label="Stop timer"
        className="rounded-lg p-1.5 text-stone-500 hover:bg-white/70 hover:text-stone-800 dark:hover:bg-stone-800"
      >
        <IconStop width={14} height={14} />
      </button>
    </div>
  );
}
