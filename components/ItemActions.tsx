"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { STATUS_LABEL } from "@/lib/constants";
import { addDays, startOfWeek, todayKey } from "@/lib/dates";
import { useUI } from "@/lib/ui";
import { useActions } from "@/lib/useActions";
import { Item, ItemStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { IconMore } from "./icons";
import Popover from "./pickers/Popover";
import SchedulePicker from "./pickers/SchedulePicker";

const MOVE_TARGETS: ItemStatus[] = ["NOW", "NEXT", "LATER", "JAIL"];

export default function ItemActions({ item }: { item: Item }) {
  const a = useActions();
  const { openEdit } = useUI();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    if (!pos) return;
    const close = (e: Event) => {
      if (e.target instanceof Node && menu.current?.contains(e.target)) return;
      setPos(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPos(null);
    window.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [pos]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pos) return setPos(null);
    const r = btn.current!.getBoundingClientRect();
    const w = 208;
    setPos({ left: Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)), top: r.bottom + 4 });
  };

  // Once rendered, flip above the button (or pin to the bottom edge) if the
  // menu would run past the viewport.
  useLayoutEffect(() => {
    if (!pos || !menu.current || !btn.current) return;
    const h = menu.current.offsetHeight;
    const r = btn.current.getBoundingClientRect();
    // Phones: stay clear of the fixed bottom nav.
    const limit = window.innerHeight - (window.innerWidth < 768 ? 76 : 8);
    if (pos.top + h <= limit) return;
    const top = r.top - h - 4 >= 8 ? r.top - h - 4 : Math.max(8, limit - h);
    if (top !== pos.top) setPos({ ...pos, top });
  }, [pos]);

  const run = (fn: () => void) => () => {
    setPos(null);
    fn();
  };

  const today = todayKey();
  const isTimed = a.state.timer?.itemId === item.id;
  const isProject = item.type === "PROJECT";

  return (
    <>
      <button
        ref={btn}
        onClick={toggle}
        aria-label="Item actions"
        aria-haspopup="menu"
        className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
      >
        <IconMore width={18} height={18} />
      </button>

      {pos
        ? createPortal(
            <div
              ref={menu}
              role="menu"
              style={{ top: pos.top, left: pos.left }}
              className="animate-fade-in fixed z-[80] max-h-[calc(100vh-16px)] w-52 overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 text-sm shadow-lift dark:border-stone-700 dark:bg-stone-800"
            >
              {item.status !== "DONE" ? (
                <Row onClick={run(() => a.finish(item))}>✓ Complete</Row>
              ) : (
                <Row onClick={run(() => a.reopen(item))}>↺ Reopen</Row>
              )}
              <Row onClick={run(() => openEdit(item))}>Edit…</Row>
              {!isProject && item.status !== "DONE" ? (
                isTimed ? (
                  <Row onClick={run(() => a.stopTimer())}>■ Stop timer</Row>
                ) : (
                  <>
                    <Row onClick={run(() => a.startTimer(item.id, "track"))}>▶ Start timer</Row>
                    <Row onClick={run(() => a.startTimer(item.id, "pomodoro"))}>🍅 Start pomodoro</Row>
                  </>
                )
              ) : null}

              {!isProject && item.status !== "DONE" ? (
                <>
                  <Divider label="Schedule" />
                  <div className="grid grid-cols-4 gap-1 px-2 pb-1">
                    {[
                      ["Today", today],
                      ["Tmrw", addDays(today, 1)],
                      ["Next wk", addDays(startOfWeek(today, a.settings.weekStartsOn), 7)],
                      ["None", undefined],
                    ].map(([label, date]) => (
                      <button
                        key={label}
                        onClick={run(() => a.schedule(item, date))}
                        className={cn(
                          "whitespace-nowrap rounded-md px-0.5 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700",
                          item.scheduledDate === date && "bg-stone-100 dark:bg-stone-700"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <Row onClick={run(() => setScheduling(true))}>📅 Pick date &amp; time…</Row>
                </>
              ) : null}

              <Divider label="Move to" />
              {MOVE_TARGETS.filter((s) => s !== item.status).map((s) => (
                <Row key={s} onClick={run(() => a.move(item, s))}>
                  {STATUS_LABEL[s]}
                </Row>
              ))}
              <div className="my-1 border-t border-stone-100 dark:border-stone-700" />
              <Row onClick={run(() => a.duplicate(item.id))}>Duplicate{isProject ? " with tasks" : ""}</Row>
              <Row danger onClick={run(() => a.del(item))}>
                Delete
              </Row>
            </div>,
            document.body
          )
        : null}
      <Popover open={scheduling} onClose={() => setScheduling(false)} anchor={btn} label="Schedule" width={312}>
        <SchedulePicker
          date={item.scheduledDate}
          time={item.scheduledTime}
          duration={item.estimatedMinutes}
          onCancel={() => setScheduling(false)}
          onDone={(date, time) => {
            setScheduling(false);
            a.schedule(item, date, time);
          }}
        />
      </Popover>
    </>
  );
}

function Row({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={cn(
        "block w-full px-3 py-1.5 text-left hover:bg-stone-50 dark:hover:bg-stone-700/60",
        danger ? "text-rose-600 dark:text-rose-400" : "text-stone-600 dark:text-stone-300"
      )}
    >
      {children}
    </button>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="mt-1 border-t border-stone-100 px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-stone-400 dark:border-stone-700">
      {label}
    </div>
  );
}
