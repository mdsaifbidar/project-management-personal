"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMediaQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * Floating panel anchored to a trigger. On phones it becomes a bottom sheet.
 * Escape and outside clicks close it without closing a parent dialog.
 */
export default function Popover({
  open,
  onClose,
  anchor,
  children,
  width = 288,
  label,
  className,
}: {
  open: boolean;
  onClose: () => void;
  anchor: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  width?: number;
  label: string;
  className?: string;
}) {
  const phone = useMediaQuery("(max-width: 639px)");
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || phone || !anchor.current) return;
    const place = () => {
      const r = anchor.current!.getBoundingClientRect();
      const h = panel.current?.offsetHeight ?? 320;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const left = Math.max(8, Math.min(r.left, vw - width - 8));
      const below = r.bottom + 6;
      const top = below + h <= vh - 8 ? below : r.top - h - 6 >= 8 ? r.top - h - 6 : Math.max(8, vh - h - 8);
      setPos({ top, left });
    };
    place();
    // Re-place once content has rendered and measured.
    const id = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, phone, anchor, width]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Capture phase + stop: closes only this popover, not the dialog below.
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || anchor.current?.contains(t)) return;
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [open, onClose, anchor]);

  if (!open) return null;

  if (phone) {
    return createPortal(
      <div className="fixed inset-0 z-[95] flex flex-col justify-end bg-stone-900/30 backdrop-blur-[2px]">
        <div
          ref={panel}
          role="dialog"
          aria-label={label}
          className={cn(
            "animate-slide-up max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-stone-200 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-lift dark:border-stone-800 dark:bg-stone-900",
            className
          )}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-200 dark:bg-stone-700" />
          {children}
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-label={label}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width }}
      className={cn(
        "animate-pop-in fixed z-[95] max-h-[calc(100vh-16px)] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-3 shadow-lift dark:border-stone-700 dark:bg-stone-900",
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
}
