"use client";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function WipIndicator({ compact = false }: { compact?: boolean }) {
  const { activeProjects, settings } = useStore();
  const count = activeProjects.length;
  const limit = settings.wipLimit;
  const atLimit = count >= limit;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide",
        atLimit
          ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
          : "border-stone-200 bg-white text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
      )}
      title={settings.enforceWip ? "Maximum active projects (change in Settings)" : "WIP limit not enforced"}
    >
      <span className={cn("flex gap-1", limit > 8 && "hidden")}>
        {Array.from({ length: limit > 8 ? 0 : Math.max(limit, count) }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              i < count ? (atLimit ? "bg-rose-500" : "bg-stone-800 dark:bg-stone-200") : "bg-stone-300 dark:bg-stone-700"
            )}
          />
        ))}
      </span>
      {compact ? (
        <span>
          {count}/{limit}
        </span>
      ) : (
        <span>
          Active projects: {count} / {limit}
        </span>
      )}
    </div>
  );
}
