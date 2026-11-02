"use client";

import { useMemo, useState } from "react";
import { STATUS_LABEL } from "@/lib/constants";
import { formatTime, relativeDay } from "@/lib/dates";
import { parseCapture } from "@/lib/parse";
import { describeRecurrence } from "@/lib/recurrence";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { ItemStatus, NewItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const CHIP_STYLE: Record<string, string> = {
  date: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  due: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  time: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  estimate: "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200",
  priority: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  tag: "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300",
  project: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  area: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
  repeat: "bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300",
  status: "bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900",
};

/**
 * One-line capture with natural-language parsing. `defaults` lets a screen
 * pre-fill context (e.g. the planner day or the current project).
 */
export default function QuickCapture({
  defaults,
  placeholder = "What's on your mind?",
  compact = false,
}: {
  defaults?: Partial<NewItem>;
  placeholder?: string;
  compact?: boolean;
}) {
  const { add, projects, settings } = useStore();
  const { toast } = useUI();
  const [value, setValue] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [focused, setFocused] = useState(false);

  const parsed = useMemo(
    () =>
      parseCapture(value, {
        projects: projects.filter((p) => p.status !== "DONE"),
        areas: settings.areas,
        weekStartsOn: settings.weekStartsOn,
      }),
    [value, projects, settings.areas, settings.weekStartsOn]
  );

  const f = { ...defaults, ...parsed.fields };
  const decided = !!(f.scheduledDate || f.dueDate || f.projectId);
  const status: ItemStatus =
    parsed.fields.status ?? defaults?.status ?? (decided ? "NEXT" : settings.captureStatus);
  const type = defaults?.type ?? (status === "JAIL" && !decided ? "IDEA" : "TASK");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = parsed.title.trim();
    if (!title) return;
    add({ ...f, title, status, type });
    setValue("");
    const bits = [
      f.scheduledDate && `${relativeDay(f.scheduledDate)}${f.scheduledTime ? ` ${formatTime(f.scheduledTime)}` : ""}`,
      f.recurrence && describeRecurrence(f.recurrence).toLowerCase(),
    ].filter(Boolean);
    toast(status === "JAIL" ? "Added to Idea Jail 🔒" : `Added to ${STATUS_LABEL[status]}${bits.length ? ` · ${bits.join(" · ")}` : ""}.`);
  };

  return (
    <div>
      <form onSubmit={submit} className="relative">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          aria-label="Quick capture"
          className={cn(
            "w-full rounded-xl border border-stone-200 bg-white pr-12 text-stone-900 sm:pr-28 shadow-soft outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-4 focus:ring-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-stone-600 dark:focus:ring-stone-800",
            compact ? "px-3 py-2 text-sm" : "px-4 py-3.5 text-[15px]"
          )}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          <span className="pointer-events-none hidden text-[11px] text-stone-300 dark:text-stone-600 sm:block">
            → {STATUS_LABEL[status]}
          </span>
          <button
            type="button"
            onClick={() => setShowHelp((s) => !s)}
            aria-label="Capture syntax help"
            className="h-6 w-6 rounded-full text-[12px] font-semibold text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"
          >
            ?
          </button>
        </div>
      </form>

      {focused && !value && !showHelp ? (
        <p className="animate-fade-in mt-2 truncate px-1 text-[12px] text-stone-400">
          Try: <span className="font-mono text-stone-500 dark:text-stone-400">Write post fri 3pm #seo !high 45m</span>
        </p>
      ) : null}

      {parsed.chips.length > 0 && value ? (
        <div className="animate-fade-in mt-2 flex flex-wrap items-center gap-1.5 px-1">
          {parsed.chips.map((c, i) => (
            <span key={i} className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", CHIP_STYLE[c.kind])}>
              {c.kind === "date" && f.scheduledDate ? relativeDay(f.scheduledDate) : c.kind === "due" && f.dueDate ? `due ${relativeDay(f.dueDate)}` : c.label}
            </span>
          ))}
          <span className="text-[11px] text-stone-400">“{parsed.title}”</span>
        </div>
      ) : null}

      {showHelp ? (
        <div className="animate-fade-in mt-2 grid grid-cols-1 gap-x-6 gap-y-1 rounded-xl border border-stone-200 bg-white p-4 text-[12px] text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 sm:grid-cols-2">
          {[
            ["today, tmr, fri, nov 15, in 3 days", "plan for a day"],
            ["due fri", "deadline"],
            ["3pm, 15:30, at 9am", "time block"],
            ["30m, 1h, 1h30m", "estimate"],
            ["!1 … !4 or !high", "priority"],
            ["#tag", "tags"],
            ["@project", "link to a project"],
            ["+area", "life area"],
            ["daily, weekly, every 2 weeks", "repeat"],
            [">now >next >later >jail", "status"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <code className="font-mono text-stone-700 dark:text-stone-300">{k}</code>
              <span>{v}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
