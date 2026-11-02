"use client";

import { useUI } from "@/lib/ui";
import { NAV_ITEMS } from "./nav-items";
import { Kbd, Modal } from "./primitives";

export default function ShortcutHelp() {
  const { helpOpen, setHelpOpen } = useUI();
  const general: [string, string][] = [
    ["N", "New task"],
    ["/  or  Ctrl K", "Search & commands"],
    ["Ctrl Z", "Undo"],
    ["?", "This help"],
    ["Ctrl Enter", "Save in editor"],
    ["Esc", "Close dialog"],
  ];
  return (
    <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Keyboard shortcuts" width="max-w-md">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">General</p>
          {general.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 text-sm text-stone-600 dark:text-stone-300">
              <span>{v}</span>
              <Kbd>{k}</Kbd>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Go to (press G, then…)</p>
          {NAV_ITEMS.filter((n) => n.key).map((n) => (
            <div key={n.href} className="flex items-center justify-between gap-3 text-sm text-stone-600 dark:text-stone-300">
              <span>{n.label}</span>
              <Kbd>G {n.key!.toUpperCase()}</Kbd>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
