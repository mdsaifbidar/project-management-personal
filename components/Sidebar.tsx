"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COLORS } from "@/lib/constants";
import { useToday } from "@/lib/hooks";
import { overdueItems } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { IconMoon, IconPlus, IconSearch, IconSun } from "./icons";
import { NAV_GROUPS, isActive } from "./nav-items";
import { Kbd } from "./primitives";
import SyncBadge from "./SyncBadge";
import TimerWidget from "./TimerWidget";

export default function Sidebar() {
  const pathname = usePathname();
  const { openNew, openSearch } = useUI();
  const { theme, toggle } = useTheme();
  const { items, projects } = useStore();
  const today = useToday();

  const badges: Record<string, number> = {
    "/jail": items.filter((i) => i.status === "JAIL").length,
    "/today": items.filter((i) => i.scheduledDate === today && i.status !== "DONE" && i.status !== "JAIL").length,
    "/inbox": items.filter((i) => i.status === "NOW").length,
  };
  const overdue = overdueItems(items, today).length;
  const pinned = projects.filter((p) => p.status === "NOW" || p.status === "NEXT").slice(0, 6);

  return (
    <aside className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-y-auto border-r border-stone-200 bg-white/70 px-3 py-5 backdrop-blur dark:border-stone-800 dark:bg-stone-950/50 md:flex md:w-56 lg:w-60">
      <Link href="/" className="flex items-center gap-2 px-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-900 text-[13px] text-white dark:bg-stone-100 dark:text-stone-900">
          ◆
        </span>
        <div>
          <div className="text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">Decision Inbox</div>
          <div className="text-[11px] text-stone-400 dark:text-stone-500">Work on less.</div>
        </div>
      </Link>

      <button
        onClick={() => openNew({ type: "TASK", status: "NEXT" })}
        className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white shadow-soft transition hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
      >
        <IconPlus width={16} height={16} />
        New item
        <kbd className="ml-1 rounded bg-white/20 px-1 text-[10px] dark:bg-stone-900/20">N</kbd>
      </button>

      <button
        onClick={openSearch}
        className="mt-2 flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-400 transition hover:border-stone-300 hover:text-stone-600 dark:border-stone-800 dark:hover:border-stone-700 dark:hover:text-stone-300"
      >
        <IconSearch width={16} height={16} className="shrink-0" />
        <span className="truncate">Search</span>
        <span className="ml-auto shrink-0">
          <Kbd>/</Kbd>
        </span>
      </button>

      <div className="mt-3">
        <TimerWidget />
      </div>

      <nav className="mt-4 flex flex-col gap-4">
        {NAV_GROUPS.map((g) => (
          <div key={g.label}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-600">{g.label}</p>
            <div className="flex flex-col gap-0.5">
              {g.items.map(({ href, label, Icon }) => {
                const active = isActive(pathname, href);
                const badge = badges[href];
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                      active
                        ? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100"
                        : "text-stone-500 hover:bg-stone-50 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-stone-200"
                    )}
                  >
                    <Icon width={17} height={17} />
                    {label}
                    {href === "/today" && overdue > 0 ? (
                      <span className="ml-auto rounded-full bg-rose-100 px-1.5 text-[11px] font-semibold text-rose-600 dark:bg-rose-950/60 dark:text-rose-300" title="Overdue">
                        {overdue}
                      </span>
                    ) : badge ? (
                      <span className="ml-auto rounded-full bg-stone-200 px-1.5 text-[11px] font-normal text-stone-500 dark:bg-stone-700 dark:text-stone-300">
                        {badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {pinned.length ? (
          <div>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-600">Projects</p>
            <div className="flex flex-col gap-0.5">
              {pinned.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className={cn(
                    "flex items-center gap-2.5 truncate rounded-lg px-3 py-1 text-[13px] transition",
                    pathname === `/projects/${p.id}`
                      ? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100"
                      : "text-stone-500 hover:bg-stone-50 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-900"
                  )}
                >
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", COLORS[p.color ?? "stone"].dot)} />
                  <span className="truncate">{p.title}</span>
                  {p.status === "NOW" ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" /> : null}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </nav>

      <SyncBadge className="mt-auto self-start" />
      <button
        onClick={toggle}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-400 transition hover:bg-stone-50 hover:text-stone-700 dark:hover:bg-stone-900 dark:hover:text-stone-200"
      >
        {theme === "dark" ? <IconSun width={16} height={16} /> : <IconMoon width={16} height={16} />}
        {theme === "dark" ? "Light mode" : "Dark mode"}
      </button>
    </aside>
  );
}
