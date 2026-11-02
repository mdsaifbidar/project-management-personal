"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { IconCheck, IconSearch } from "../icons";
import Popover from "./Popover";
import { Trigger } from "./shared";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  /** Tailwind bg class for a color dot. */
  dot?: string;
  hint?: string;
}

/**
 * Styled replacement for <select>: keyboard navigable (↑ ↓ Enter Esc),
 * searchable when there are many options, bottom sheet on phones.
 */
export default function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  placeholder = "Select…",
  size = "md",
  variant = "field",
  searchable,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SelectOption<T>[];
  label: string;
  placeholder?: string;
  size?: "md" | "sm";
  /** "filter": compact pill that highlights when a non-empty value is chosen. */
  variant?: "field" | "filter";
  searchable?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const ref = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const current = options.find((o) => o.value === value);
  const canSearch = searchable ?? options.length > 8;

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter((o) => o.label.toLowerCase().includes(t)) : options;
  }, [q, options]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setCursor(Math.max(0, options.findIndex((o) => o.value === value)));
    // Focus the search box (desktop) or the list so arrow keys work immediately.
    requestAnimationFrame(() => {
      if (canSearch && window.matchMedia("(min-width: 640px)").matches) searchRef.current?.focus();
      else listRef.current?.focus();
    });
  }, [open, options, value, canSearch]);

  useEffect(() => setCursor(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursor, open]);

  const pick = (v: T) => {
    onChange(v);
    setOpen(false);
    ref.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(shown.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[cursor]) pick(shown[cursor].value);
    } else if (!canSearch && e.key.length === 1) {
      // Type-ahead jump.
      const i = shown.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (i >= 0) setCursor(i);
    }
  };

  const active = variant === "filter" && !!value;

  return (
    <>
      {variant === "filter" ? (
        <button
          ref={ref}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={label}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
          }}
          className={cn(
            "inline-flex h-8 max-w-[12rem] items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition",
            active
              ? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
              : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-stone-700",
            className
          )}
        >
          {current?.dot ? <span className={cn("h-2 w-2 shrink-0 rounded-full", current.dot)} /> : null}
          <span className="truncate">{active ? current?.label : placeholder}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0 opacity-60" aria-hidden>
            <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      ) : (
        <div
          className={className}
          onKeyDown={(e) => {
            if (!open && e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          <Trigger
            ref={ref}
            size={size}
            open={open}
            onClick={() => setOpen((o) => !o)}
            placeholder={!current}
            ariaLabel={`${label}: ${current?.label ?? "none"}`}
            icon={current?.dot ? <span className={cn("block h-2 w-2 rounded-full", current.dot)} /> : current?.icon}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="truncate">{current?.label ?? placeholder}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0 text-stone-400" aria-hidden>
                <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
          </Trigger>
        </div>
      )}

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchor={ref}
        label={label}
        width={Math.max(220, ref.current?.offsetWidth ?? 220)}
        className="p-1.5"
      >
        {canSearch ? (
          <div className="relative mb-1.5">
            <IconSearch width={14} height={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
              placeholder="Search…"
              aria-label={`Search ${label}`}
              className="w-full rounded-lg border border-stone-200 bg-stone-50 py-1.5 pl-8 pr-2 text-sm text-stone-900 outline-none focus:border-stone-400 focus:bg-white dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>
        ) : null}
        <div
          ref={listRef}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onKey}
          className="max-h-72 overflow-y-auto outline-none"
        >
          {shown.length === 0 ? <p className="px-3 py-4 text-center text-[13px] text-stone-400">No matches</p> : null}
          {shown.map((o, i) => {
            const selected = o.value === value;
            return (
              <button
                key={o.value || "__empty"}
                type="button"
                role="option"
                aria-selected={selected}
                data-idx={i}
                onMouseMove={() => setCursor(i)}
                onClick={() => pick(o.value)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition",
                  i === cursor ? "bg-stone-100 dark:bg-stone-800" : "",
                  selected ? "font-semibold text-stone-900 dark:text-stone-100" : "text-stone-700 dark:text-stone-300"
                )}
              >
                {o.dot ? <span className={cn("h-2 w-2 shrink-0 rounded-full", o.dot)} /> : null}
                {o.icon ? <span className="flex w-5 shrink-0 justify-center">{o.icon}</span> : null}
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.hint ? <span className="shrink-0 text-[11px] text-stone-400">{o.hint}</span> : null}
                {selected ? <IconCheck width={15} height={15} className="shrink-0 text-stone-900 dark:text-stone-100" /> : null}
              </button>
            );
          })}
        </div>
      </Popover>
    </>
  );
}
