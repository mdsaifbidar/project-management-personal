import { addDays, todayKey } from "./dates";
import {
  AppState,
  ColorKey,
  Item,
  ItemStatus,
  Priority,
  RecurrenceFreq,
  Settings,
  TypeDef,
} from "./types";

export const STATE_KEY = "decision-inbox:state:v2";
/** v1 stored a bare item array here; it is migrated on first load. */
export const LEGACY_ITEMS_KEY = "decision-inbox:items:v1";
export const THEME_KEY = "decision-inbox:theme:v1";
export const SEED_FLAG_KEY = "decision-inbox:seeded:v1";

export const ITEM_STATUSES: ItemStatus[] = ["NOW", "NEXT", "LATER", "JAIL", "DONE"];

export const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export const PRIORITY_WEIGHT: Record<Priority, number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export const STATUS_LABEL: Record<ItemStatus, string> = {
  NOW: "Now",
  NEXT: "Next",
  LATER: "Later",
  JAIL: "Idea Jail",
  DONE: "Done",
};

export const RECURRENCE_LABEL: Record<RecurrenceFreq, string> = {
  DAILY: "day",
  WEEKDAYS: "weekday",
  WEEKLY: "week",
  MONTHLY: "month",
  YEARLY: "year",
};

/** The built-in types. PROJECT is special (has tasks, goal, WIP limit). */
export const DEFAULT_TYPES: TypeDef[] = [
  { id: "TASK", label: "Task", icon: "✓" },
  { id: "PROJECT", label: "Project", icon: "🚀" },
  { id: "IDEA", label: "Idea", icon: "💡" },
  { id: "LEARNING", label: "Learning", icon: "📚" },
  { id: "PERSONAL", label: "Personal", icon: "🌱" },
  { id: "MILESTONE", label: "Milestone", icon: "🏁" },
  { id: "HABIT", label: "Habit", icon: "🔁" },
];

export const CORE_TYPE_IDS = ["TASK", "PROJECT", "IDEA"];

/**
 * Color palette. Class strings are written out in full so Tailwind can see
 * them (lib/ is in tailwind's content globs).
 */
export const COLORS: Record<
  ColorKey,
  { dot: string; soft: string; bar: string; ring: string }
> = {
  stone: {
    dot: "bg-stone-400",
    soft: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
    bar: "bg-stone-500",
    ring: "border-l-stone-400",
  },
  rose: {
    dot: "bg-rose-500",
    soft: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
    bar: "bg-rose-500",
    ring: "border-l-rose-500",
  },
  orange: {
    dot: "bg-orange-500",
    soft: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
    bar: "bg-orange-500",
    ring: "border-l-orange-500",
  },
  amber: {
    dot: "bg-amber-500",
    soft: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    bar: "bg-amber-500",
    ring: "border-l-amber-500",
  },
  emerald: {
    dot: "bg-emerald-500",
    soft: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    bar: "bg-emerald-500",
    ring: "border-l-emerald-500",
  },
  teal: {
    dot: "bg-teal-500",
    soft: "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300",
    bar: "bg-teal-500",
    ring: "border-l-teal-500",
  },
  sky: {
    dot: "bg-sky-500",
    soft: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
    bar: "bg-sky-500",
    ring: "border-l-sky-500",
  },
  indigo: {
    dot: "bg-indigo-500",
    soft: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
    bar: "bg-indigo-500",
    ring: "border-l-indigo-500",
  },
  violet: {
    dot: "bg-violet-500",
    soft: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
    bar: "bg-violet-500",
    ring: "border-l-violet-500",
  },
  pink: {
    dot: "bg-pink-500",
    soft: "bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300",
    bar: "bg-pink-500",
    ring: "border-l-pink-500",
  },
};

export const COLOR_KEYS = Object.keys(COLORS) as ColorKey[];

export const DEFAULT_SETTINGS: Settings = {
  wipLimit: 3,
  enforceWip: true,
  types: DEFAULT_TYPES,
  areas: [
    { id: "area-work", name: "Work", icon: "💼", color: "sky" },
    { id: "area-growth", name: "Growth", icon: "📈", color: "violet" },
    { id: "area-life", name: "Life", icon: "🏡", color: "emerald" },
  ],
  tagColors: { seo: "teal", marketing: "orange", career: "indigo" },
  weekStartsOn: 1,
  dailyCapacityMinutes: 360,
  dayStartHour: 7,
  dayEndHour: 22,
  pomodoroWork: 25,
  pomodoroBreak: 5,
  captureStatus: "JAIL",
  templates: [],
};

export const EMPTY_STATES = {
  focus: "Nothing needs your attention right now.",
  inbox: "Your active list is empty.",
  jail: "No imprisoned ideas. Suspiciously productive.",
  done: "Nothing completed in this period.",
  projects: "No projects yet. Promote an idea when one earns it.",
  clear: "You're clear. Capture something or enjoy the empty space.",
  day: "Nothing planned. Drag something in or pick your Big 3.",
  goals: "No goals for this period yet.",
};

