"use client";

import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { Modal } from "./primitives";

/** "You're already running N projects — which one should pause?" */
export default function WipPrompt() {
  const { wipPromptFor, closeWipPrompt, toast } = useUI();
  const { activeProjects, moveTo, settings } = useStore();
  const project = wipPromptFor;

  return (
    <Modal open={!!project} onClose={closeWipPrompt} width="max-w-sm" title={`You're already running ${settings.wipLimit} projects.`}>
      <p className="text-sm text-stone-500 dark:text-stone-400">
        To start <span className="font-medium text-stone-800 dark:text-stone-200">{project?.title}</span>, pause one of these:
      </p>
      <div className="mt-4 space-y-2">
        {activeProjects.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              if (!project) return;
              moveTo(p.id, "LATER");
              moveTo(project.id, "NOW");
              closeWipPrompt();
              toast(`Paused ${p.title}. Now working on ${project.title}.`);
            }}
            className="flex w-full items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-left text-sm hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
          >
            <span className="text-stone-800 dark:text-stone-200">{p.title}</span>
            <span className="text-[11px] text-stone-400">move to Later</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
