"use client";

import { cn } from "@/lib/utils";

/** iOS-style toggle (replaces <input type="checkbox"> for settings). */
export default function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group inline-flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300"
    >
      <span
        className={cn(
          "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors",
          "group-focus-visible:ring-2 group-focus-visible:ring-stone-400 group-focus-visible:ring-offset-2 dark:group-focus-visible:ring-offset-stone-900",
          checked ? "bg-emerald-500" : "bg-stone-200 dark:bg-stone-700"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          )}
        />
      </span>
      {label}
    </button>
  );
}
