"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import Stepper from "@/components/pickers/Stepper";
import PeriodNav from "@/components/planner/PeriodNav";
import { Button, Card, Field, Modal, ProgressBar, Ring, SectionLabel, Segmented, inputClass } from "@/components/primitives";
import { IconPlus } from "@/components/icons";
import { EMPTY_STATES } from "@/lib/constants";
import { periodKeyFor, periodLabel, todayKey } from "@/lib/dates";
import { usePref } from "@/lib/hooks";
import { goalProgress } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { Goal, GoalPeriod } from "@/lib/types";
import { cn } from "@/lib/utils";

const PERIODS: { value: GoalPeriod; label: string }[] = [
  { value: "YEAR", label: "Year" },
  { value: "QUARTER", label: "Quarter" },
  { value: "MONTH", label: "Month" },
  { value: "WEEK", label: "Week" },
];
const PARENTS: Record<GoalPeriod, GoalPeriod[]> = {
  YEAR: [],
  QUARTER: ["YEAR"],
  MONTH: ["QUARTER", "YEAR"],
  WEEK: ["MONTH", "QUARTER"],
};

export default function GoalsPage() {
  const { goals, items, settings, ready } = useStore();
  const [period, setPeriod] = usePref<GoalPeriod>("goals-period", "MONTH");
  const [anchor, setAnchor] = useState(todayKey);
  const [editing, setEditing] = useState<Partial<Goal> | null>(null);

  const key = periodKeyFor(period, anchor);
  const list = goals.filter((g) => g.period === period && g.periodKey === key);
  const parents = PARENTS[period].flatMap((p) =>
    goals.filter((g) => g.period === p && g.periodKey === periodKeyFor(p, anchor)).map((g) => ({ ...g, _label: periodLabel(p, anchor, settings.weekStartsOn) }))
  );
  const avg = list.length ? Math.round(list.reduce((s, g) => s + goalProgress(g, items), 0) / list.length) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goals"
        subtitle="Year → quarter → month → week. Link projects so progress rolls up."
        right={
          <Button variant="primary" size="sm" onClick={() => setEditing({ period, periodKey: key, linkedIds: [] })}>
            <IconPlus width={14} height={14} /> New goal
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodNav period={period} anchor={anchor} onChange={setAnchor} />
        <Segmented value={period} onChange={setPeriod} options={PERIODS} />
      </div>

      {parents.length ? (
        <Card className="p-4">
          <SectionLabel>Serving the bigger picture</SectionLabel>
          <div className="space-y-2">
            {parents.map((g) => (
              <div key={g.id} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 truncate text-[11px] uppercase tracking-wide text-stone-400">{g._label}</span>
                <span className="flex-1 truncate text-stone-700 dark:text-stone-200">{g.title}</span>
                <ProgressBar percent={goalProgress(g, items)} className="w-24" />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {ready && list.length === 0 ? (
        <EmptyState title={EMPTY_STATES.goals} hint="Pick 1–3 outcomes. Fewer goals, more finished." />
      ) : null}

      {list.length ? (
        <div className="flex items-center gap-3 text-sm text-stone-500">
          <Ring percent={avg} size={40} />
          <span>
            {list.filter((g) => goalProgress(g, items) >= 100).length} of {list.length} goals complete
          </span>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {list.map((g) => (
          <GoalCard key={g.id} goal={g} onEdit={() => setEditing(g)} />
        ))}
      </div>

      <GoalModal goal={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function GoalCard({ goal, onEdit }: { goal: Goal; onEdit: () => void }) {
  const { items, saveGoal, getById } = useStore();
  const pct = goalProgress(goal, items);
  const linked = goal.linkedIds.map((id) => getById(id)).filter((i) => !!i);
  const bump = (d: number) => saveGoal({ ...goal, current: Math.max(0, (goal.current ?? 0) + d) });
  const step = goal.target ? Math.max(1, Math.round(goal.target / 20)) : 1;

  return (
    <Card className={cn("p-5 transition", pct >= 100 && "border-emerald-200 dark:border-emerald-900")}>
      <div className="flex items-start gap-3">
        <Ring percent={pct} size={52} stroke={5} />
        <div className="min-w-0 flex-1">
          <button onClick={onEdit} className="text-left text-[15px] font-semibold text-stone-900 hover:underline dark:text-stone-100">
            {goal.title}
          </button>
          {goal.description ? <p className="mt-0.5 text-[13px] text-stone-500 dark:text-stone-400">{goal.description}</p> : null}
        </div>
        <button
          onClick={() => saveGoal({ ...goal, done: !goal.done })}
          className={cn(
            "shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium",
            goal.done ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
          )}
        >
          {goal.done ? "✓ Achieved" : "Mark achieved"}
        </button>
      </div>

      {goal.target ? (
        <div className="mt-4 flex items-center gap-2">
          <button onClick={() => bump(-step)} className="h-7 w-7 rounded-md border border-stone-200 text-stone-500 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800">
            −
          </button>
          <div className="flex-1">
            <ProgressBar percent={pct} barClass="bg-emerald-500" />
            <p className="mt-1 text-center text-[12px] tabular-nums text-stone-500">
              {(goal.current ?? 0).toLocaleString()} / {goal.target.toLocaleString()} {goal.unit ?? ""}
            </p>
          </div>
          <button onClick={() => bump(step)} className="h-7 w-7 rounded-md border border-stone-200 text-stone-500 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800">
            +
          </button>
        </div>
      ) : null}

      {linked.length ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {linked.map((i) => (
            <Link
              key={i!.id}
              href={i!.type === "PROJECT" ? `/projects/${i!.id}` : "/inbox"}
              className="rounded-md bg-stone-100 px-2 py-0.5 text-[12px] text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300"
            >
              {i!.type === "PROJECT" ? "🚀" : "✓"} {i!.title}
            </Link>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function GoalModal({ goal, onClose }: { goal: Partial<Goal> | null; onClose: () => void }) {
  const { items, saveGoal, removeGoal } = useStore();
  const { toast } = useUI();
  const [f, setF] = useState<Partial<Goal>>({});
  useEffect(() => setF(goal ?? {}), [goal]);
  const linkable = useMemo(
    () => items.filter((i) => i.status !== "DONE" && (i.type === "PROJECT" || i.type === "MILESTONE")),
    [items]
  );
  if (!goal) return null;

  const save = () => {
    if (!f.title?.trim()) return toast("Give the goal a title.");
    saveGoal({ ...f, title: f.title.trim() } as Goal);
    toast("Goal saved.");
    onClose();
  };
  const toggleLink = (id: string) => {
    const cur = f.linkedIds ?? [];
    setF({ ...f, linkedIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={goal.id ? "Edit goal" : "New goal"}
      footer={
        <>
          {goal.id ? (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => {
                removeGoal(goal.id!);
                onClose();
              }}
            >
              Delete
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Goal">
          <input autoFocus value={f.title ?? ""} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ship v1 of CodeToolsStudio" className={inputClass} />
        </Field>
        <Field label="Why it matters" optional>
          <textarea rows={2} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Current" optional>
            <Stepper label="Current" value={f.current} onChange={(v) => setF({ ...f, current: v })} min={0} allowEmpty />
          </Field>
          <Field label="Target" optional>
            <Stepper label="Target" value={f.target} onChange={(v) => setF({ ...f, target: v || undefined })} min={0} allowEmpty />
          </Field>
          <Field label="Unit" optional className="col-span-2 sm:col-span-1">
            <input value={f.unit ?? ""} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="visitors" className={inputClass} />
          </Field>
        </div>
        <p className="text-[12px] text-stone-400">
          With a target, progress = current / target. Without one, it&apos;s the average progress of linked projects.
        </p>
        {linkable.length ? (
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-stone-400">Linked projects & milestones</p>
            <div className="flex flex-wrap gap-1.5">
              {linkable.map((i) => {
                const on = (f.linkedIds ?? []).includes(i.id);
                return (
                  <button
                    key={i.id}
                    onClick={() => toggleLink(i.id)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[12px] transition",
                      on
                        ? "border-stone-800 bg-stone-800 text-white dark:border-stone-200 dark:bg-stone-200 dark:text-stone-900"
                        : "border-stone-200 text-stone-500 hover:border-stone-300 dark:border-stone-700"
                    )}
                  >
                    {i.type === "PROJECT" ? "🚀" : "🏁"} {i.title}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
