"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COLOR_KEYS, COLORS, ITEM_STATUSES, PRIORITIES, STATUS_LABEL } from "@/lib/constants";
import { allTags } from "@/lib/selectors";
import { useUI } from "@/lib/ui";
import { useActions } from "@/lib/useActions";
import {
  ChecklistEntry,
  ColorKey,
  Item,
  ItemStatus,
  Priority,
  RecurrenceFreq,
} from "@/lib/types";
import { cn, shortMinutes, slugTag, uid } from "@/lib/utils";
import { PRIORITY_DOT } from "./Badge";
import Checkbox from "./Checkbox";
import DateField from "./pickers/DateField";
import Select from "./pickers/Select";
import Stepper from "./pickers/Stepper";
import TimeField from "./pickers/TimeField";
import { IconX } from "./icons";
import { Button, Field, Modal, inputClass } from "./primitives";

interface FormState {
  title: string;
  description: string;
  type: string;
  status: ItemStatus;
  priority: Priority;
  estimatedMinutes: string;
  projectId: string;
  areaId: string;
  tags: string[];
  scheduledDate: string;
  scheduledTime: string;
  dueDate: string;
  startDate: string;
  repeat: RecurrenceFreq | "";
  interval: string;
  goal: string;
  successMetric: string;
  color: ColorKey | "";
  checklist: ChecklistEntry[];
}

const EMPTY: FormState = {
  title: "",
  description: "",
  type: "TASK",
  status: "NEXT",
  priority: "MEDIUM",
  estimatedMinutes: "",
  projectId: "",
  areaId: "",
  tags: [],
  scheduledDate: "",
  scheduledTime: "",
  dueDate: "",
  startDate: "",
  repeat: "",
  interval: "1",
  goal: "",
  successMetric: "",
  color: "",
  checklist: [],
};

const ESTIMATES = [15, 30, 45, 60, 90, 120];

const STATUS_DOT: Record<ItemStatus, string> = {
  NOW: "bg-emerald-500",
  NEXT: "bg-sky-500",
  LATER: "bg-stone-400",
  JAIL: "bg-amber-500",
  DONE: "bg-violet-500",
};

