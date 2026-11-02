"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABEL } from "@/lib/constants";
import { relativeDay } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { Kbd } from "./primitives";

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

/** Command palette: search items & projects, jump anywhere, run actions. */
export default function SearchOverlay() {
  const { searchOpen, closeSearch, openEdit, openNew, setTemplateOpen, setHelpOpen } = useUI();
  const { items, typeMap, undo, canUndo } = useStore();
  const { toggle } = useTheme();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setQ("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [searchOpen]);

  const commands = useMemo<Command[]>(() => {
    const term = q.trim().toLowerCase();
    const go = (href: string) => () => router.push(href);
    const actions: Command[] = [
      { id: "new", group: "Actions", label: "New task", hint: "N", icon: "＋", run: () => openNew({ type: "TASK", status: "NEXT" }) },
      { id: "new-project", group: "Actions", label: "New project from template", icon: "🚀", run: () => setTemplateOpen(true) },
      { id: "new-idea", group: "Actions", label: "Capture idea to Idea Jail", icon: "💡", run: () => openNew({ type: "IDEA", status: "JAIL" }) },
      { id: "theme", group: "Actions", label: "Toggle dark mode", icon: "◐", run: toggle },
      ...(canUndo ? [{ id: "undo", group: "Actions", label: "Undo last change", hint: "Ctrl Z", icon: "↶", run: () => void undo() }] : []),
      { id: "help", group: "Actions", label: "Keyboard shortcuts", hint: "?", icon: "⌨", run: () => setHelpOpen(true) },
    ];
    const nav: Command[] = NAV_ITEMS.map((n) => ({
      id: `nav-${n.href}`,
      group: "Go to",
      label: n.label,
      hint: n.key ? `G ${n.key.toUpperCase()}` : undefined,
      icon: <n.Icon width={15} height={15} />,
      run: go(n.href),
    }));

    if (!term) return [...actions, ...nav];

    const matches = items
      .filter(
        (i) =>
          i.title.toLowerCase().includes(term) ||
          (i.description ?? "").toLowerCase().includes(term) ||
          i.tags.some((t) => `#${t}`.includes(term)) ||
          i.checklist.some((c) => c.text.toLowerCase().includes(term))
      )
      .sort((a, b) => Number(a.status === "DONE") - Number(b.status === "DONE") || Number(b.title.toLowerCase().startsWith(term)) - Number(a.title.toLowerCase().startsWith(term)))
      .slice(0, 12)
      .map<Command>((i) => ({
        id: i.id,
        group: i.type === "PROJECT" ? "Projects" : "Items",
        label: i.title,
        hint: [STATUS_LABEL[i.status], i.scheduledDate && relativeDay(i.scheduledDate)].filter(Boolean).join(" · "),
        icon: typeMap[i.type]?.icon ?? "•",
        run: i.type === "PROJECT" ? go(`/projects/${i.id}`) : () => openEdit(i),
      }));

    const filtered = [...actions, ...nav].filter((c) => c.label.toLowerCase().includes(term));
    return [...matches, ...filtered, { id: "create", group: "Actions", label: `Create “${q.trim()}”`, icon: "＋", run: () => openNew({ title: q.trim(), type: "TASK", status: "NEXT" }) }];
  }, [q, items, typeMap, router, openNew, openEdit, setTemplateOpen, setHelpOpen, toggle, undo, canUndo]);

  useEffect(() => setCursor(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!searchOpen) return null;

  const run = (c: Command) => {
    closeSearch();
    c.run();
  };

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center bg-stone-900/40 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={closeSearch}>
      <div
        className="animate-pop-in w-full max-w-xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lift dark:border-stone-800 dark:bg-stone-900"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeSearch();
            else if (e.key === "ArrowDown") {
              e.preventDefault();
              setCursor((c) => Math.min(commands.length - 1, c + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => Math.max(0, c - 1));
            } else if (e.key === "Enter" && commands[cursor]) {
              e.preventDefault();
              run(commands[cursor]);
            }
          }}
          placeholder="Search items, projects, #tags — or type a command…"
          className="w-full border-b border-stone-100 bg-transparent px-4 py-4 text-[15px] text-stone-900 outline-none placeholder:text-stone-400 dark:border-stone-800 dark:text-stone-100"
        />
        <div ref={listRef} className="max-h-[55vh] overflow-y-auto py-1">
          {commands.map((c, idx) => {
            const header = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            return (
              <div key={c.id}>
                {header ? <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">{header}</p> : null}
                <button
                  data-idx={idx}
                  onMouseMove={() => setCursor(idx)}
                  onClick={() => run(c)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2 text-left",
                    idx === cursor ? "bg-stone-100 dark:bg-stone-800" : ""
                  )}
                >
                  <span className="flex w-5 justify-center text-stone-500" aria-hidden>
                    {c.icon}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-stone-800 dark:text-stone-200">{c.label}</span>
                  {c.hint ? <span className="shrink-0 text-[11px] text-stone-400">{c.hint}</span> : null}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 border-t border-stone-100 px-4 py-2 text-[11px] text-stone-400 dark:border-stone-800">
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> navigate
          </span>
          <span>
            <Kbd>Enter</Kbd> open
          </span>
          <span>
            <Kbd>Esc</Kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
