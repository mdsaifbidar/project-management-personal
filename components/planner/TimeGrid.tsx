"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COLORS } from "@/lib/constants";
import { allowDrop, dragItem, droppedItem } from "@/lib/dnd";
import { formatTime, fromKey, todayKey, weekdayShort } from "@/lib/dates";
import { useNow } from "@/lib/hooks";
import { CalendarEntry, plannedMinutes } from "@/lib/selectors";
import { useUI } from "@/lib/ui";
import { useActions } from "@/lib/useActions";
import { Item } from "@/lib/types";
import { cn, shortMinutes } from "@/lib/utils";
import { PRIORITY_DOT } from "../Badge";
import Checkbox from "../Checkbox";

const SNAP = 15;
const DEFAULT_BLOCK = 30;

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Where inside a block the user grabbed it, so drops keep the block under the cursor. */
let grabOffsetPx = 0;

interface Placed {
  entry: CalendarEntry;
  start: number;
  end: number;
  col: number;
  cols: number;
}

/** Assign overlapping blocks to side-by-side columns (calendar-style). */
function layout(entries: CalendarEntry[]): Placed[] {
  const blocks = entries
    .map((entry) => {
      const start = toMin(entry.item.scheduledTime!);
      return { entry, start, end: start + Math.max(SNAP, entry.item.estimatedMinutes ?? DEFAULT_BLOCK), col: 0, cols: 1 };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const out: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((b) => b.col + 1));
    cluster.forEach((b) => (b.cols = cols));
    out.push(...cluster);
    cluster = [];
  };
  for (const b of blocks) {
    if (b.start >= clusterEnd && cluster.length) flush();
    const used = new Set(cluster.filter((c) => c.end > b.start).map((c) => c.col));
    let col = 0;
    while (used.has(col)) col++;
    b.col = col;
    cluster.push(b);
    clusterEnd = Math.max(clusterEnd, b.end);
  }
  if (cluster.length) flush();
  return out;
}