export default function ItemModal() {
  const { modalOpen, editing, prefill, closeModal, toast } = useUI();
  const a = useActions();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [tagDraft, setTagDraft] = useState("");
  const [checkDraft, setCheckDraft] = useState("");

  const projects = useMemo(
    () => a.projects.filter((p) => p.id !== editing?.id && p.status !== "DONE"),
    [a.projects, editing]
  );
  const knownTags = useMemo(() => allTags(a.items), [a.items]);
  const tagSuggestions = knownTags
    .filter((t) => !form.tags.includes(t) && (!tagDraft || t.startsWith(slugTag(tagDraft))))
    .slice(0, tagDraft ? 8 : 6);

  useEffect(() => {
    if (!modalOpen) return;
    setTagDraft("");
    setCheckDraft("");
    const src: Partial<Item> = editing ?? prefill ?? {};
    setForm({
      ...EMPTY,
      title: src.title ?? "",
      description: src.description ?? "",
      type: src.type ?? EMPTY.type,
      status: src.status ?? EMPTY.status,
      priority: src.priority ?? EMPTY.priority,
      estimatedMinutes: src.estimatedMinutes ? String(src.estimatedMinutes) : "",
      projectId: src.projectId ?? "",
      areaId: src.areaId ?? "",
      tags: src.tags ?? [],
      scheduledDate: src.scheduledDate ?? "",
      scheduledTime: src.scheduledTime ?? "",
      dueDate: src.dueDate ?? "",
      startDate: src.startDate ?? "",
      repeat: src.recurrence?.freq ?? "",
      interval: String(src.recurrence?.interval ?? 1),
      goal: src.goal ?? "",
      successMetric: src.successMetric ?? "",
      color: src.color ?? "",
      checklist: src.checklist ?? [],
    });
  }, [modalOpen, editing, prefill]);

  // Ctrl/⌘+Enter saves from anywhere while the editor is open — even when focus
  // has left the form (e.g. after a popover or a suggestion chip closes).
  const submitRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        submitRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  if (!modalOpen) return null;

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const isProject = form.type === "PROJECT";
  const alreadyActive = editing ? a.activeProjects.some((p) => p.id === editing.id) : false;
  const wouldExceedWip =
    isProject &&
    form.status === "NOW" &&
    a.settings.enforceWip &&
    !alreadyActive &&
    a.activeProjects.length >= a.settings.wipLimit;

  const addTag = (raw: string) => {
    const t = slugTag(raw);
    if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]);
    setTagDraft("");
  };

  const addCheck = () => {
    const text = checkDraft.trim();
    if (!text) return;
    set("checklist", [...form.checklist, { id: uid(), text, done: false }]);
    setCheckDraft("");
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const title = form.title.trim();
    if (!title) return toast("A title is required.");
    if (wouldExceedWip) return toast(`You're already running ${a.settings.wipLimit} projects.`);

    const mins = parseInt(form.estimatedMinutes, 10);
    const tags = tagDraft.trim() ? Array.from(new Set([...form.tags, slugTag(tagDraft)])) : form.tags;
    const payload = {
      title,
      description: form.description.trim() || undefined,
      type: form.type,
      status: form.status,
      priority: form.priority,
      estimatedMinutes: Number.isFinite(mins) && mins > 0 ? mins : undefined,
      projectId: isProject ? undefined : form.projectId || undefined,
      areaId: form.areaId || undefined,
      tags,
      scheduledDate: form.scheduledDate || undefined,
      scheduledTime: form.scheduledDate ? form.scheduledTime || undefined : undefined,
      dueDate: form.dueDate || undefined,
      startDate: isProject ? form.startDate || undefined : undefined,
      recurrence: form.repeat
        ? { freq: form.repeat, interval: Math.max(1, parseInt(form.interval, 10) || 1) }
        : undefined,
      goal: isProject ? form.goal.trim() || undefined : undefined,
      successMetric: isProject ? form.successMetric.trim() || undefined : undefined,
      color: form.color || undefined,
      checklist: form.checklist,
    };

    if (editing) {
      a.update(editing.id, payload);
      toast("Saved.");
    } else {
      a.add(payload);
      toast(payload.status === "JAIL" ? "Added to Idea Jail 🔒" : "Created.");
    }
    closeModal();
  };
  submitRef.current = submit;

  return (
    <Modal
      open={modalOpen}
      onClose={closeModal}
      width="max-w-2xl"
      title={editing ? `Edit ${a.typeMap[editing.type]?.label.toLowerCase() ?? "item"}` : "New item"}
      footer={
        <>
          {editing ? (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => {
                a.del(editing);
                closeModal();
              }}
            >
              Delete
            </Button>
          ) : null}
          <span className="mr-2 hidden self-center text-[11px] text-stone-400 sm:inline">Ctrl + Enter to save</span>
          <Button variant="ghost" onClick={closeModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => submit()}>
            {editing ? "Save changes" : "Create"}
          </Button>
        </>
      }
    >
      <form
        onSubmit={submit}
        className="space-y-5"
      >
        <div className="space-y-2">
          <input
            autoFocus
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder={isProject ? "Project name" : "What needs to happen?"}
            className="w-full border-0 bg-transparent p-0 text-lg font-semibold text-stone-900 outline-none placeholder:text-stone-300 dark:text-stone-100 dark:placeholder:text-stone-600"
          />
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            placeholder="Notes, links, the clear outcome…"
            className="w-full resize-y border-0 bg-transparent p-0 text-sm text-stone-600 outline-none placeholder:text-stone-300 dark:text-stone-300 dark:placeholder:text-stone-600"
          />
        </div>

        <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-4">
          <Field label="Type">
            <Select
              label="Type"
              value={form.type}
              onChange={(v) => set("type", v)}
              options={a.settings.types.map((t) => ({ value: t.id, label: t.label, icon: t.icon }))}
            />
          </Field>
          <Field label="Status">
            <Select
              label="Status"
              value={form.status}
              onChange={(v) => set("status", v as ItemStatus)}
              options={ITEM_STATUSES.map((st) => ({ value: st, label: STATUS_LABEL[st], dot: STATUS_DOT[st] }))}
            />
          </Field>
          <Field label="Priority">
            <Select
              label="Priority"
              value={form.priority}
              onChange={(v) => set("priority", v as Priority)}
              options={[...PRIORITIES].reverse().map((pr) => ({ value: pr, label: pr.charAt(0) + pr.slice(1).toLowerCase(), dot: PRIORITY_DOT[pr] }))}
            />
          </Field>
          <Field label="Area" optional>
            <Select
              label="Area"
              value={form.areaId}
              onChange={(v) => set("areaId", v)}
              placeholder="None"
              options={[{ value: "", label: "None" }, ...a.settings.areas.map((ar) => ({ value: ar.id, label: ar.name, icon: ar.icon }))]}
            />
          </Field>
        </div>

        {!isProject ? (
          <Field label="Project" optional>
            <Select
              label="Project"
              value={form.projectId}
              onChange={(v) => set("projectId", v)}
              options={[
                { value: "", label: "No project — standalone" },
                ...projects.map((pj) => ({ value: pj.id, label: pj.title, dot: COLORS[pj.color ?? "stone"].dot })),
              ]}
            />
          </Field>
        ) : null}

        {/* Planning */}
        <div className="space-y-3 rounded-xl bg-stone-50 p-4 dark:bg-stone-800/40">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Planning</p>
          <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-4">
            {isProject ? (
              <Field label="Start date" optional>
                <DateField label="Start date" value={form.startDate || undefined} onChange={(v) => set("startDate", v ?? "")} />
              </Field>
            ) : (
              <>
                <Field label="Do on" optional>
                  <DateField label="Do on" value={form.scheduledDate || undefined} onChange={(v) => set("scheduledDate", v ?? "")} />
                </Field>
                <Field label="At time" optional>
                  <TimeField
                    label="At time"
                    value={form.scheduledTime || undefined}
                    disabled={!form.scheduledDate}
                    placeholder={form.scheduledDate ? "Any time" : "Pick a day first"}
                    duration={parseInt(form.estimatedMinutes, 10) || undefined}
                    onChange={(v) => set("scheduledTime", v ?? "")}
                  />
                </Field>
              </>
            )}
            <Field label={isProject ? "Deadline" : "Due"} optional>
              <DateField label={isProject ? "Deadline" : "Due"} kind="due" placeholder="No deadline" value={form.dueDate || undefined} onChange={(v) => set("dueDate", v ?? "")} />
            </Field>
            <Field label="Estimate" optional>
              <Stepper
                label="Estimate"
                value={parseInt(form.estimatedMinutes, 10) || undefined}
                onChange={(v) => set("estimatedMinutes", v ? String(v) : "")}
                min={0}
                max={1440}
                step={15}
                suffix="min"
                allowEmpty
              />
            </Field>
          </div>

          {!isProject && form.scheduledDate && form.scheduledTime && a.settings.reminders.enabled ? (
            <p className="-mt-1 text-[12px] text-stone-500 dark:text-stone-400">
              🔔 Reminder{" "}
              {a.settings.reminders.leadMinutes
                ? `${a.settings.reminders.leadMinutes} min before${a.settings.reminders.atStart ? " and at start" : ""}`
                : "when it starts"}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5">
            {ESTIMATES.map((m) => (
              <Chip
                key={m}
                active={form.estimatedMinutes === String(m)}
                onClick={() => set("estimatedMinutes", form.estimatedMinutes === String(m) ? "" : String(m))}
              >
                {shortMinutes(m)}
              </Chip>
            ))}
          </div>

          {!isProject ? (
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Repeat" optional className="w-44">
                <Select
                  label="Repeat"
                  value={form.repeat}
                  onChange={(v) => set("repeat", v as RecurrenceFreq | "")}
                  options={[
                    { value: "", label: "Doesn't repeat" },
                    { value: "DAILY", label: "Daily" },
                    { value: "WEEKDAYS", label: "Weekdays" },
                    { value: "WEEKLY", label: "Weekly" },
                    { value: "MONTHLY", label: "Monthly" },
                    { value: "YEARLY", label: "Yearly" },
                  ]}
                />
              </Field>
              {form.repeat && form.repeat !== "WEEKDAYS" ? (
                <Field label="Every" className="w-36">
                  <Stepper
                    label="Repeat interval"
                    value={parseInt(form.interval, 10) || 1}
                    onChange={(v) => set("interval", String(v ?? 1))}
                    min={1}
                    max={365}
                    suffix={{ DAILY: "days", WEEKLY: "weeks", MONTHLY: "months", YEARLY: "years" }[form.repeat as string] ?? ""}
                  />
                </Field>
              ) : null}
              {form.repeat && !form.scheduledDate && !form.dueDate ? (
                <p className="pb-2 text-[12px] text-amber-600 dark:text-amber-400">Set a date so it can repeat from there.</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Tags */}
        <Field label="Tags" optional>
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2 py-1.5 dark:border-stone-700 dark:bg-stone-800">
            {form.tags.map((t) => (
              <span key={t} className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-medium", COLORS[a.settings.tagColors[t] ?? "stone"].soft)}>
                #{t}
                <button type="button" onClick={() => set("tags", form.tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
                  <IconX width={11} height={11} />
                </button>
              </span>
            ))}
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "," || e.key === " ") {
                  e.preventDefault();
                  addTag(tagDraft);
                } else if (e.key === "Backspace" && !tagDraft && form.tags.length) {
                  set("tags", form.tags.slice(0, -1));
                }
              }}
              placeholder={form.tags.length ? "" : "Add tags…"}
              className="min-w-[6rem] flex-1 bg-transparent py-0.5 text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:text-stone-100"
            />

          </div>
        </Field>

        {tagSuggestions.length ? (
          <div className="-mt-3 flex flex-wrap gap-1.5" aria-label="Tag suggestions">
            {tagSuggestions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => addTag(t)}
                className={cn("rounded-md px-1.5 py-0.5 text-[12px] font-medium opacity-70 transition hover:opacity-100", COLORS[a.settings.tagColors[t] ?? "stone"].soft)}
              >
                + #{t}
              </button>
            ))}
          </div>
        ) : null}

        {/* Checklist */}
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-stone-400">
            Checklist / subtasks
            {form.checklist.length ? (
              <span className="ml-2 normal-case text-stone-400">
                {form.checklist.filter((c) => c.done).length}/{form.checklist.length}
              </span>
            ) : null}
          </p>
          <div className="space-y-1">
            {form.checklist.map((c) => (
              <div key={c.id} className="group flex items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-stone-50 dark:hover:bg-stone-800/50">
                <Checkbox
                  size={16}
                  checked={c.done}
                  onChange={() => set("checklist", form.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))}
                />
                <input
                  value={c.text}
                  onChange={(e) => set("checklist", form.checklist.map((x) => (x.id === c.id ? { ...x, text: e.target.value } : x)))}
                  className={cn("flex-1 bg-transparent text-sm outline-none", c.done ? "text-stone-400 line-through" : "text-stone-700 dark:text-stone-200")}
                />
                <button
                  type="button"
                  onClick={() => set("checklist", form.checklist.filter((x) => x.id !== c.id))}
                  className="text-stone-300 opacity-0 hover:text-rose-500 group-hover:opacity-100"
                  aria-label="Remove"
                >
                  <IconX width={14} height={14} />
                </button>
              </div>
            ))}
            <input
              value={checkDraft}
              onChange={(e) => setCheckDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  addCheck();
                }
              }}
              onBlur={addCheck}
              placeholder="+ Add a step and press Enter"
              className="w-full rounded-lg px-1 py-1 text-sm text-stone-700 outline-none placeholder:text-stone-400 dark:bg-transparent dark:text-stone-200"
            />
          </div>
        </div>

        {isProject ? (
          <div className="space-y-4 rounded-xl bg-amber-50/60 p-4 dark:bg-amber-950/20">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700/70 dark:text-amber-300/70">
              Why am I doing this?
            </p>
            <Field label="Goal" optional>
              <input value={form.goal} onChange={(e) => set("goal", e.target.value)} placeholder="Make ₹50,000/month from ..." className={inputClass} />
            </Field>
            <Field label="Success metric" optional>
              <input
                value={form.successMetric}
                onChange={(e) => set("successMetric", e.target.value)}
                placeholder="1,000 monthly organic visitors."
                className={inputClass}
              />
            </Field>
          </div>
        ) : null}

        {isProject ? (
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-stone-400">Color</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_KEYS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => set("color", c)}
                  className={cn(
                    "h-6 w-6 rounded-full ring-offset-2 transition dark:ring-offset-stone-900",
                    COLORS[c].dot,
                    form.color === c ? "ring-2 ring-stone-800 dark:ring-stone-200" : "hover:scale-110"
                  )}
                />
              ))}
            </div>
          </div>
        ) : null}

        {editing && editing.timeLogs.length ? (
          <p className="text-[12px] text-stone-400">
            Tracked {shortMinutes(editing.timeLogs.reduce((s, l) => s + l.minutes, 0))} across{" "}
            {editing.timeLogs.length} session{editing.timeLogs.length === 1 ? "" : "s"}.
          </p>
        ) : null}

        {wouldExceedWip ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
            You&apos;re already running {a.settings.wipLimit} projects. Pause one from the Projects page first.
          </p>
        ) : null}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-[12px] font-medium transition",
        active
          ? "border-stone-800 bg-stone-800 text-white dark:border-stone-200 dark:bg-stone-200 dark:text-stone-900"
          : "border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-800 dark:border-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
      )}
    >
      {children}
    </button>
  );
}
