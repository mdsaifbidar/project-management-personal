"use client";

import { EMPTY_STATES } from "@/lib/constants";
import { useNow } from "@/lib/hooks";
import { toKey } from "@/lib/dates";
import { priorityLabel, recommend } from "@/lib/recommendation";
import { useUI } from "@/lib/ui";
import { useActions } from "@/lib/useActions";
import { formatMinutes, shortMinutes, trackedMinutes } from "@/lib/utils";
import { TypeIcon } from "./Badge";
import Checkbox from "./Checkbox";
import { ProgressBar } from "./primitives";

export default function FocusCard({ heading }: { heading: string }) {
  const a = useActions();
  const { openEdit } = useUI();
  const now = useNow(60000);
  const today = toKey(now);

  if (!a.ready) {
    return <div className="h-52 animate-pulse rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900" />;
  }

  const { item, reason } = recommend(a.items, {
    today,
    nowTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    bigThree: a.state.notes[today]?.bigThree,
  });

  if (!item) {
    return (
      <section className="rounded-2xl border border-stone-200 bg-white p-8 text-center dark:border-stone-800 dark:bg-stone-900">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400">{heading}</p>
        <p className="mt-4 text-lg font-medium text-stone-700 dark:text-stone-200">{EMPTY_STATES.clear}</p>
      </section>
    );
  }

  const project = item.projectId ? a.getById(item.projectId) : undefined;
  const active = item.status === "NOW";
  const timing = a.state.timer?.itemId === item.id;
  const tracked = trackedMinutes(item);
  const checks = item.checklist;

  return (
    <section className="animate-slide-up rounded-2xl border border-stone-300 bg-white p-6 shadow-soft ring-1 ring-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:ring-stone-800 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400">{heading}</p>
        {active ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Working on this now
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-start gap-3">
        <TypeIcon type={item.type} className="text-2xl leading-none" />
        <div className="min-w-0">
          <button onClick={() => openEdit(item)} className="text-left text-xl font-semibold tracking-tight text-stone-900 hover:underline dark:text-stone-100 sm:text-2xl">
            {item.title}
          </button>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {priorityLabel(item)} · {formatMinutes(item.estimatedMinutes)}
            {project ? ` · ${project.title}` : ""}
            {tracked ? ` · ${shortMinutes(tracked)} tracked` : ""}
          </p>
        </div>
      </div>

      {item.description ? <p className="mt-4 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">{item.description}</p> : null}

      {checks.length ? (
        <div className="mt-4 space-y-1.5">
          <ProgressBar percent={(checks.filter((c) => c.done).length / checks.length) * 100} barClass="bg-emerald-500" />
          {checks.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                size={16}
                checked={c.done}
                onChange={() => a.update(item.id, { checklist: checks.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)) })}
              />
              <span className={c.done ? "text-stone-400 line-through" : "text-stone-700 dark:text-stone-200"}>{c.text}</span>
            </label>
          ))}
        </div>
      ) : null}

      <div className="mt-4 rounded-xl bg-stone-50 px-4 py-3 dark:bg-stone-800/50">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Why</p>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{reason}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {timing ? (
          <button
            onClick={() => a.stopTimer()}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            ■ Stop timer
          </button>
        ) : (
          <>
            <button
              onClick={() => a.startTimer(item.id, "pomodoro")}
              className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
            >
              🍅 Focus {a.settings.pomodoroWork} min
            </button>
            <button
              onClick={() => (active ? a.startTimer(item.id) : a.start(item))}
              className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              {active ? "▶ Track time" : "Start"}
            </button>
          </>
        )}
        <button
          onClick={() => a.finish(item)}
          className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          ✓ Complete
        </button>
        <button
          onClick={() => a.move(item, "LATER")}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-stone-500 transition hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          Later
        </button>
        <button
          onClick={() => a.move(item, "JAIL")}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
        >
          Kill
        </button>
      </div>
    </section>
  );
}
