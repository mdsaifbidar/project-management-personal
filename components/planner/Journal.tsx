"use client";

import { useStore } from "@/lib/store";
import { PeriodNote } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card } from "../primitives";

const MOODS = ["😞", "😕", "😐", "🙂", "😄"];
const ENERGY = ["😴", "🥱", "🙂", "💪", "⚡"];

/** Notes + reflection for any period key (day, week, month, quarter, year). */
export default function Journal({
  periodKey,
  title = "Notes & reflection",
  prompts = { notes: "Plan, notes, thoughts…", wins: "What went well?", improve: "What would make it better?" },
  showRatings = true,
}: {
  periodKey: string;
  title?: string;
  prompts?: { notes: string; wins: string; improve: string };
  showRatings?: boolean;
}) {
  const { state, setNote } = useStore();
  const note: Partial<PeriodNote> = state.notes[periodKey] ?? {};
  const set = (patch: Partial<PeriodNote>) => setNote(periodKey, patch);

  return (
    <Card className="space-y-3 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">📝 {title}</p>
      <Area value={note.notes ?? ""} onChange={(v) => set({ notes: v })} placeholder={prompts.notes} rows={3} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Area value={note.wins ?? ""} onChange={(v) => set({ wins: v })} placeholder={`🏆 ${prompts.wins}`} />
        <Area value={note.improve ?? ""} onChange={(v) => set({ improve: v })} placeholder={`🔧 ${prompts.improve}`} />
      </div>
      {showRatings ? (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Rating label="Mood" icons={MOODS} value={note.mood} onChange={(v) => set({ mood: v })} />
          <Rating label="Energy" icons={ENERGY} value={note.energy} onChange={(v) => set({ energy: v })} />
        </div>
      ) : null}
    </Card>
  );
}

function Area({
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-y rounded-lg border border-stone-100 bg-stone-50/60 px-3 py-2 text-sm text-stone-700 outline-none transition placeholder:text-stone-400 focus:border-stone-300 focus:bg-white dark:border-stone-800 dark:bg-stone-800/40 dark:text-stone-200 dark:focus:border-stone-600 dark:focus:bg-stone-900"
    />
  );
}

function Rating({
  label,
  icons,
  value,
  onChange,
}: {
  label: string;
  icons: string[];
  value?: number;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] uppercase tracking-wide text-stone-400">{label}</span>
      <div className="flex gap-0.5">
        {icons.map((ic, i) => (
          <button
            key={i}
            onClick={() => onChange(value === i + 1 ? undefined : i + 1)}
            className={cn(
              "h-7 w-7 rounded-md text-sm transition",
              value === i + 1 ? "scale-110 bg-stone-200 dark:bg-stone-700" : "opacity-50 grayscale hover:opacity-100 hover:grayscale-0"
            )}
          >
            {ic}
          </button>
        ))}
      </div>
    </div>
  );
}
