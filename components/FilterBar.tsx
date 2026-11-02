"use client";

import { useMemo } from "react";
import { COLORS, PRIORITIES } from "@/lib/constants";
import { ItemFilter, allTags } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PRIORITY_DOT } from "./Badge";
import { IconSearch, IconX } from "./icons";
import Select from "./pickers/Select";

export default function FilterBar({
  value,
  onChange,
  hide = [],
}: {
  value: ItemFilter;
  onChange: (f: ItemFilter) => void;
  hide?: (keyof ItemFilter)[];
}) {
  const { items, projects, settings } = useStore();
  const tags = useMemo(() => allTags(items), [items]);
  const set = (k: keyof ItemFilter, v: string) => onChange({ ...value, [k]: v || undefined });
  const active = Object.values(value).some(Boolean);
  const show = (k: keyof ItemFilter) => !hide.includes(k);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {show("q") ? (
        <div className="relative">
          <IconSearch width={14} height={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={value.q ?? ""}
            onChange={(e) => set("q", e.target.value)}
            placeholder="Filter…"
            aria-label="Filter by text"
            className={cn(
              "h-8 w-40 rounded-full border bg-white pl-8 pr-3 text-[12px] text-stone-700 outline-none transition placeholder:text-stone-400 focus:w-52 focus:border-stone-400 dark:bg-stone-900 dark:text-stone-200",
              value.q ? "border-stone-400 dark:border-stone-500" : "border-stone-200 dark:border-stone-800"
            )}
          />
        </div>
      ) : null}
      {show("projectId") ? (
        <Select
          variant="filter"
          label="Project"
          placeholder="Project"
          value={value.projectId ?? ""}
          onChange={(v) => set("projectId", v)}
          options={[
            { value: "", label: "All projects" },
            { value: "none", label: "Standalone" },
            ...projects.map((p) => ({ value: p.id, label: p.title, dot: COLORS[p.color ?? "stone"].dot })),
          ]}
        />
      ) : null}
      {show("areaId") && settings.areas.length ? (
        <Select
          variant="filter"
          label="Area"
          placeholder="Area"
          value={value.areaId ?? ""}
          onChange={(v) => set("areaId", v)}
          options={[{ value: "", label: "All areas" }, ...settings.areas.map((a) => ({ value: a.id, label: a.name, icon: a.icon }))]}
        />
      ) : null}
      {show("type") ? (
        <Select
          variant="filter"
          label="Type"
          placeholder="Type"
          value={value.type ?? ""}
          onChange={(v) => set("type", v)}
          options={[{ value: "", label: "All types" }, ...settings.types.map((t) => ({ value: t.id, label: t.label, icon: t.icon }))]}
        />
      ) : null}
      {show("priority") ? (
        <Select
          variant="filter"
          label="Priority"
          placeholder="Priority"
          value={value.priority ?? ""}
          onChange={(v) => set("priority", v)}
          options={[
            { value: "", label: "Any priority" },
            ...[...PRIORITIES].reverse().map((p) => ({ value: p, label: p.charAt(0) + p.slice(1).toLowerCase(), dot: PRIORITY_DOT[p] })),
          ]}
        />
      ) : null}
      {show("tag") && tags.length ? (
        <Select
          variant="filter"
          label="Tag"
          placeholder="Tag"
          value={value.tag ?? ""}
          onChange={(v) => set("tag", v)}
          options={[{ value: "", label: "Any tag" }, ...tags.map((t) => ({ value: t, label: `#${t}`, dot: COLORS[settings.tagColors[t] ?? "stone"].dot }))]}
        />
      ) : null}
      {active ? (
        <button
          onClick={() => onChange({})}
          className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[12px] font-medium text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          <IconX width={12} height={12} /> Clear
        </button>
      ) : null}
    </div>
  );
}
