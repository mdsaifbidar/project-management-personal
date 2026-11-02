"use client";

import Link from "next/link";
import { dateLabel } from "@/lib/dates";
import { noteHasContent, noteSummary } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { MOODS } from "./Journal";

/**
 * Shows that a day has journal notes and links to them (Today page, that date).
 * - "icon": compact 📝 (or the day's mood) for month cells
 * - "line": 📝 + first line of the note for week/day headers
 */
export default function NoteMarker({
  dateKey,
  variant = "icon",
  className,
}: {
  dateKey: string;
  variant?: "icon" | "line";
  className?: string;
}) {
  const { state } = useStore();
  const note = state.notes[dateKey];
  if (!noteHasContent(note)) return null;
  const summary = noteSummary(note);
  const mood = note.mood ? MOODS[note.mood - 1] : null;
  const label = `Notes for ${dateLabel(dateKey)}${summary ? `: ${summary}` : ""}`;

  return (
    <Link
      href={`/today?date=${dateKey}`}
      title={summary || "Open notes"}
      aria-label={label}
      data-note-marker={dateKey}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className={cn(
        "transition",
        variant === "icon"
          ? "inline-flex h-5 min-w-5 items-center justify-center rounded-md px-0.5 text-[12px] leading-none hover:bg-amber-100 dark:hover:bg-amber-950/50"
          : "flex min-w-0 items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/70",
        className
      )}
    >
      <span aria-hidden className="shrink-0">
        {mood ?? "📝"}
      </span>
      {variant === "line" ? <span className="truncate">{summary || "Notes"}</span> : null}
    </Link>
  );
}
