"use client";

import Link from "next/link";
import { COLORS, STATUS_LABEL } from "@/lib/constants";
import { diffDays, relativeDay, todayKey } from "@/lib/dates";
import { projectEstimate, projectTrackedMinutes } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { Item } from "@/lib/types";
import { cn, projectProgress, shortMinutes } from "@/lib/utils";
import { PriorityBadge } from "./Badge";
import { Ring } from "./primitives";

export default function ProjectCard({ project }: { project: Item }) {
  const { items, settings } = useStore();
  const { total, done, percent } = projectProgress(project, items);
  const tracked = projectTrackedMinutes(project, items);
  const { remaining } = projectEstimate(project, items);
  const area = settings.areas.find((a) => a.id === project.areaId);
  const color = COLORS[project.color ?? "stone"];
  const today = todayKey();
  const daysLeft = project.dueDate ? diffDays(project.dueDate, today) : null;
  const next = items
    .filter((i) => i.projectId === project.id && (i.status === "NOW" || i.status === "NEXT"))
    .sort((a, b) => Number(b.status === "NOW") - Number(a.status === "NOW") || (a.scheduledDate ?? "9").localeCompare(b.scheduledDate ?? "9"))[0];

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group animate-fade-in relative block overflow-hidden rounded-2xl border border-stone-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lift dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
    >
      <span className={cn("absolute inset-x-0 top-0 h-1", color.bar)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-stone-900 group-hover:underline dark:text-stone-100">
            {project.title}
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] uppercase tracking-wide text-stone-400">
            <span className={cn(project.status === "NOW" && "font-semibold text-emerald-600 dark:text-emerald-400")}>
              {STATUS_LABEL[project.status]}
            </span>
            {area ? <span className="normal-case">{area.icon} {area.name}</span> : null}
          </p>
        </div>
        <Ring percent={percent} size={46} />
      </div>

      {project.goal ? (
        <p className="mt-3 line-clamp-2 text-sm text-stone-600 dark:text-stone-300">{project.goal}</p>
      ) : null}

      {next ? (
        <p className="mt-3 truncate rounded-lg bg-stone-50 px-2.5 py-1.5 text-[12px] text-stone-600 dark:bg-stone-800/60 dark:text-stone-300">
          <span className="text-stone-400">Next →</span> {next.title}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-stone-400">
        <PriorityBadge priority={project.priority} />
        <span>
          {done}/{total} tasks
        </span>
        {remaining ? <span>{shortMinutes(remaining)} left</span> : null}
        {tracked ? <span>{shortMinutes(tracked)} tracked</span> : null}
        {daysLeft !== null && project.status !== "DONE" ? (
          <span className={cn(daysLeft < 0 ? "font-medium text-rose-500" : daysLeft <= 7 ? "text-amber-600 dark:text-amber-400" : "")}>
            {daysLeft < 0 ? `${-daysLeft}d overdue` : `due ${relativeDay(project.dueDate!, today)}`}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
