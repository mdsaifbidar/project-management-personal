"use client";

import { useMemo, useRef, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import PageHeader from "@/components/PageHeader";
import Select from "@/components/pickers/Select";
import Stepper from "@/components/pickers/Stepper";
import Switch from "@/components/pickers/Switch";
import SyncBadge from "@/components/SyncBadge";
import { Button, Card, Field, Segmented, inputClass } from "@/components/primitives";
import { IconX } from "@/components/icons";
import { COLOR_KEYS, COLORS, CORE_TYPE_IDS, ITEM_STATUSES, SAMPLE_ID_PREFIX, STATUS_LABEL } from "@/lib/constants";
import { formatTime, todayKey } from "@/lib/dates";
import { allTags } from "@/lib/selectors";
import * as storage from "@/lib/storage";
import { useStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { useUI } from "@/lib/ui";
import { AppState, ColorKey, ItemStatus } from "@/lib/types";
import { cn, slugTag, uid } from "@/lib/utils";

export default function SettingsPage() {
  const s = useStore();
  const { settings, updateSettings } = s;
  const { toast } = useUI();
  const { theme, toggle } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<AppState | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [newType, setNewType] = useState({ icon: "⭐", label: "" });
  const [newArea, setNewArea] = useState({ icon: "📁", name: "" });
  const tags = useMemo(() => allTags(s.items), [s.items]);
  const hasSamples = s.items.some((i) => i.id.startsWith(SAMPLE_ID_PREFIX));

  const num = (v: string, fallback: number) => (Number.isFinite(Number(v)) && v !== "" ? Number(v) : fallback);
  const stamp = todayKey();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Make the system fit how you work." />

      <Section
        title="Storage & sync"
        desc={
          s.syncStatus === "local"
            ? "Saved in this browser only. Connect a database (see README) to keep it permanently and sync across devices."
            : "Saved permanently in your database and synced across your devices. This browser keeps an offline copy."
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <SyncBadge className="border border-stone-200 py-1 dark:border-stone-700" />
          {s.lastSynced ? <span className="text-[12px] text-stone-400">Last synced {s.lastSynced.toLocaleTimeString()}</span> : null}
          {s.syncStatus !== "local" ? (
            <>
              <Button size="sm" className="ml-auto" onClick={() => void s.syncNow()}>
                Sync now
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.assign("/login");
                }}
              >
                Sign out
              </Button>
            </>
          ) : null}
        </div>
      </Section>

      <Section title="Workflow" desc="Limits and defaults that shape your day.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Max active projects (WIP limit)">
            <div className="flex items-center gap-4">
              <Stepper
                label="Max active projects"
                className="w-32"
                value={settings.wipLimit}
                onChange={(v) => updateSettings({ wipLimit: v ?? 3 })}
                min={1}
                max={20}
              />
              <Switch label="Enforce" checked={settings.enforceWip} onChange={(v) => updateSettings({ enforceWip: v })} />
            </div>
          </Field>
          <Field label="Quick capture sends undated items to">
            <Select
              label="Quick capture destination"
              value={settings.captureStatus}
              onChange={(v) => updateSettings({ captureStatus: v as ItemStatus })}
              options={ITEM_STATUSES.filter((x) => x !== "DONE").map((x) => ({ value: x, label: STATUS_LABEL[x] }))}
            />
          </Field>
          <Field label="Daily capacity (hours of planned work)">
            <Stepper
              label="Daily capacity"
              value={settings.dailyCapacityMinutes / 60}
              onChange={(v) => updateSettings({ dailyCapacityMinutes: Math.round((v ?? 6) * 60) })}
              min={0.5}
              max={24}
              step={0.5}
              suffix="h"
            />
          </Field>
          <Field label="Week starts on">
            <Segmented
              value={String(settings.weekStartsOn) as "0" | "1"}
              onChange={(v) => updateSettings({ weekStartsOn: v === "0" ? 0 : 1 })}
              options={[
                { value: "1", label: "Monday" },
                { value: "0", label: "Sunday" },
              ]}
            />
          </Field>
          <Field label="Planner hours">
            <div className="flex items-center gap-2">
              <Select
                label="Day starts"
                className="flex-1"
                value={String(settings.dayStartHour)}
                onChange={(v) => updateSettings({ dayStartHour: Number(v) })}
                options={Array.from({ length: 24 }, (_, h) => h).filter((h) => h < settings.dayEndHour).map((h) => ({ value: String(h), label: formatTime(`${String(h).padStart(2, "0")}:00`) }))}
              />
              <span className="text-stone-400">→</span>
              <Select
                label="Day ends"
                className="flex-1"
                value={String(settings.dayEndHour)}
                onChange={(v) => updateSettings({ dayEndHour: Number(v) })}
                options={Array.from({ length: 24 }, (_, h) => h + 1).filter((h) => h > settings.dayStartHour).map((h) => ({ value: String(h), label: h === 24 ? "Midnight" : formatTime(`${String(h).padStart(2, "0")}:00`) }))}
              />
            </div>
          </Field>
          <Field label="Pomodoro (work / break)">
            <div className="flex items-center gap-2">
              <Stepper label="Pomodoro work minutes" className="flex-1" value={settings.pomodoroWork} onChange={(v) => updateSettings({ pomodoroWork: v ?? 25 })} min={5} max={120} step={5} suffix="min" />
              <span className="text-stone-400">/</span>
              <Stepper label="Pomodoro break minutes" className="flex-1" value={settings.pomodoroBreak} onChange={(v) => updateSettings({ pomodoroBreak: v ?? 5 })} min={1} max={60} suffix="min" />
            </div>
          </Field>
          <Field label="Theme">
            <Segmented value={theme} onChange={(v) => v !== theme && toggle()} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
          </Field>
        </div>
      </Section>

      <Section title="Item types" desc="Add your own kinds of work. Task, Project and Idea are built in.">
        <div className="space-y-2">
          {settings.types.map((t, idx) => (
            <div key={t.id} className="flex items-center gap-2">
              <input
                value={t.icon}
                onChange={(e) => updateSettings({ types: settings.types.map((x, i) => (i === idx ? { ...x, icon: e.target.value.slice(0, 4) } : x)) })}
                className={iconInput}
              />
              <input
                value={t.label}
                onChange={(e) => updateSettings({ types: settings.types.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)) })}
                className={rowInput}
              />
              <span className="hidden w-16 shrink-0 text-right text-[11px] text-stone-400 sm:block">{s.items.filter((i) => i.type === t.id).length} items</span>
              <button
                disabled={CORE_TYPE_IDS.includes(t.id)}
                onClick={() => {
                  s.items.filter((i) => i.type === t.id).forEach((i) => s.update(i.id, { type: "TASK" }));
                  updateSettings({ types: settings.types.filter((x) => x.id !== t.id) });
                  toast(`Removed “${t.label}”. Its items are now tasks.`);
                }}
                className="rounded-md p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600 disabled:invisible dark:hover:bg-rose-950/40"
                aria-label={`Remove ${t.label}`}
              >
                <IconX width={14} height={14} />
              </button>
            </div>
          ))}
          <form
            className="flex items-center gap-2 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              const label = newType.label.trim();
              if (!label) return;
              const id = slugTag(label).toUpperCase().replace(/-/g, "_") || uid();
              if (settings.types.some((t) => t.id === id)) return toast("That type already exists.");
              updateSettings({ types: [...settings.types, { id, label, icon: newType.icon || "•" }] });
              setNewType({ icon: "⭐", label: "" });
            }}
          >
            <input value={newType.icon} onChange={(e) => setNewType({ ...newType, icon: e.target.value.slice(0, 4) })} className={iconInput} />
            <input value={newType.label} onChange={(e) => setNewType({ ...newType, label: e.target.value })} placeholder="New type, e.g. Meeting" className={rowInput} />
            <Button type="submit" variant="primary" size="sm">
              Add
            </Button>
          </form>
        </div>
      </Section>

      <Section title="Areas" desc="Life areas or workspaces — group projects and tasks (Work, Health, Side business…).">
        <div className="space-y-2">
          {settings.areas.map((ar, idx) => (
            <div key={ar.id} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <input
                value={ar.icon}
                onChange={(e) => updateSettings({ areas: settings.areas.map((x, i) => (i === idx ? { ...x, icon: e.target.value.slice(0, 4) } : x)) })}
                className={iconInput}
              />
              <input
                value={ar.name}
                onChange={(e) => updateSettings({ areas: settings.areas.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)) })}
                className={rowInput}
              />
              <div className="order-last w-full pl-14 sm:order-none sm:w-auto sm:pl-0">
                <ColorPicker value={ar.color} onChange={(c) => updateSettings({ areas: settings.areas.map((x, i) => (i === idx ? { ...x, color: c } : x)) })} />
              </div>
              <button
                onClick={() => {
                  s.items.filter((i) => i.areaId === ar.id).forEach((i) => s.update(i.id, { areaId: undefined }));
                  updateSettings({ areas: settings.areas.filter((x) => x.id !== ar.id) });
                }}
                className="rounded-md p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                aria-label={`Remove ${ar.name}`}
              >
                <IconX width={14} height={14} />
              </button>
            </div>
          ))}
          <form
            className="flex items-center gap-2 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newArea.name.trim()) return;
              updateSettings({ areas: [...settings.areas, { id: uid(), name: newArea.name.trim(), icon: newArea.icon || "•", color: "stone" }] });
              setNewArea({ icon: "📁", name: "" });
            }}
          >
            <input value={newArea.icon} onChange={(e) => setNewArea({ ...newArea, icon: e.target.value.slice(0, 4) })} className={iconInput} />
            <input value={newArea.name} onChange={(e) => setNewArea({ ...newArea, name: e.target.value })} placeholder="New area, e.g. Health" className={rowInput} />
            <Button type="submit" variant="primary" size="sm">
              Add
            </Button>
          </form>
        </div>
      </Section>

      <Section title="Tags" desc="Tags are created by typing #tag. Give them colors here.">
        {tags.length === 0 ? (
          <p className="text-sm text-stone-400">No tags yet.</p>
        ) : (
          <div className="grid gap-2 xl:grid-cols-2">
            {tags.map((t) => (
              <div key={t} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-100 px-3 py-1.5 dark:border-stone-800">
                <span className={cn("rounded-md px-1.5 text-[12px] font-medium", COLORS[settings.tagColors[t] ?? "stone"].soft)}>#{t}</span>
                <ColorPicker value={settings.tagColors[t] ?? "stone"} onChange={(c) => updateSettings({ tagColors: { ...settings.tagColors, [t]: c } })} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Your templates" desc="Save any project as a template from its page. Built-in templates are always available.">
        {settings.templates.length === 0 ? (
          <p className="text-sm text-stone-400">None yet — open a project and choose “Save as template”.</p>
        ) : (
          <div className="space-y-2">
            {settings.templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2 dark:border-stone-800">
                <span className="text-sm text-stone-700 dark:text-stone-200">
                  {t.name} <span className="text-[12px] text-stone-400">· {t.tasks.length} tasks</span>
                </span>
                <Button size="sm" variant="danger" onClick={() => updateSettings({ templates: settings.templates.filter((x) => x.id !== t.id) })}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Data" desc="Everything lives in this browser. Back it up, move it, or sync it into your calendar.">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => storage.download(`decision-inbox-${stamp}.json`, storage.exportJSON(s.state), "application/json")}>
            Export backup (JSON)
          </Button>
          <Button onClick={() => storage.download(`decision-inbox-${stamp}.csv`, storage.exportCSV(s.items), "text/csv")}>Export CSV</Button>
          <Button onClick={() => storage.download(`decision-inbox-${stamp}.ics`, storage.exportICS(s.items), "text/calendar")}>
            Export calendar (.ics)
          </Button>
          <Button onClick={() => fileRef.current?.click()}>Import JSON…</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                setPendingImport(storage.parseImport(await file.text()));
              } catch {
                toast("That file isn't a valid backup.");
              }
            }}
          />
        </div>
        <p className="mt-2 text-[12px] text-stone-400">
          The .ics file imports into Google Calendar, Apple Calendar or Outlook.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-4 dark:border-stone-800">
          {hasSamples ? (
            <Button
              variant="ghost"
              onClick={() => {
                s.clearSamples();
                toast("Sample data cleared.", { label: "Undo", run: () => void s.undo() });
              }}
            >
              Clear sample data
            </Button>
          ) : null}
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            Delete everything…
          </Button>
        </div>
      </Section>

      {pendingImport ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm" onClick={() => setPendingImport(null)}>
          <div className="animate-pop-in w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-lift dark:border-stone-800 dark:bg-stone-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">Import {pendingImport.items.length} items?</h3>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Merge keeps your current data and adds the backup. Replace swaps everything (you can still Undo).
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPendingImport(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  s.importState(pendingImport, "merge");
                  setPendingImport(null);
                  toast("Backup merged.");
                }}
              >
                Merge
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  s.importState(pendingImport, "replace");
                  setPendingImport(null);
                  toast("Backup restored.", { label: "Undo", run: () => void s.undo() });
                }}
              >
                Replace
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmReset}
        title="Delete everything?"
        body="All items, goals, notes and settings will be erased. Export a backup first if unsure."
        confirmLabel="Delete everything"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          s.resetAll();
          setConfirmReset(false);
          toast("Everything deleted.", { label: "Undo", run: () => void s.undo() });
        }}
      />
    </div>
  );
}

const iconInput = inputClass.replace("w-full", "w-12 shrink-0 px-1 text-center");
const rowInput = inputClass.replace("w-full", "min-w-0 flex-1");

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
      {desc ? <p className="mb-4 mt-0.5 text-[13px] text-stone-500 dark:text-stone-400">{desc}</p> : <div className="mb-4" />}
      {children}
    </Card>
  );
}

function ColorPicker({ value, onChange }: { value: ColorKey; onChange: (c: ColorKey) => void }) {
  return (
    <div className="flex shrink-0 gap-1">
      {COLOR_KEYS.map((c) => (
        <button
          key={c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={cn("h-4 w-4 rounded-full transition", COLORS[c].dot, value === c ? "ring-2 ring-stone-800 ring-offset-1 dark:ring-stone-200 dark:ring-offset-stone-900" : "opacity-60 hover:opacity-100")}
        />
      ))}
    </div>
  );
}
