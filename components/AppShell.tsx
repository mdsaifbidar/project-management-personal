"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import ItemModal from "./ItemModal";
import MobileNav from "./MobileNav";
import ReminderEngine from "./ReminderEngine";
import { NAV_ITEMS } from "./nav-items";
import SearchOverlay from "./SearchOverlay";
import ShortcutHelp from "./ShortcutHelp";
import Sidebar from "./Sidebar";
import TemplatePicker from "./TemplatePicker";
import Toasts from "./Toasts";
import WipPrompt from "./WipPrompt";

/** Screens that need the full width (calendars, boards). */
const WIDE = ["/planner", "/today", "/board", "/review", "/projects", "/goals"];

function isTyping(el: EventTarget | null) {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { openNew, openSearch, modalOpen, searchOpen, setHelpOpen, toast } = useUI();
  const { undo } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const pendingG = useRef<number>(0);
  // Pages depend on local data and the current date, so render them only in
  // the browser — otherwise the build-time prerender mismatches on hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = isTyping(e.target);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !typing && !e.shiftKey) {
        e.preventDefault();
        toast(undo() ? "Undone." : "Nothing to undo.");
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || typing || modalOpen || searchOpen) return;

      const k = e.key.toLowerCase();
      if (Date.now() - pendingG.current < 1200) {
        pendingG.current = 0;
        const target = NAV_ITEMS.find((n) => n.key === k);
        if (target) {
          e.preventDefault();
          router.push(target.href);
        }
        return;
      }
      if (k === "g") {
        pendingG.current = Date.now();
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        openSearch();
      } else if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
      } else if (k === "n") {
        e.preventDefault();
        openNew({ type: "TASK", status: "NEXT" });
      } else if (k === "f") {
        router.push("/focus");
      } else if (k === "t") {
        router.push("/today");
      } else if (k === "p") {
        router.push("/planner");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openNew, openSearch, router, modalOpen, searchOpen, setHelpOpen, undo, toast]);

  const wide = WIDE.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 pb-24 md:pb-0">
        <div className={cn("mx-auto w-full px-4 py-6 sm:px-6 sm:py-10", wide ? "max-w-7xl" : "max-w-3xl")}>
          {mounted ? children : <div className="h-40 animate-pulse rounded-2xl bg-stone-100 dark:bg-stone-900" />}
        </div>
      </main>
      <MobileNav />
      <ItemModal />
      <SearchOverlay />
      <TemplatePicker />
      <WipPrompt />
      <ShortcutHelp />
      <ReminderEngine />
      <Toasts />
    </div>
  );
}
