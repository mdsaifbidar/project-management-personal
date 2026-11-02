"use client";

import { useEffect, useId } from "react";
import { cn } from "@/lib/utils";
import { IconX } from "./icons";

export const inputClass =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-stone-500 dark:focus:ring-stone-700";

const BUTTON = {
  primary:
    "bg-stone-900 text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white",
  outline:
    "border border-stone-300 text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800",
  ghost:
    "text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100",
  danger: "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40",
};

export function Button({
  variant = "outline",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BUTTON;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm",
        BUTTON[variant],
        className
      )}
    />
  );
}

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionLabel({
  children,
  right,
  className,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-2 flex items-center justify-between gap-2", className)}>
      <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
        {children}
      </h2>
      {right}
    </div>
  );
}

export function Count({ n }: { n: number }) {
  return (
    <span className="rounded-full bg-stone-100 px-1.5 text-[11px] font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
      {n}
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex rounded-lg bg-stone-100 p-0.5 dark:bg-stone-800/80">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md font-medium transition",
            size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-[13px]",
            value === o.value
              ? "bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-100"
              : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({
  percent,
  className,
  barClass = "bg-stone-800 dark:bg-stone-200",
}: {
  percent: number;
  className?: string;
  barClass?: string;
}) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", barClass)}
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

export function Ring({
  percent,
  size = 44,
  stroke = 4,
  children,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" className="stroke-stone-100 dark:stroke-stone-800" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, Math.max(0, percent)) / 100)}
          className="stroke-stone-800 transition-all duration-500 dark:stroke-stone-200"
        />
      </svg>
      <span className="absolute text-[11px] font-semibold text-stone-700 dark:text-stone-200">
        {children ?? `${Math.round(percent)}%`}
      </span>
    </div>
  );
}

export function Field({
  label,
  optional,
  children,
  className,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  // A group, not a <label>: a label would forward clicks on its caption to the
  // first button inside (e.g. a Stepper's "−"). Controls carry their own aria-labels.
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className={cn("block", className)}>
      <span id={id} className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-stone-400">
        {label}
        {optional ? (
          <span className="ml-1 lowercase text-stone-300 dark:text-stone-600">optional</span>
        ) : null}
      </span>
      {children}
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-[10px] text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400">
      {children}
    </kbd>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  width?: string;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-900/40 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "animate-pop-in my-auto w-full rounded-2xl border border-stone-200 bg-white shadow-lift dark:border-stone-800 dark:bg-stone-900",
          width
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5 dark:border-stone-800">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
          >
            <IconX width={18} height={18} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-stone-100 px-5 py-3 dark:border-stone-800">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
