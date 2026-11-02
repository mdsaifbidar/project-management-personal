"use client";

import FocusCard from "@/components/FocusCard";
import QuickCapture from "@/components/QuickCapture";
import TimerWidget from "@/components/TimerWidget";
import WipIndicator from "@/components/WipIndicator";
import BigThree from "@/components/planner/BigThree";
import { useToday } from "@/lib/hooks";

export default function FocusPage() {
  const today = useToday();
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">Today&apos;s Focus</h1>
        <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">One thing at a time. Everything else can wait.</p>
      </header>

      <TimerWidget variant="floating" />

      <FocusCard heading="Do this now" />

      <BigThree periodKey={today} title="Today's Big 3" />

      <WipIndicator />

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-400">Capture a distraction instead of chasing it</p>
        <QuickCapture />
      </div>
    </div>
  );
}
