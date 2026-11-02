"use client";

import { COLORS } from "@/lib/constants";
import { dragItem } from "@/lib/dnd";
import { describeRecurrence } from "@/lib/recurrence";
import { useUI } from "@/lib/ui";
import { useActions } from "@/lib/useActions";
import { Item } from "@/lib/types";
import { cn, formatMinutes, shortMinutes, trackedMinutes } from "@/lib/utils";
import { DateChip, MetaChip, PriorityBadge, TagChip, TypeIcon } from "./Badge";
import Checkbox from "./Checkbox";
import { IconClock, IconPlay, IconRepeat, IconStop } from "./icons";
import ItemActions from "./ItemActions";

export default function ItemCard({
  item,
  showProject = true,
  compact = false,
  draggable = true,
}: {
  item: Item;
  showProject?: boolean;
  compact?: boolean;
  draggable?: boolean;
}) {
  const a = useActions();
  const { openEdit } = useUI();
  const project = item.projectId ? a.getById(item.projectId) : undefined;
  const area = item.areaId ? a.settings.areas.find((x) => x.id === item.areaId) : undefined;
  const done = item.status === "DONE";
  const timing = a.state.timer?.itemId === item.id;
  const tracked = trackedMinutes(item);
  const checks = item.checklist.length;
  const checksDone = item.checklist.filter((c) => c.done).length;
  const isProject = item.type === "PROJECT";

  return (
    <div
      draggable={draggable && !isProject}
      onDragStart={(e) => dragItem(e, item.id)}
      className={cn(
        "group animate-fade-in flex items-start gap-3 rounded-xl border bg-white transition dark:bg-stone-900",
        compact ? "px-3 py-2" : "px-4 py-3",
        item.status === "NOW"
          ? "border-stone-300 shadow-soft ring-1 ring-stone-200 dark:border-stone-600 dark:ring-stone-700"
          : "border-stone-200 hover:border-stone-300 hover:shadow-soft dark:border-stone-800 dark:hover:border-stone-700",
        draggable && !isProject && "cursor-grab active:cursor-grabbing",
        project?.color && cn("border-l-[3px]", COLORS[project.color].ring)
      )}
    >
      <div className="pt-0.5">
        {isProject ? (
          <TypeIcon type={item.type} className="text-base leading-none" />
        ) : (
          <Checkbox
            checked={done}
            priority={item.priority}
            onChange={() => (done ? a.reopen(item) : a.finish(item))}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <button
          onClick={() => openEdit(item)}
          className={cn(
            "block max-w-full text-left font-medium leading-snug hover:underline",
            compact ? "text-[14px]" : "text-[15px]",
            done ? "text-stone-400 line-through decoration-stone-300" : "text-stone-900 dark:text-stone-100"
          )}
        >
          {!isProject && item.type !== "TASK" ? (
            <TypeIcon type={item.type} className="mr-1.5 text-[13px]" />
          ) : null}
          {item.title}
        </button>

        {item.description && !compact ? (
          <p className="mt-0.5 line-clamp-1 text-[13px] text-stone-500 dark:text-stone-400">
            {item.description}
          </p>
        ) : null}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {item.priority !== "LOW" && item.priority !== "MEDIUM" ? (
            <PriorityBadge priority={item.priority} />
          ) : null}
          {item.scheduledDate ? (
            <DateChip date={item.scheduledDate} time={item.scheduledTime} kind="scheduled" done={done} />
          ) : null}
          {item.dueDate ? <DateChip date={item.dueDate} kind="due" done={done} /> : null}
          {item.recurrence ? (
            <MetaChip>
              <IconRepeat width={12} height={12} />
              {describeRecurrence(item.recurrence)}
            </MetaChip>
          ) : null}
          {item.estimatedMinutes || tracked ? (
            <MetaChip>
              <IconClock width={12} height={12} />
              {tracked ? `${shortMinutes(tracked)} / ` : ""}
              {item.estimatedMinutes ? shortMinutes(item.estimatedMinutes) : formatMinutes(0)}
            </MetaChip>
          ) : null}
          {checks ? (
            <MetaChip className={checksDone === checks ? "text-emerald-600 dark:text-emerald-400" : undefined}>
              ☑ {checksDone}/{checks}
            </MetaChip>
          ) : null}
          {showProject && project ? (
            <MetaChip>
              <span className={cn("h-1.5 w-1.5 rounded-full", COLORS[project.color ?? "stone"].dot)} />
              {project.title}
            </MetaChip>
          ) : null}
          {area && !project ? (
            <MetaChip>
              {area.icon} {area.name}
            </MetaChip>
          ) : null}
          {item.tags.map((t) => (
            <TagChip key={t} tag={t} />
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {!done && !isProject ? (
          <button
            onClick={() => (timing ? a.stopTimer() : a.startTimer(item.id))}
            aria-label={timing ? "Stop timer" : "Start timer"}
            title={timing ? "Stop timer" : "Start timer"}
            className={cn(
              "rounded-md p-1.5 transition",
              timing
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "text-stone-400 opacity-0 hover:bg-stone-100 hover:text-stone-700 group-hover:opacity-100 dark:hover:bg-stone-800 dark:hover:text-stone-200 max-md:opacity-100"
            )}
          >
            {timing ? <IconStop width={14} height={14} /> : <IconPlay width={14} height={14} />}
          </button>
        ) : null}
        <ItemActions item={item} />
      </div>
    </div>
  );
}
