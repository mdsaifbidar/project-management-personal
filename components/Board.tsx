"use client";

import { useState } from "react";
import { PRIORITY_WEIGHT, STATUS_LABEL } from "@/lib/constants";
import { addDays, isoToKey, todayKey } from "@/lib/dates";
import { allowDrop, droppedItem } from "@/lib/dnd";
import { useUI } from "@/lib/ui";
import { useActions } from "@/lib/useActions";
import { Item, ItemStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import ItemCard from "./ItemCard";
import { Count } from "./primitives";

const COLUMN_TINT: Record<ItemStatus, string> = {
  NOW: "bg-emerald-500",
  NEXT: "bg-sky-500",
  LATER: "bg-stone-400",
  JAIL: "bg-amber-500",
  DONE: "bg-violet-500",
};

/** Kanban board by status. Drag cards between columns. */
export default function Board({
  items,
  columns = ["NOW", "NEXT", "LATER", "DONE"],
  defaults,
  showProject = true,
}: {
  items: Item[];
  columns?: ItemStatus[];
  defaults?: Partial<Item>;
  showProject?: boolean;
}) {
  const a = useActions();
  const { openNew } = useUI();
  const [over, setOver] = useState<ItemStatus | null>(null);
  const recent = addDays(todayKey(), -14);

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="grid min-w-[840px] gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
        {columns.map((status) => {
          let col = items.filter((i) => i.status === status);
          if (status === "DONE") col = col.filter((i) => (isoToKey(i.completedAt) ?? "") >= recent);
          col.sort(
            (x, y) =>
              PRIORITY_WEIGHT[y.priority] - PRIORITY_WEIGHT[x.priority] ||
              (x.scheduledDate ?? "9").localeCompare(y.scheduledDate ?? "9")
          );
          return (
            <div
              key={status}
              onDragOver={(e) => {
                allowDrop(e);
                setOver(status);
              }}
              onDragLeave={() => setOver((o) => (o === status ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = droppedItem(e);
                const item = id ? a.getById(id) : undefined;
                if (item && item.status !== status) a.move(item, status);
              }}
              className={cn(
                "flex min-h-[60vh] flex-col rounded-2xl bg-stone-100/70 p-2 transition dark:bg-stone-900/60",
                over === status && "bg-stone-200/80 ring-2 ring-stone-400 dark:bg-stone-800"
              )}
            >
              <div className="mb-2 flex items-center justify-between px-1.5 pt-1">
                <h3 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  <span className={cn("h-2 w-2 rounded-full", COLUMN_TINT[status])} />
                  {STATUS_LABEL[status]}
                  <Count n={col.length} />
                </h3>
                {status !== "DONE" ? (
                  <button
                    onClick={() => openNew({ type: "TASK", ...defaults, status })}
                    className="rounded-md px-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-800"
                    aria-label={`Add to ${STATUS_LABEL[status]}`}
                  >
                    +
                  </button>
                ) : (
                  <span className="text-[10px] text-stone-400">last 14 days</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                {col.map((i) => (
                  <ItemCard key={i.id} item={i} compact showProject={showProject} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
