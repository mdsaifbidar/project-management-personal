"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Board from "@/components/Board";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import ItemCard from "@/components/ItemCard";
import QuickCapture from "@/components/QuickCapture";
import { PriorityBadge } from "@/components/Badge";
import { Button, Card, Count, ProgressBar, Ring, SectionLabel, Segmented } from "@/components/primitives";
import { COLORS, STATUS_LABEL } from "@/lib/constants";
import { diffDays, isoToKey, relativePhrase, todayKey } from "@/lib/dates";
import { usePref } from "@/lib/hooks";
import { goalProgress, projectEstimate, projectTrackedMinutes } from "@/lib/selectors";
import { useUI } from "@/lib/ui";
import { useActions } from "@/lib/useActions";
import { Item } from "@/lib/types";
import { cn, formatDate, projectProgress, shortMinutes } from "@/lib/utils";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const a = useActions();
  const { openEdit, toast } = useUI();
  const [view, setView] = usePref<"list" | "board">("project-view", "list");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const project = a.getById(id);
  const tasks = useMemo(() => a.items.filter((i) => i.projectId === id), [a.items, id]);
  const today = todayKey();

  const groups = useMemo(() => {
    const open = tasks.filter((t) => t.status !== "DONE" && t.status !== "JAIL");
    const byDate = (x: Item, y: Item) => (x.scheduledDate ?? x.dueDate ?? "9").localeCompare(y.scheduledDate ?? y.dueDate ?? "9");
    return [
      { key: "overdue", label: "Overdue", items: open.filter((t) => (t.scheduledDate ?? t.dueDate ?? "9") < today).sort(byDate) },
      { key: "planned", label: "Planned", items: open.filter((t) => (t.scheduledDate ?? t.dueDate) && (t.scheduledDate ?? t.dueDate)! >= today).sort(byDate) },
      { key: "unplanned", label: "Not scheduled", items: open.filter((t) => !t.scheduledDate && !t.dueDate) },
      { key: "jail", label: "Parked ideas", items: tasks.filter((t) => t.status === "JAIL") },
      {
        key: "done",
        label: "Done",
        items: tasks.filter((t) => t.status === "DONE").sort((x, y) => (y.completedAt ?? "").localeCompare(x.completedAt ?? "")),
      },
    ].filter((g) => g.items.length);
  }, [tasks, today]);

  if (a.ready && !project) {
    return (
      <div className="space-y-4">
        <EmptyState title="This project no longer exists." />
        <Link href="/projects" className="text-sm text-stone-500 underline">
          Back to Projects
        </Link>
      </div>
    );
  }
  if (!project) return <div className="h-40" />;

  const { total, done, percent } = projectProgress(project, a.items);
  const tracked = projectTrackedMinutes(project, a.items);
  const { total: est, remaining } = projectEstimate(project, a.items);
  const isActive = project.status === "NOW";
  const area = a.settings.areas.find((x) => x.id === project.areaId);
  const color = COLORS[project.color ?? "stone"];
  const daysLeft = project.dueDate ? diffDays(project.dueDate, today) : null;
  const linkedGoals = a.goals.filter((g) => g.linkedIds.includes(project.id));
  const doneThisMonth = tasks.filter((t) => t.status === "DONE" && (isoToKey(t.completedAt) ?? "") >= today.slice(0, 8) + "01").length;

  return (
    <div className="space-y-8">
      <Link href="/projects" className="text-[13px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
        ← Projects
      </Link>

      <header className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <span className={cn("absolute inset-x-0 top-0 h-1.5", color.bar)} />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 sm:text-2xl">{project.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-stone-400">
              <span className={cn("rounded-md px-2 py-0.5 font-medium uppercase tracking-wide", isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-stone-100 dark:bg-stone-800")}>
                {STATUS_LABEL[project.status]}
              </span>
              <PriorityBadge priority={project.priority} />
              {area ? <span>{area.icon} {area.name}</span> : null}
              {project.startDate ? <span>Started {formatDate(project.startDate)}</span> : null}
              {project.dueDate ? (
                <span className={cn(daysLeft! < 0 && "font-medium text-rose-500")}>
                  Deadline {formatDate(project.dueDate)} ({daysLeft! < 0 ? `${-daysLeft!}d overdue` : `${daysLeft}d left`})
                </span>
              ) : null}
            </div>
            {project.description ? <p className="mt-3 max-w-2xl text-sm text-stone-600 dark:text-stone-300">{project.description}</p> : null}
          </div>
          <div className="shrink-0">
            <Ring percent={percent} size={64} stroke={6} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {!isActive ? (
            <Button variant="primary" onClick={() => a.start(project)}>
              Activate
            </Button>
          ) : (
            <Button onClick={() => a.move(project, "LATER")}>Pause</Button>
          )}
          <Button onClick={() => openEdit(project)}>Edit</Button>
          <Button
            onClick={() => {
              const copy = a.duplicate(project.id);
              if (copy) {
                toast("Project duplicated with its tasks.");
                router.push(`/projects/${copy.id}`);
              }
            }}
          >
            Duplicate
          </Button>
          <Button
            onClick={() => {
              const tpl = a.saveProjectAsTemplate(project.id);
              if (tpl) toast(`Saved “${tpl.name}” as a template.`);
            }}
          >
            Save as template
          </Button>
          {project.status !== "DONE" ? (
            <Button variant="ghost" onClick={() => a.finish(project)}>
              ✓ Mark complete
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => a.reopen(project)}>
              Reopen
            </Button>
          )}
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Mini label="Tasks" value={`${done}/${total}`} sub={`${doneThisMonth} this month`} />
        <Mini label="Remaining" value={shortMinutes(remaining)} sub={est ? `of ${shortMinutes(est)} estimated` : "add estimates"} />
        <Mini label="Tracked" value={shortMinutes(tracked)} sub={est ? `${Math.round((tracked / est) * 100)}% of estimate` : "time logged"} />
        <Mini
          label="Pace"
          value={daysLeft === null ? "—" : remaining && daysLeft > 0 ? `${shortMinutes(Math.ceil(remaining / daysLeft))}/day` : daysLeft < 0 ? "Late" : "On track"}
          sub={daysLeft === null ? "set a deadline" : "needed to finish on time"}
        />
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Why am I doing this?</h2>
          <button onClick={() => openEdit(project)} className="text-[12px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
            Edit
          </button>
        </div>
        {project.goal || project.successMetric ? (
          <dl className="mt-3 space-y-2 text-sm">
            {project.goal ? <Row label="Goal" value={project.goal} /> : null}
            {project.successMetric ? <Row label="Success metric" value={project.successMetric} /> : null}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-stone-400">No goal set yet. A project without a reason is just a to-do list.</p>
        )}
        {linkedGoals.length ? (
          <div className="mt-4 space-y-2">
            {linkedGoals.map((g) => (
              <Link key={g.id} href="/goals" className="block">
                <div className="flex items-center justify-between text-[12px] text-stone-500">
                  <span>🎯 {g.title}</span>
                  <span>{goalProgress(g, a.items)}%</span>
                </div>
                <ProgressBar percent={goalProgress(g, a.items)} className="mt-1" />
              </Link>
            ))}
          </div>
        ) : null}
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Does today&apos;s work move this goal?
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionLabel className="mb-0">
            Tasks <Count n={total} />
          </SectionLabel>
          <Segmented
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: "list", label: "List" },
              { value: "board", label: "Board" },
            ]}
          />
        </div>
        <ProgressBar percent={percent} barClass={color.bar} />
        <QuickCapture
          compact
          defaults={{ projectId: project.id, type: "TASK", status: "NEXT", areaId: project.areaId }}
          placeholder="Add a task to this project…"
        />

        {total === 0 ? (
          <EmptyState title="No tasks yet." hint="Break the project into small, finishable steps — or start from a template next time." />
        ) : view === "board" ? (
          <Board items={tasks} showProject={false} defaults={{ projectId: project.id, areaId: project.areaId }} />
        ) : (
          groups.map((g) => (
            <div key={g.key}>
              <SectionLabel>
                <span className={g.key === "overdue" ? "text-rose-500" : undefined}>{g.label}</span> <Count n={g.items.length} />
              </SectionLabel>
              <div className="space-y-2">
                {g.items.map((t) => (
                  <ItemCard key={t.id} item={t} showProject={false} compact />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {project.dueDate && daysLeft !== null && daysLeft >= 0 ? (
        <p className="text-center text-[12px] text-stone-400">
          Deadline {relativePhrase(project.dueDate, today)} · {remaining ? `${shortMinutes(remaining)} of planned work left` : "no estimated work left"}
        </p>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this project?"
        body="Its tasks will stay but lose their project link."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          a.del(project);
          router.push("/projects");
        }}
      />
    </div>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-stone-900 dark:text-stone-100">{value}</p>
      {sub ? <p className="text-[11px] text-stone-400">{sub}</p> : null}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-[12px] uppercase tracking-wide text-stone-400">{label}</dt>
      <dd className="text-stone-700 dark:text-stone-200">{value}</dd>
    </div>
  );
}
