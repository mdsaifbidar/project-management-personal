"use client";

import { useMemo } from "react";
import Board from "@/components/Board";
import FilterBar from "@/components/FilterBar";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/primitives";
import WipIndicator from "@/components/WipIndicator";
import { usePref } from "@/lib/hooks";
import { ItemFilter, applyFilter } from "@/lib/selectors";
import { useStore } from "@/lib/store";

export default function BoardPage() {
  const { items } = useStore();
  const [filter, setFilter] = usePref<ItemFilter>("board-filter", {});
  const [withJail, setWithJail] = usePref("board-jail", false);
  const [withProjects, setWithProjects] = usePref("board-projects", false);

  const visible = useMemo(
    () => applyFilter(items, filter).filter((i) => withProjects || i.type !== "PROJECT"),
    [items, filter, withProjects]
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Board"
        subtitle="Drag cards across columns to change their status."
        right={<WipIndicator compact />}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterBar value={filter} onChange={setFilter} />
        <div className="flex gap-2">
          <Button size="sm" variant={withProjects ? "primary" : "outline"} onClick={() => setWithProjects(!withProjects)}>
            Projects
          </Button>
          <Button size="sm" variant={withJail ? "primary" : "outline"} onClick={() => setWithJail(!withJail)}>
            Idea Jail
          </Button>
        </div>
      </div>
      <Board
        items={visible}
        columns={withJail ? ["JAIL", "LATER", "NEXT", "NOW", "DONE"] : ["LATER", "NEXT", "NOW", "DONE"]}
      />
    </div>
  );
}
