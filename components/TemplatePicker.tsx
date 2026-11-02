"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS } from "@/lib/constants";
import { todayKey } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { cn, shortMinutes } from "@/lib/utils";
import DateField from "./pickers/DateField";
import Select from "./pickers/Select";
import { Button, Field, Modal, inputClass } from "./primitives";

/** "New project from template" — built-ins plus your own saved templates. */
export default function TemplatePicker() {
  const { templateOpen, setTemplateOpen, toast, openNew } = useUI();
  const { templates, applyTemplate, settings } = useStore();
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(todayKey());
  const [areaId, setAreaId] = useState("");

  useEffect(() => {
    if (templateOpen) {
      setSelected(null);
      setTitle("");
      setStart(todayKey());
      setAreaId("");
    }
  }, [templateOpen]);

  const tpl = templates.find((t) => t.id === selected);
  const close = () => setTemplateOpen(false);

  const create = () => {
    if (!tpl) return;
    const project = applyTemplate(tpl, { title: title.trim() || tpl.name, startDate: start, areaId: areaId || undefined });
    close();
    toast(`Created “${project.title}” with ${tpl.tasks.length} tasks.`);
    router.push(`/projects/${project.id}`);
  };

  return (
    <Modal
      open={templateOpen}
      onClose={close}
      width="max-w-3xl"
      title="New project"
      footer={
        <>
          <Button
            variant="ghost"
            className="mr-auto"
            onClick={() => {
              close();
              openNew({ type: "PROJECT", status: "NEXT" });
            }}
          >
            Blank project
          </Button>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!tpl} onClick={create}>
            Create project
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((t) => {
          const mins = t.tasks.reduce((s, x) => s + (x.estimatedMinutes ?? 0), 0);
          return (
            <button
              key={t.id}
              onClick={() => {
                setSelected(t.id);
                if (!title) setTitle(t.name);
              }}
              className={cn(
                "rounded-xl border p-4 text-left transition",
                selected === t.id
                  ? "border-stone-800 ring-2 ring-stone-800 dark:border-stone-200 dark:ring-stone-200"
                  : "border-stone-200 hover:border-stone-300 dark:border-stone-700"
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", COLORS[t.project.color ?? "stone"].dot)} />
                <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{t.name}</span>
                {!t.builtin ? (
                  <span className="rounded bg-stone-100 px-1 text-[10px] text-stone-500 dark:bg-stone-800">yours</span>
                ) : null}
              </div>
              {t.description ? <p className="mt-1 text-[12px] text-stone-500 dark:text-stone-400">{t.description}</p> : null}
              <p className="mt-2 text-[11px] text-stone-400">
                {t.tasks.length} tasks{mins ? ` · ~${shortMinutes(mins)}` : ""}
                {t.project.durationDays ? ` · ${t.project.durationDays} days` : ""}
              </p>
            </button>
          );
        })}
      </div>

      {tpl ? (
        <div className="animate-fade-in mt-5 grid gap-3 rounded-xl bg-stone-50 p-4 dark:bg-stone-800/40 sm:grid-cols-3">
          <Field label="Project name">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Start date">
            <DateField label="Start date" value={start} allowClear={false} onChange={(v) => setStart(v ?? todayKey())} />
          </Field>
          <Field label="Area" optional>
            <Select
              label="Area"
              value={areaId}
              onChange={setAreaId}
              options={[{ value: "", label: "None" }, ...settings.areas.map((a) => ({ value: a.id, label: a.name, icon: a.icon }))]}
            />
          </Field>
          <ul className="space-y-1 text-[12px] text-stone-500 sm:col-span-3">
            {tpl.tasks.map((t, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>• {t.title}</span>
                <span className="text-stone-400">{t.offsetDays !== undefined ? `day ${t.offsetDays + 1}` : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Modal>
  );
}
