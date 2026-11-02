"use client";

import { Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

const RING: Record<Priority, string> = {
  URGENT: "border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40",
  HIGH: "border-rose-300 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/40",
  MEDIUM: "border-amber-300 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950/40",
  LOW: "border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800",
};

/** Round completion checkbox, tinted by priority (Todoist-style). */
export default function Checkbox({
  checked,
  onChange,
  priority = "LOW",
  size = 18,
  label = "Complete",
}: {
  checked: boolean;
  onChange: () => void;
  priority?: Priority;
  size?: number;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      style={{ width: size, height: size }}
      className={cn(
        // after: enlarges the touch target without changing the look.
        "group/cb relative inline-flex shrink-0 items-center justify-center rounded-full border-[1.5px] transition after:absolute after:-inset-2.5 after:content-['']",
        checked
          ? "animate-check-pop border-stone-800 bg-stone-800 text-white dark:border-stone-200 dark:bg-stone-200 dark:text-stone-900"
          : RING[priority]
      )}
    >
      <svg
        viewBox="0 0 24 24"
        width={size - 6}
        height={size - 6}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(!checked && "text-stone-400 opacity-0 group-hover/cb:opacity-100")}
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </button>
  );
}
