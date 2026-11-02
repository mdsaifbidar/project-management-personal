"use client";

import { useMemo } from "react";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import FilterBar from "@/components/FilterBar";
import ItemCard from "@/components/ItemCard";
import PageHeader from "@/components/PageHeader";
import { Count, SectionLabel } from "@/components/primitives";
import { EMPTY_STATES } from "@/lib/constants";
import { isoToKey, relativeDay } from "@/lib/dates";
import { usePref } from "@/lib/hooks";
import { ItemFilter, applyFilter } from "@/lib/selectors";
import { useStore } from "@/lib/store";

export default function DonePage() {
  const { items, ready } = useStore();
  const [filter, setFilter] = usePref<ItemFilter>("done-filter", {});

  const done = useMemo(
    () =>
      applyFilter(items, filter)
        .filter((i) => i.status === "DONE")
        .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt)),
    [items, filter]
  );

  const groups = useMemo(() => {
    const map = new Map<string, typeof done>();
    for (const item of done) {
      const key = isoToKey(item.completedAt ?? item.updatedAt) ?? "Earlier";
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [done]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Done"
        subtitle={ready && done.length > 0 ? `${done.length} finished. The reward is simply: done.` : "The reward is simply: done."}
        right={
          <Link href="/review" className="text-[12px] text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
            Stats & review →
          </Link>
        }
      />

      <FilterBar value={filter} onChange={setFilter} />

      {ready && done.length === 0 ? <EmptyState title={EMPTY_STATES.done} /> : null}

      {groups.map(([date, list]) => (
        <section key={date}>
          <SectionLabel>
            {date === "Earlier" ? date : relativeDay(date)} <Count n={list.length} />
          </SectionLabel>
          <div className="space-y-2">
            {list.map((item) => (
              <ItemCard key={item.id} item={item} draggable={false} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