export default function TimeGrid({
  days,
  entries,
  onDayClick,
  hourHeight = 56,
}: {
  days: string[];
  entries: CalendarEntry[];
  onDayClick?: (day: string) => void;
  hourHeight?: number;
}) {
  const a = useActions();
  const { openNew } = useUI();
  const { dayStartHour, dayEndHour, dailyCapacityMinutes } = a.settings;
  const startMin = dayStartHour * 60;
  const endMin = dayEndHour * 60;
  const hours = Array.from({ length: dayEndHour - dayStartHour }, (_, i) => dayStartHour + i);
  const pxPerMin = hourHeight / 60;
  const today = todayKey();
  const now = useNow(60000);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const scroller = useRef<HTMLDivElement>(null);
  const [resize, setResize] = useState<{ id: string; minutes: number } | null>(null);
  const [dropHint, setDropHint] = useState<{ day: string; min: number } | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, { timed: CalendarEntry[]; allDay: CalendarEntry[] }>();
    for (const d of days) map.set(d, { timed: [], allDay: [] });
    for (const e of entries) {
      const slot = map.get(e.date);
      if (!slot) continue;
      if (e.kind === "scheduled" && e.item.scheduledTime) slot.timed.push(e);
      else slot.allDay.push(e);
    }
    return map;
  }, [days, entries]);

  // Scroll to "now" (or the first block) on mount.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const first = entries.find((e) => e.item.scheduledTime)?.item.scheduledTime;
    const target = days.includes(today) ? nowMin - 60 : first ? toMin(first) - 30 : 9 * 60;
    el.scrollTop = Math.max(0, (target - startMin) * pxPerMin);
    // Only on first render of this range.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.join()]);

  const minuteAt = (e: React.DragEvent | React.MouseEvent, col: HTMLElement, offset = 0) => {
    const y = e.clientY - col.getBoundingClientRect().top - offset;
    const raw = startMin + y / pxPerMin;
    return Math.min(endMin - SNAP, Math.max(startMin, Math.round(raw / SNAP) * SNAP));
  };

  const dropOn = (day: string, time?: string) => (e: React.DragEvent) => {
    e.preventDefault();
    setDropHint(null);
    const id = droppedItem(e);
    const item = id ? a.getById(id) : undefined;
    grabOffsetPx = 0;
    if (!item || item.type === "PROJECT") return;
    a.schedule(item, day, time);
  };

  const startResize = (item: Item) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const base = item.estimatedMinutes ?? DEFAULT_BLOCK;
    let minutes = base;
    const move = (ev: PointerEvent) => {
      minutes = Math.max(SNAP, Math.round((base + (ev.clientY - startY) / pxPerMin) / SNAP) * SNAP);
      setResize({ id: item.id, minutes });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setResize(null);
      if (minutes !== base) a.update(item.id, { estimatedMinutes: minutes });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const multi = days.length > 1;
  const wide = days.length > 3;
  const gridCols = { gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` };

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className={cn(wide && "overflow-x-auto")}>
        <div className={cn(wide && "min-w-[720px]")}>
          {/* Header */}
          <div className="grid border-b border-stone-100 dark:border-stone-800" style={gridCols}>
            <div />
            {days.map((d) => {
              const slot = byDay.get(d)!;
              const load = plannedMinutes([...slot.timed, ...slot.allDay]);
              const pct = Math.min(100, (load / dailyCapacityMinutes) * 100);
              const over = load > dailyCapacityMinutes;
              return (
                <button
                  key={d}
                  onClick={() => onDayClick?.(d)}
                  className={cn(
                    "border-l border-stone-100 px-2 py-2 text-left transition dark:border-stone-800",
                    onDayClick && "hover:bg-stone-50 dark:hover:bg-stone-800/50"
                  )}
                >
                  {multi ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-stone-400">{weekdayShort(d)}</span>
                      <span
                        className={cn(
                          "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-sm font-semibold",
                          d === today ? "bg-rose-500 text-white" : "text-stone-800 dark:text-stone-200"
                        )}
                      >
                        {fromKey(d).getDate()}
                      </span>
                    </div>
                  ) : null}
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                      <div className={cn("h-full rounded-full", over ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={cn("text-[10px] tabular-nums", over ? "text-rose-500" : "text-stone-400")}>
                      {shortMinutes(load)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* All-day / untimed */}
          <div className="grid border-b border-stone-100 dark:border-stone-800" style={gridCols}>
            <div className="px-1 py-1.5 text-right text-[10px] uppercase leading-tight tracking-wide text-stone-400">
              any
              <br />
              time
            </div>
            {days.map((d) => (
              <div
                key={d}
                onDragOver={allowDrop}
                onDrop={dropOn(d)}
                className="min-h-[2.5rem] space-y-1 border-l border-stone-100 p-1 dark:border-stone-800"
              >
                {byDay.get(d)!.allDay.map((e) => (
                  <AllDayChip key={`${e.item.id}-${e.kind}-${e.date}`} entry={e} />
                ))}
              </div>
            ))}
          </div>

          {/* Hours */}
          <div ref={scroller} className="max-h-[65vh] overflow-y-auto">
            <div className="relative grid" style={gridCols}>
              <div>
                {hours.map((h) => (
                  <div key={h} style={{ height: hourHeight }} className="relative pr-2 text-right">
                    <span className="absolute -top-2 right-2 text-[10px] tabular-nums text-stone-400">
                      {h === dayStartHour ? "" : formatTime(toHHMM(h * 60))}
                    </span>
                  </div>
                ))}
              </div>

              {days.map((d) => {
                const placed = layout(byDay.get(d)!.timed);
                return (
                  <div
                    key={d}
                    className={cn(
                      "relative cursor-copy border-l border-stone-100 dark:border-stone-800",
                      d === today && multi && "bg-rose-50/30 dark:bg-rose-950/10"
                    )}
                    onDragOver={(e) => {
                      allowDrop(e);
                      setDropHint({ day: d, min: minuteAt(e, e.currentTarget, grabOffsetPx) });
                    }}
                    onDragLeave={() => setDropHint(null)}
                    onDrop={(e) => dropOn(d, toHHMM(minuteAt(e, e.currentTarget, grabOffsetPx)))(e)}
                    onClick={(e) => {
                      if (e.target !== e.currentTarget) return;
                      openNew({
                        type: "TASK",
                        status: "NEXT",
                        scheduledDate: d,
                        scheduledTime: toHHMM(minuteAt(e, e.currentTarget)),
                        estimatedMinutes: DEFAULT_BLOCK,
                      });
                    }}
                  >
                    {hours.map((h) => (
                      <div
                        key={h}
                        style={{ height: hourHeight }}
                        className="pointer-events-none border-t border-stone-100 dark:border-stone-800/70"
                      >
                        <div className="h-1/2 border-b border-dashed border-stone-50 dark:border-stone-800/40" />
                      </div>
                    ))}

                    {dropHint?.day === d ? (
                      <div
                        className="pointer-events-none absolute inset-x-1 rounded-md border-2 border-dashed border-stone-400 bg-stone-100/60 dark:border-stone-500 dark:bg-stone-800/60"
                        style={{ top: (dropHint.min - startMin) * pxPerMin, height: DEFAULT_BLOCK * pxPerMin }}
                      >
                        <span className="px-1.5 text-[10px] font-medium text-stone-600 dark:text-stone-300">
                          {formatTime(toHHMM(dropHint.min))}
                        </span>
                      </div>
                    ) : null}

                    {placed.map((p) => {
                      const dur = resize?.id === p.entry.item.id ? resize.minutes : p.end - p.start;
                      const top = (Math.max(p.start, startMin) - startMin) * pxPerMin;
                      if (p.start >= endMin) return null;
                      return (
                        <Block
                          key={`${p.entry.item.id}-${p.entry.date}`}
                          entry={p.entry}
                          start={p.start}
                          minutes={dur}
                          style={{
                            top,
                            height: Math.max(18, dur * pxPerMin - 2),
                            left: `calc(${(p.col / p.cols) * 100}% + 2px)`,
                            width: `calc(${100 / p.cols}% - 4px)`,
                          }}
                          onResizeStart={startResize(p.entry.item)}
                        />
                      );
                    })}

                    {d === today && nowMin >= startMin && nowMin <= endMin ? (
                      <div
                        className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                        style={{ top: (nowMin - startMin) * pxPerMin }}
                      >
                        <span className="-ml-1 h-2 w-2 rounded-full bg-rose-500" />
                        <span className="h-px flex-1 bg-rose-500" />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({
  entry,
  start,
  minutes,
  style,
  onResizeStart,
}: {
  entry: CalendarEntry;
  start: number;
  minutes: number;
  style: React.CSSProperties;
  onResizeStart: (e: React.PointerEvent) => void;
}) {
  const a = useActions();
  const { openEdit } = useUI();
  const { item, virtual } = entry;
  const project = item.projectId ? a.getById(item.projectId) : undefined;
  const color = COLORS[project?.color ?? "stone"];
  const done = item.status === "DONE";
  const short = minutes <= 30;

  return (
    <div
      draggable={!virtual}
      onDragStart={(e) => {
        grabOffsetPx = e.clientY - e.currentTarget.getBoundingClientRect().top;
        dragItem(e, item.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        openEdit(item);
      }}
      style={style}
      className={cn(
        "group absolute z-[5] overflow-hidden rounded-lg border-l-[3px] px-1.5 text-left shadow-sm transition hover:z-20 hover:shadow-md",
        color.ring,
        virtual
          ? "border border-dashed border-stone-300 bg-white/70 opacity-70 dark:border-stone-700 dark:bg-stone-900/70"
          : done
            ? "bg-stone-100 opacity-60 dark:bg-stone-800"
            : cn(color.soft, "cursor-grab active:cursor-grabbing"),
        short ? "flex items-center gap-1.5 py-0" : "py-1"
      )}
    >
      <div className={cn("flex min-w-0 items-start gap-1.5", short && "items-center")}>
        {!virtual ? (
          <span className="mt-px" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              size={14}
              checked={done}
              priority={item.priority}
              onChange={() => (done ? a.reopen(item) : a.finish(item))}
            />
          </span>
        ) : (
          <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", PRIORITY_DOT[item.priority])} />
        )}
        <div className="min-w-0">
          <p className={cn("text-[12px] font-semibold leading-tight", minutes >= 60 ? "line-clamp-2 break-words" : "truncate", done && "line-through")}>
            {item.title}
          </p>
          {!short ? (
            <p className="truncate text-[10px] opacity-75">
              {formatTime(toHHMM(start))} – {formatTime(toHHMM(start + minutes))}
              {project ? ` · ${project.title}` : ""}
            </p>
          ) : null}
        </div>
      </div>
      {!virtual ? (
        <div
          onPointerDown={onResizeStart}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100"
        >
          <div className="mx-auto mt-0.5 h-1 w-6 rounded-full bg-current opacity-40" />
        </div>
      ) : null}
    </div>
  );
}

function AllDayChip({ entry }: { entry: CalendarEntry }) {
  const a = useActions();
  const { openEdit } = useUI();
  const { item, kind, virtual } = entry;
  const project = item.projectId ? a.getById(item.projectId) : undefined;
  const done = item.status === "DONE";
  return (
    <div
      draggable={!virtual}
      onDragStart={(e) => {
        grabOffsetPx = 0;
        dragItem(e, item.id);
      }}
      onClick={() => openEdit(item)}
      className={cn(
        "flex cursor-pointer items-center gap-1.5 truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        kind === "due"
          ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
          : virtual
            ? "border border-dashed border-stone-300 text-stone-500 dark:border-stone-700"
            : COLORS[project?.color ?? "stone"].soft,
        done && "line-through opacity-50"
      )}
      title={item.title}
    >
      {kind === "due" ? "⚑" : <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", PRIORITY_DOT[item.priority])} />}
      <span className="truncate">{item.title}</span>
    </div>
  );
}
