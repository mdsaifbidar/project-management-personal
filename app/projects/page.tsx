"use client";

import { useMemo } from "react";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import ProjectCard from "@/components/ProjectCard";
import ProjectTimeline from "@/components/ProjectTimeline";
import WipIndicator from "@/components/WipIndicator";
import { Button, Count, SectionLabel, Segmented } from "@/components/primitives";
import { IconPlus } from "@/components/icons";
import { EMPTY_STATES, PRIORITY_WEIGHT } from "@/lib/constants";
import { usePref } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { Item } from "@/lib/types";

const ORDER: Record<string, number> = { NOW: 0, NEXT: 1, LATER: 2, JAIL: 3, DONE: 4 };

export default function ProjectsPage() {
  const { projects, ready, settings } = useStore();
  const { openNew, setTemplateOpen } = useUI();
  const [view, setView] = usePref<"grid" | "timeline">("projects-view", "grid");
  const [groupBy, setGroupBy] = usePref<"status" | "area">("projects-group", "status");
  const [showDone, setShowDone] = usePref("projects-done", false);

  const sorted = useMemo(
    () =>
      projects
        .filter((p) => showDone || p.status !== "DONE")
        .sort(
          (a, b) =>
            (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) ||
            PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] ||
            (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9")
        ),
    [projects, showDone]
  );

  const groups = useMemo(() => {
    const out: { key: string; label: string; items: Item[] }[] = [];
    if (groupBy === "area") {
      for (const a of settings.areas) {
        out.push({ key: a.id, label: `${a.icon} ${a.name}`, items: sorted.filter((p) => p.areaId === a.id) });
      }
      out.push({ key: "none", label: "No area", items: sorted.filter((p) => !settings.areas.some((a) => a.id === p.areaId)) });
    } else {
      const labels: Record<string, string> = { NOW: "Active", NEXT: "Up next", LATER: "Later", JAIL: "Idea Jail", DONE: "Done" };
      for (const s of Object.keys(ORDER)) out.push({ key: s, label: labels[s], items: sorted.filter((p) => p.status === s) });
    }
    return out.filter((g) => g.items.length);
  }, [sorted, groupBy, settings.areas]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        subtitle="A project is a bundle of tasks with a reason behind it."
        right={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => openNew({ type: "PROJECT", status: "NEXT" })}>
              Blank
            </Button>
            <Button size="sm" variant="primary" onClick={() => setTemplateOpen(true)}>
              <IconPlus width={14} height={14} /> New project
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <WipIndicator />
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: "grid", label: "Cards" },
              { value: "timeline", label: "Roadmap" },
            ]}
          />
          {view === "grid" ? (
            <Segmented
              size="sm"
              value={groupBy}
              onChange={setGroupBy}
              options={[
                { value: "status", label: "By status" },
                { value: "area", label: "By area" },
              ]}
            />
          ) : null}
          <Button size="sm" variant={showDone ? "primary" : "ghost"} onClick={() => setShowDone(!showDone)}>
            Show done
          </Button>
        </div>
      </div>

      {ready && sorted.length === 0 ? <EmptyState title={EMPTY_STATES.projects} hint="Start from a template to get a ready-made plan." /> : null}

      {view === "timeline" ? (
        sorted.length ? <ProjectTimeline projects={sorted} /> : null
      ) : (
        groups.map((g) => (
          <section key={g.key}>
            <SectionLabel>
              {g.label} <Count n={g.items.length} />
            </SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {g.items.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
