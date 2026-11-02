"use client";

import { useMemo, useState } from "react";
import { COLORS } from "@/lib/constants";
import { allowDrop, dragItem, droppedItem } from "@/lib/dnd";
import { formatTime, fromKey, monthGrid, todayKey, weekdayShort } from "@/lib/dates";
import { CalendarEntry, calendarEntries, groupByDate, plannedMinutes } from "@/lib/selectors";
import { useUI } from "@/lib/ui";
import { useActions } from "@/lib/useActions";
import { cn } from "@/lib/utils";
import { PRIORITY_DOT } from "../Badge";

const MAX_CHIPS = 3;

export default function MonthView({
  anchor,
  onDayClick,
}: {
  anchor: string;
  onDayClick: (day: string) => void;
}) {
  const a = useActions();
  const { openNew } = useUI();
  const [over, setOver] = useState<string | null>(null);
  const grid = useMemo(() => monthGrid(anchor, a.settings.weekStartsOn), [anchor, a.settings.weekStartsOn]);
  const byDate = useMemo(
    () => groupByDate(calendarEntries(a.items, grid[0], grid[41])),
    [a.items, grid]
  );
  const month = anchor.slice(0, 7);
  const today = todayKey();
  const projectDue = useMemo(
    () => groupByDate(
      a.projects
        .filter((p) => p.dueDate && p.status !== "DONE")
        .map((p) => ({ item: p, date: p.dueDate!, kind: "due" as const, virtual: false }))
    ),
    [a.projects]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="grid grid-cols-7 border-b border-stone-100 dark:border-stone-800">
        {grid.slice(0, 7).map((d) => (
          <div key={d} className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            {weekdayShort(d)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((d, i) => {
          const entries = byDate.get(d) ?? [];
          const deadlines = projectDue.get(d) ?? [];
          const inMonth = d.startsWith(month);
          const load = plannedMinutes(entries);
          const heavy = load > a.settings.dailyCapacityMinutes;
          return (
            <div
              key={d}
              onDragOver={(e) => {
                allowDrop(e);
                setOver(d);
              }}
              onDragLeave={() => setOver((o) => (o === d ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = droppedItem(e);
                const item = id ? a.getById(id) : undefined;
                if (item && item.type !== "PROJECT") a.schedule(item, d, item.scheduledTime);
              }}
              onDoubleClick={() => openNew({ type: "TASK", status: "NEXT", scheduledDate: d })}
              className={cn(
                "group min-h-[4rem] border-stone-100 p-1 transition dark:border-stone-800 sm:min-h-[7.5rem] sm:p-1.5",
                i % 7 !== 0 && "border-l",
                i >= 7 && "border-t",
                !inMonth && "bg-stone-50/60 dark:bg-stone-950/40",
                over === d && "bg-stone-100 ring-2 ring-inset ring-stone-400 dark:bg-stone-800"
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <button
                  onClick={() => onDayClick(d)}
                  className={cn(
                    "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] font-semibold transition hover:bg-stone-200 dark:hover:bg-stone-700",
                    d === today
                      ? "bg-rose-500 text-white hover:bg-rose-600"
                      : inMonth
                        ? "text-stone-700 dark:text-stone-200"
                        : "text-stone-300 dark:text-stone-600"
                  )}
                >
                  {fromKey(d).getDate()}
                </button>
                <div className="flex items-center gap-1">
                  {load > 0 ? (
                    <span className={cn("hidden text-[10px] tabular-nums sm:inline", heavy ? "text-rose-500" : "text-stone-400")}>
                      {Math.round(load / 6) / 10}h
                    </span>
                  ) : null}
                  <button
                    onClick={() => openNew({ type: "TASK", status: "NEXT", scheduledDate: d })}
                    className="hidden h-5 w-5 items-center justify-center rounded text-stone-400 hover:bg-stone-200 hover:text-stone-700 group-hover:inline-flex dark:hover:bg-stone-700"
                    aria-label="Add on this day"
                  >
                    +
                  </button>
                </div>
              </div>
              {/* Phones: a row of dots per day; tap the date to open it. */}
              <button onClick={() => onDayClick(d)} className="flex flex-wrap gap-1 sm:hidden" aria-label={`${entries.length + deadlines.length} items`}>
                {deadlines.map((e) => (
                  <span key={e.item.id} className={cn("h-1.5 w-1.5 rotate-45", COLORS[e.item.color ?? "stone"].dot)} />
                ))}
                {entries.slice(0, 6).map((e) => (
                  <span
                    key={`${e.item.id}-${e.kind}-${e.virtual}`}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      e.kind === "due" ? "bg-rose-500" : e.virtual ? "border border-stone-400" : PRIORITY_DOT[e.item.priority],
                      e.item.status === "DONE" && "opacity-40"
                    )}
                  />
                ))}
              </button>
              <div className="hidden space-y-0.5 sm:block">
                {deadlines.map((e) => (
                  <div
                    key={e.item.id}
                    className={cn("truncate rounded px-1.5 py-px text-[10px] font-semibold", COLORS[e.item.color ?? "stone"].soft)}
                  >
                    🏁 {e.item.title}
                  </div>
                ))}
                {entries.slice(0, MAX_CHIPS).map((e) => (
                  <Chip key={`${e.item.id}-${e.kind}-${e.virtual}`} entry={e} />
                ))}
                {entries.length > MAX_CHIPS ? (
                  <button
                    onClick={() => onDayClick(d)}
                    className="w-full rounded px-1.5 text-left text-[10px] font-medium text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  >
                    +{entries.length - MAX_CHIPS} more
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ entry }: { entry: CalendarEntry }) {
  const a = useActions();
  const { openEdit } = useUI();
  const { item, kind, virtual } = entry;
  const project = item.projectId ? a.getById(item.projectId) : undefined;
  const done = item.status === "DONE";
  return (
    <div
      draggable={!virtual}
      onDragStart={(e) => dragItem(e, item.id)}
      onClick={(e) => {
        e.stopPropagation();
        openEdit(item);
      }}
      title={item.title}
      className={cn(
        "flex cursor-pointer items-center gap-1 truncate rounded px-1.5 py-px text-[11px] leading-5 transition hover:brightness-95",
        kind === "due"
          ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
          : virtual
            ? "border border-dashed border-stone-200 text-stone-400 dark:border-stone-700"
            : COLORS[project?.color ?? "stone"].soft,
        done && "line-through opacity-50"
      )}
    >
      {kind === "due" ? (
        <span>⚑</span>
      ) : (
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", PRIORITY_DOT[item.priority])} />
      )}
      {item.scheduledTime && kind === "scheduled" ? (
        <span className="shrink-0 tabular-nums opacity-70">{formatTime(item.scheduledTime).replace(":00", "")}</span>
      ) : null}
      <span className="truncate">{item.title}</span>
    </div>
  );
}
