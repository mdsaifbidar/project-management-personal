"use client";

import { useMemo } from "react";
import EmptyState from "@/components/EmptyState";
import FilterBar from "@/components/FilterBar";
import ItemCard from "@/components/ItemCard";
import PageHeader from "@/components/PageHeader";
import QuickCapture from "@/components/QuickCapture";
import WipIndicator from "@/components/WipIndicator";
import { Count, SectionLabel, Segmented } from "@/components/primitives";
import { COLORS, EMPTY_STATES, PRIORITY_WEIGHT, STATUS_LABEL } from "@/lib/constants";
import { usePref } from "@/lib/hooks";
import { ItemFilter, applyFilter } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

type GroupBy = "status" | "project" | "priority" | "area";

export default function InboxPage() {
  const { items, ready, projects, settings } = useStore();
  const [filter, setFilter] = usePref<ItemFilter>("inbox-filter", {});
  const [groupBy, setGroupBy] = usePref<GroupBy>("inbox-group", "status");

  const active = useMemo(
    () =>
      applyFilter(items, filter)
        .filter((i) => i.status !== "DONE" && i.status !== "JAIL" && i.type !== "PROJECT")
        .sort(
          (a, b) =>
            PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] ||
            (a.scheduledDate ?? a.dueDate ?? "9").localeCompare(b.scheduledDate ?? b.dueDate ?? "9") ||
            (a.estimatedMinutes ?? 1e9) - (b.estimatedMinutes ?? 1e9)
        ),
    [items, filter]
  );

  const groups = useMemo(() => {
    const out: { key: string; label: React.ReactNode; items: Item[] }[] = [];
    if (groupBy === "status") {
      for (const s of ["NOW", "NEXT", "LATER"] as const) out.push({ key: s, label: STATUS_LABEL[s], items: active.filter((i) => i.status === s) });
    } else if (groupBy === "priority") {
      for (const p of ["URGENT", "HIGH", "MEDIUM", "LOW"] as const)
        out.push({ key: p, label: p.charAt(0) + p.slice(1).toLowerCase(), items: active.filter((i) => i.priority === p) });
    } else if (groupBy === "project") {
      for (const p of projects)
        out.push({
          key: p.id,
          label: (
            <>
              <span className={cn("h-2 w-2 rounded-full", COLORS[p.color ?? "stone"].dot)} />
              {p.title}
            </>
          ),
          items: active.filter((i) => i.projectId === p.id),
        });
      out.push({ key: "none", label: "Standalone", items: active.filter((i) => !i.projectId) });
    } else {
      for (const a of settings.areas) out.push({ key: a.id, label: `${a.icon} ${a.name}`, items: active.filter((i) => i.areaId === a.id) });
      out.push({ key: "none", label: "No area", items: active.filter((i) => !settings.areas.some((a) => a.id === i.areaId)) });
    }
    return out.filter((g) => g.items.length);
  }, [active, groupBy, projects, settings.areas]);

  return (
    <div className="space-y-6">
      <PageHeader title="Inbox" subtitle="Everything you've decided to act on — eventually." right={<WipIndicator compact />} />

      <QuickCapture />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterBar value={filter} onChange={setFilter} hide={["type"]} />
        <Segmented
          size="sm"
          value={groupBy}
          onChange={setGroupBy}
          options={[
            { value: "status", label: "Status" },
            { value: "project", label: "Project" },
            { value: "priority", label: "Priority" },
            { value: "area", label: "Area" },
          ]}
        />
      </div>

      {ready && active.length === 0 ? (
        <EmptyState title={EMPTY_STATES.inbox} hint="Promote an idea from Idea Jail, or capture something above." />
      ) : null}

      {groups.map((g) => (
        <section key={g.key}>
          <SectionLabel>
            {g.label} <Count n={g.items.length} />
          </SectionLabel>
          <div className="space-y-2">
            {g.items.map((item) => (
              <ItemCard key={item.id} item={item} showProject={groupBy !== "project"} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
