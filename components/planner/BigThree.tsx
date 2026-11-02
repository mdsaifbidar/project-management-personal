"use client";

import { useMemo, useState } from "react";
import { PRIORITY_WEIGHT } from "@/lib/constants";
import { isOpen } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { useActions } from "@/lib/useActions";
import { cn } from "@/lib/utils";
import Checkbox from "../Checkbox";
import { IconX } from "../icons";
import { Card } from "../primitives";

/**
 * The three things that would make this period a win. Works for a day
 * ("2026-11-02"), week ("2026-W45"), month, etc.
 */
export default function BigThree({ periodKey, title = "Big 3" }: { periodKey: string; title?: string }) {
  const a = useActions();
  const { state, setNote } = useStore();
  const [picking, setPicking] = useState(false);
  const saved = state.notes[periodKey]?.bigThree;
  const ids = useMemo(() => saved ?? [], [saved]);
  const picked = ids.map((id) => a.getById(id)).filter((i) => !!i);

  const candidates = useMemo(
    () =>
      a.items
        .filter((i) => isOpen(i) && i.type !== "PROJECT" && !ids.includes(i.id))
        .sort(
          (x, y) =>
            Number(y.status === "NOW") - Number(x.status === "NOW") ||
            PRIORITY_WEIGHT[y.priority] - PRIORITY_WEIGHT[x.priority]
        )
        .slice(0, 30),
    [a.items, ids]
  );

  const setIds = (next: string[]) => setNote(periodKey, { bigThree: next.slice(0, 3) });

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">⭐ {title}</p>
        <span className="text-[11px] text-stone-400">
          {picked.filter((i) => i!.status === "DONE").length}/{Math.max(3, picked.length)}
        </span>
      </div>
      <ol className="space-y-1.5">
        {[0, 1, 2].map((slot) => {
          const item = picked[slot];
          if (!item) {
            return (
              <li key={slot}>
                <button
                  onClick={() => setPicking(true)}
                  className="flex w-full items-center gap-2 rounded-lg border border-dashed border-stone-200 px-2.5 py-2 text-left text-[13px] text-stone-400 hover:border-stone-300 hover:text-stone-600 dark:border-stone-700 dark:hover:text-stone-300"
                >
                  <span className="font-semibold">{slot + 1}.</span> Pick something that matters
                </button>
              </li>
            );
          }
          const done = item.status === "DONE";
          return (
            <li key={item.id} className="group flex items-center gap-2 rounded-lg bg-stone-50 px-2.5 py-2 dark:bg-stone-800/50">
              <Checkbox checked={done} priority={item.priority} onChange={() => (done ? a.reopen(item) : a.finish(item))} />
              <span className={cn("flex-1 truncate text-[13px] font-medium", done ? "text-stone-400 line-through" : "text-stone-800 dark:text-stone-200")}>
                {item.title}
              </span>
              <button
                onClick={() => setIds(ids.filter((x) => x !== item.id))}
                aria-label="Remove from Big 3"
                className="text-stone-300 opacity-0 hover:text-stone-600 group-hover:opacity-100"
              >
                <IconX width={14} height={14} />
              </button>
            </li>
          );
        })}
      </ol>

      {picking && ids.length < 3 ? (
        <div className="animate-fade-in mt-2 max-h-56 overflow-y-auto rounded-lg border border-stone-200 dark:border-stone-700">
          {candidates.length === 0 ? (
            <p className="p-3 text-[12px] text-stone-400">No open items to pick from.</p>
          ) : (
            candidates.map((i) => (
              <button
                key={i.id}
                onClick={() => {
                  setIds([...ids, i.id]);
                  if (ids.length >= 2) setPicking(false);
                }}
                className="block w-full truncate px-3 py-1.5 text-left text-[13px] text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                {i.title}
              </button>
            ))
          )}
          <button
            onClick={() => setPicking(false)}
            className="w-full border-t border-stone-100 py-1.5 text-[11px] text-stone-400 hover:text-stone-600 dark:border-stone-800"
          >
            Close
          </button>
        </div>
      ) : null}
    </Card>
  );
}