/**
 * Sample data, loaded once on first launch. Dates are relative to today so the
 * planner always has something to show. Remove with "Clear sample data".
 */
export function buildSampleState(): AppState {
  const t = todayKey();
  const ts = new Date().toISOString();
  const base = { tags: [], checklist: [], timeLogs: [], createdAt: ts, updatedAt: ts };
  const items: Item[] = [
    {
      ...base,
      id: "seed-project-cts",
      title: "CodeToolsStudio",
      description: "Directory of small, fast developer tools.",
      type: "PROJECT",
      status: "NOW",
      priority: "HIGH",
      areaId: "area-work",
      color: "sky",
      goal: "Make ₹50,000/month from CodeToolsStudio.",
      successMetric: "1,000 monthly organic visitors.",
      startDate: addDays(t, -14),
      dueDate: addDays(t, 40),
    },
    {
      ...base,
      id: "seed-task-seo",
      title: "Improve CodeToolsStudio SEO",
      description: "Add metadata, sitemap, and 5 keyword landing pages.",
      type: "TASK",
      status: "NOW",
      priority: "HIGH",
      estimatedMinutes: 90,
      projectId: "seed-project-cts",
      tags: ["seo"],
      scheduledDate: t,
      scheduledTime: "09:30",
      checklist: [
        { id: "c1", text: "Meta titles + descriptions", done: true },
        { id: "c2", text: "Generate sitemap.xml", done: false },
        { id: "c3", text: "5 keyword landing pages", done: false },
      ],
    },
    {
      ...base,
      id: "seed-task-homepage",
      title: "Improve homepage",
      type: "TASK",
      status: "NEXT",
      priority: "MEDIUM",
      estimatedMinutes: 60,
      projectId: "seed-project-cts",
      scheduledDate: addDays(t, 1),
    },
    {
      ...base,
      id: "seed-task-directories",
      title: "Submit to directories",
      type: "TASK",
      status: "NEXT",
      priority: "LOW",
      estimatedMinutes: 30,
      projectId: "seed-project-cts",
      tags: ["marketing"],
      scheduledDate: addDays(t, 3),
    },
    {
      ...base,
      id: "seed-task-launch-post",
      title: "Write launch post",
      type: "TASK",
      status: "LATER",
      priority: "MEDIUM",
      estimatedMinutes: 45,
      projectId: "seed-project-cts",
      tags: ["marketing"],
      dueDate: addDays(t, 10),
    },
    {
      ...base,
      id: "seed-milestone",
      title: "Public launch",
      type: "MILESTONE",
      status: "NEXT",
      priority: "HIGH",
      projectId: "seed-project-cts",
      dueDate: addDays(t, 21),
    },
    {
      ...base,
      id: "seed-jobs",
      title: "Apply to 3 jobs",
      description: "Tailor CV, write short cover notes.",
      type: "TASK",
      status: "NEXT",
      priority: "HIGH",
      estimatedMinutes: 60,
      areaId: "area-work",
      tags: ["career"],
      scheduledDate: t,
      scheduledTime: "14:00",
    },
    {
      ...base,
      id: "seed-review",
      title: "Weekly review",
      type: "HABIT",
      status: "NEXT",
      priority: "MEDIUM",
      estimatedMinutes: 30,
      recurrence: { freq: "WEEKLY", interval: 1 },
      scheduledDate: addDays(t, (7 - new Date().getDay()) % 7),
    },
    {
      ...base,
      id: "seed-learning",
      title: "Study agentic workflows",
      type: "LEARNING",
      status: "LATER",
      priority: "MEDIUM",
      estimatedMinutes: 45,
      areaId: "area-growth",
    },
    {
      ...base,
      id: "seed-personal",
      title: "Organize weekend tasks",
      type: "PERSONAL",
      status: "LATER",
      priority: "LOW",
      estimatedMinutes: 20,
      areaId: "area-life",
    },
    ...[
      "Build accidental action detector",
      "Create AI course",
      "Build digital waste manager",
      "Build an AI resume analyzer",
    ].map(
      (title, i): Item => ({
        ...base,
        id: `seed-jail-${i + 1}`,
        title,
        type: "IDEA",
        status: "JAIL",
        priority: i === 2 ? "LOW" : "MEDIUM",
      })
    ),
  ];

  const year = t.slice(0, 4);
  return {
    version: 2,
    items,
    goals: [
      {
        id: "seed-goal-year",
        title: "Build a side income that covers rent",
        period: "YEAR",
        periodKey: year,
        target: 50000,
        current: 8000,
        unit: "₹/month",
        linkedIds: ["seed-project-cts"],
        done: false,
        createdAt: ts,
        updatedAt: ts,
      },
    ],
    notes: {},
    settings: DEFAULT_SETTINGS,
  };
}

export const SAMPLE_ID_PREFIX = "seed-";

export const DEFAULT_PRIORITY: Priority = "MEDIUM";
