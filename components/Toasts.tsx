"use client";

import { useUI } from "@/lib/ui";

export default function Toasts() {
  const { toasts, dismissToast } = useUI();
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[90] flex -translate-x-1/2 flex-col items-center gap-2 sm:bottom-6" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-slide-up pointer-events-auto flex items-center gap-3 rounded-full border border-stone-200 bg-stone-900 py-2 pl-4 pr-2 text-sm font-medium text-white shadow-lift dark:border-stone-700 dark:bg-stone-100 dark:text-stone-900"
        >
          <button onClick={() => dismissToast(t.id)} className="text-left">
            {t.message}
          </button>
          {t.action ? (
            <button
              onClick={() => {
                t.action!.run();
                dismissToast(t.id);
              }}
              className="rounded-full bg-white/15 px-3 py-0.5 text-[13px] font-semibold hover:bg-white/25 dark:bg-stone-900/10 dark:hover:bg-stone-900/20"
            >
              {t.action.label}
            </button>
          ) : (
            <span className="w-2" />
          )}
        </div>
      ))}
    </div>
  );
}
