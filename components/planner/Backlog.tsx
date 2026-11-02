"use client";

import { useMemo, useState } from "react";
import { COLORS } from "@/lib/constants";
import { allowDrop, dragItem, droppedItem } from "@/lib/dnd";
import { relativeDay, todayKey } from "@/lib/dates";
import { overdueItems, unscheduledItems } from "@/lib/selectors";
import { useUI } from "@/lib/ui";
import { useActions } from "@/lib/useActions";
import { Item } from "@/lib/types";
import { cn, shortMinutes } from "@/lib/utils";
import { PRIORITY_DOT } from "../Badge";
import Select from "../pickers/Select";
import { Segmented } from "../primitives";

/**
 * Side panel of things to plan: overdue + unscheduled. Drag onto any calendar
 * day or time slot; drop back here to unschedule.
 */
export default function Backlog() {
  const a = useActions();
  const [projectId, setProjectId] = useState("");
  const [mode, setMode] = useState<"unscheduled" | "overdue">("unscheduled");
  const [over, setOver] = useState(false);
  const today = todayKey();

  const list = useMemo(() => {
    const base = mode === "overdue" ? overdueItems(a.items, today) : unscheduledItems(a.items);
    return projectId
      ? base.filter((i) => (projectId === "none" ? !i.projectId : i.projectId === projectId))
      : base;
  }, [a.items, mode, projectId, today]);
  const overdueCount = useMemo(() => overdueItems(a.items, today).length, [a.items, today]);

  return (
    <aside
      onDragOver={(e) => {
        allowDrop(e);
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = droppedItem(e);
        const item = id ? a.getById(id) : undefined;
        if (item?.scheduledDate) a.schedule(item, undefined);
      }}
      className={cn(
        "flex flex-col rounded-2xl border border-stone-200 bg-white p-3 transition dark:border-stone-800 dark:bg-stone-900",
        over && "ring-2 ring-stone-400"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">To plan</p>
        <Segmented
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: "unscheduled", label: "Backlog" },
            { value: "overdue", label: <>Overdue{overdueCount ? <span className="ml-1 text-rose-500">{overdueCount}</span> : null}</> },
          ]}
        />
      </div>
      <Select
        label="Show"
        size="sm"
        className="mb-2"
        value={projectId}
        onChange={setProjectId}
        options={[
          { value: "", label: "All projects & tasks" },
          { value: "none", label: "Standalone tasks" },
          ...a.projects
            .filter((p) => p.status !== "DONE")
            .map((p) => ({ value: p.id, label: p.title, dot: COLORS[p.color ?? "stone"].dot })),
        ]}
      />
      <p className="mb-2 text-[11px] text-stone-400">Drag onto a day or time slot.</p>
      <div className="-mx-1 max-h-[60vh] flex-1 space-y-1 overflow-y-auto px-1">
        {list.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-stone-400">
            {mode === "overdue" ? "Nothing overdue. 👌" : "Everything is planned."}
          </p>
        ) : (
          list.map((i) => <BacklogRow key={i.id} item={i} today={today} />)
        )}
      </div>
    </aside>
  );
}

function BacklogRow({ item, today }: { item: Item; today: string }) {
  const a = useActions();
  const { openEdit } = useUI();
  const project = item.projectId ? a.getById(item.projectId) : undefined;
  return (
    <div
      draggable
      onDragStart={(e) => dragItem(e, item.id)}
      onClick={() => openEdit(item)}
      className="group flex cursor-grab items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 hover:border-stone-200 hover:bg-stone-50 active:cursor-grabbing dark:hover:border-stone-700 dark:hover:bg-stone-800/50"
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[item.priority])} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-stone-800 dark:text-stone-200">{item.title}</p>
        <p className="flex items-center gap-1.5 truncate text-[10px] text-stone-400">
          {project ? (
            <>
              <span className={cn("h-1.5 w-1.5 rounded-full", COLORS[project.color ?? "stone"].dot)} />
              {project.title}
            </>
          ) : (
            "Standalone"
          )}
          {item.estimatedMinutes ? ` · ${shortMinutes(item.estimatedMinutes)}` : ""}
          {item.dueDate ? (
            <span className={item.dueDate < today ? "text-rose-500" : ""}> · due {relativeDay(item.dueDate, today)}</span>
          ) : null}
          {item.scheduledDate && item.scheduledDate < today ? (
            <span className="text-rose-500"> · was {relativeDay(item.scheduledDate, today)}</span>
          ) : null}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          a.schedule(item, today);
        }}
        className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-stone-400 opacity-0 hover:bg-stone-200 hover:text-stone-800 group-hover:opacity-100 dark:hover:bg-stone-700 dark:hover:text-stone-100 max-md:opacity-100"
      >
        Today
      </button>
    </div>
  );
}
