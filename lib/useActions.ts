"use client";

import { formatTime, relativeDay, relativePhrase } from "./dates";
import { useStore } from "./store";
import { Item, ItemStatus } from "./types";
import { useUI } from "./ui";

/**
 * The item actions every screen shares, with WIP checks, toasts and Undo
 * wired in. Use this instead of calling the store directly from UI.
 */
export function useActions() {
  const store = useStore();
  const { toast, openWipPrompt } = useUI();
  const { undo, canActivateProject, moveTo, complete, remove, update } = store;
  const undoAction = { label: "Undo", run: () => void undo() };

  function start(item: Item) {
    if (!canActivateProject(item.id)) {
      openWipPrompt(item);
      return;
    }
    moveTo(item.id, "NOW");
    toast("You're working on this now.");
  }

  function finish(item: Item) {
    const next = complete(item.id);
    toast(next ? `Done. Next: ${relativeDay(next)}.` : "Done. 🎉", undoAction);
  }

  function move(item: Item, status: ItemStatus) {
    if (status === "NOW") return start(item);
    if (status === "DONE") return finish(item);
    moveTo(item.id, status);
    toast(status === "JAIL" ? "Sent to Idea Jail 🔒" : `Moved to ${status.toLowerCase()}.`, undoAction);
  }

  function reopen(item: Item) {
    moveTo(item.id, "NEXT");
    toast("Reopened to Next.");
  }

  function del(item: Item) {
    remove(item.id);
    toast("Deleted.", undoAction);
  }

  function schedule(item: Item, date?: string, time?: string) {
    const patch: Partial<Item> = { scheduledDate: date, scheduledTime: date ? time : undefined };
    // Planning something for a day means you've decided to do it.
    if (date && (item.status === "JAIL" || item.status === "LATER")) patch.status = "NEXT";
    update(item.id, patch);
    toast(
      date
        ? `Scheduled ${relativePhrase(date)}${time ? ` at ${formatTime(time)}` : ""}.`
        : "Unscheduled.",
      undoAction
    );
  }

  return { ...store, start, finish, move, reopen, del, schedule };
}
