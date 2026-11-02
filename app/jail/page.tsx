"use client";

import { useMemo } from "react";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import QuickCapture from "@/components/QuickCapture";
import { PriorityBadge, TagChip, TypeIcon } from "@/components/Badge";
import { EMPTY_STATES } from "@/lib/constants";
import { diffDays, todayKey, isoToKey } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { useActions } from "@/lib/useActions";
import { formatDate } from "@/lib/utils";

export default function JailPage() {
  const a = useActions();
  const { openEdit, toast, setTemplateOpen } = useUI();
  const { update } = useStore();
  const today = todayKey();

  const jailed = useMemo(
    () => a.items.filter((i) => i.status === "JAIL").sort((x, y) => y.createdAt.localeCompare(x.createdAt)),
    [a.items]
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Idea Jail 🔒"
        subtitle="Good ideas can wait. Promote one only when it earns it."
        right={
          a.ready ? (
            <span className="text-[12px] text-stone-400">
              {jailed.length} idea{jailed.length === 1 ? "" : "s"} waiting
            </span>
          ) : null
        }
      />

      <QuickCapture placeholder="Dump an idea. It's safe here." defaults={{ status: "JAIL", type: "IDEA" }} />

      {a.ready && jailed.length === 0 ? <EmptyState title={EMPTY_STATES.jail} /> : null}

      <div className="space-y-2">
        {jailed.map((item) => {
          const age = diffDays(today, isoToKey(item.createdAt) ?? today);
          return (
            <div
              key={item.id}
              className="group animate-fade-in flex items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 transition hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900"
            >
              <TypeIcon type={item.type} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <button onClick={() => openEdit(item)} className="block text-left text-[15px] font-medium text-stone-900 hover:underline dark:text-stone-100">
                  {item.title}
                </button>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-stone-400">
                  <PriorityBadge priority={item.priority} />
                  <span>
                    Captured {formatDate(item.createdAt)}
                    {age > 30 ? ` · ${age} days in jail` : ""}
                  </span>
                  {item.tags.map((t) => (
                    <TagChip key={t} tag={t} />
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                <button
                  onClick={() => {
                    a.moveTo(item.id, "NEXT");
                    if (item.type === "IDEA") update(item.id, { type: "TASK" });
                    toast("Promoted to Next.", { label: "Undo", run: () => void a.undo() });
                  }}
                  className="rounded-md px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  → Task
                </button>
                <button
                  onClick={() => {
                    update(item.id, { type: "PROJECT", status: "NEXT", startDate: today });
                    toast("Promoted to a project.", { label: "Undo", run: () => void a.undo() });
                  }}
                  className="rounded-md px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  → Project
                </button>
                <button
                  onClick={() => a.schedule(item, today)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"
                >
                  Do today
                </button>
                <button
                  onClick={() => a.del(item)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  Kill
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {jailed.length > 0 ? (
        <p className="text-center text-[12px] text-stone-400">
          Big idea? <button onClick={() => setTemplateOpen(true)} className="underline">Start it from a template</button> when it&apos;s time.
        </p>
      ) : null}
    </div>
  );
}
