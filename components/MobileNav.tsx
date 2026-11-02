"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { IconCalendar, IconMore, IconPlus, IconRocket, IconToday } from "./icons";
import { NAV_GROUPS, isActive } from "./nav-items";
import SyncBadge from "./SyncBadge";
import TimerWidget from "./TimerWidget";

const PRIMARY = [
  { href: "/today", label: "Today", Icon: IconToday },
  { href: "/planner", label: "Planner", Icon: IconCalendar },
  { href: "/projects", label: "Projects", Icon: IconRocket },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { openNew } = useUI();
  const [more, setMore] = useState(false);

  return (
    <>
      <div className="fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 md:hidden">
        <TimerWidget variant="floating" />
      </div>

      {more ? (
        <div className="fixed inset-0 z-40 bg-stone-900/30 backdrop-blur-sm md:hidden" onClick={() => setMore(false)}>
          <div
            className="animate-slide-up absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-stone-200 bg-white px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4 dark:border-stone-800 dark:bg-stone-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-200 dark:bg-stone-700" />
            <div className="mb-2 flex justify-center">
              <SyncBadge />
            </div>
            {NAV_GROUPS.map((g) => (
              <div key={g.label} className="mb-3">
                <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">{g.label}</p>
                <div className="grid grid-cols-4 gap-2">
                  {g.items.map(({ href, label, Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMore(false)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] font-medium",
                        isActive(pathname, href) ? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100" : "text-stone-500"
                      )}
                    >
                      <Icon width={20} height={20} />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-stone-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-stone-800 dark:bg-stone-950/95 md:hidden">
        {PRIMARY.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition",
              isActive(pathname, href) ? "text-stone-900 dark:text-stone-100" : "text-stone-400 dark:text-stone-500"
            )}
          >
            <Icon width={20} height={20} />
            {label}
          </Link>
        ))}
        <button
          onClick={() => openNew({ type: "TASK", status: "NEXT" })}
          aria-label="New item"
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-stone-400 dark:text-stone-500"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900">
            <IconPlus width={16} height={16} />
          </span>
          New
        </button>
        <button
          onClick={() => setMore((m) => !m)}
          className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium", more ? "text-stone-900 dark:text-stone-100" : "text-stone-400 dark:text-stone-500")}
        >
          <IconMore width={20} height={20} />
          More
        </button>
      </nav>
    </>
  );
}
