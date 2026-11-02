/** Item type ids are customizable in Settings (TASK, PROJECT, IDEA, ... + your own). */
export type ItemType = string;

export type ItemStatus = "NOW" | "NEXT" | "LATER" | "JAIL" | "DONE";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type ColorKey =
  | "stone"
  | "rose"
  | "orange"
  | "amber"
  | "emerald"
  | "teal"
  | "sky"
  | "indigo"
  | "violet"
  | "pink";

export type RecurrenceFreq =
  | "DAILY"
  | "WEEKDAYS"
  | "WEEKLY"
  | "MONTHLY"
  | "YEARLY";

export interface Recurrence {
  freq: RecurrenceFreq;
  /** Every N days / weeks / months / years. Ignored for WEEKDAYS. */
  interval: number;
}

export interface ChecklistEntry {
  id: string;
  text: string;
  done: boolean;
}

export interface TimeLog {
  start: string;
  end: string;
  minutes: number;
}

export interface Item {
  id: string;
  title: string;
  description?: string;
  type: ItemType;
  status: ItemStatus;
  priority: Priority;
  estimatedMinutes?: number;
  projectId?: string;
  areaId?: string;
  tags: string[];

  // Planning — all dates are local "YYYY-MM-DD" keys.
  /** The day you plan to do it. */
  scheduledDate?: string;
  /** Optional "HH:MM" time block on the scheduled day. */
  scheduledTime?: string;
  /** Hard deadline. */
  dueDate?: string;
  /** Projects: timeline start. */
  startDate?: string;
  recurrence?: Recurrence;

  // Projects
  goal?: string;
  successMetric?: string;
  color?: ColorKey;

  checklist: ChecklistEntry[];
  timeLogs: TimeLog[];

  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type NewItem = Partial<Item> & { title: string };

export type GoalPeriod = "YEAR" | "QUARTER" | "MONTH" | "WEEK";

export interface Goal {
  id: string;
  title: string;
  description?: string;
  period: GoalPeriod;
  /** "2026" | "2026-Q4" | "2026-11" | "2026-W45" */
  periodKey: string;
  /** Optional numeric key result, e.g. 1000 visitors. */
  target?: number;
  current?: number;
  unit?: string;
  /** Linked project / item ids — their progress rolls up into the goal. */
  linkedIds: string[];
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Notes + reflection for any period: a day, week, month, quarter or year. */
export interface PeriodNote {
  key: string;
  /** Up to three item ids picked as the most important for the period. */
  bigThree: string[];
  notes: string;
  wins: string;
  improve: string;
  /** 1–5 */
  mood?: number;
  energy?: number;
}

export interface TypeDef {
  id: string;
  label: string;
  icon: string;
}

export interface Area {
  id: string;
  name: string;
  icon: string;
  color: ColorKey;
}

export interface TemplateTask {
  title: string;
  /** Days after the project start to schedule this task. */
  offsetDays?: number;
  estimatedMinutes?: number;
  priority?: Priority;
  checklist?: string[];
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  builtin?: boolean;
  project: {
    description?: string;
    goal?: string;
    successMetric?: string;
    priority: Priority;
    color?: ColorKey;
    /** Project length in days, used to set a due date. */
    durationDays?: number;
  };
  tasks: TemplateTask[];
}

export interface ReminderSettings {
  enabled: boolean;
  /** Minutes before a task's start time; 0 = only at start. */
  leadMinutes: number;
  /** Also notify at the start time itself. */
  atStart: boolean;
  /** Morning summary of today's plan. */
  digest: boolean;
  /** "HH:MM" */
  digestTime: string;
}

export interface Settings {
  reminders: ReminderSettings;
  wipLimit: number;
  enforceWip: boolean;
  types: TypeDef[];
  areas: Area[];
  tagColors: Record<string, ColorKey>;
  weekStartsOn: 0 | 1;
  dailyCapacityMinutes: number;
  dayStartHour: number;
  dayEndHour: number;
  pomodoroWork: number;
  pomodoroBreak: number;
  /** Where Quick Capture sends items that have no date. */
  captureStatus: ItemStatus;
  templates: Template[];
}

export interface ActiveTimer {
  itemId: string;
  start: string;
  mode: "track" | "pomodoro";
  phase: "work" | "break";
  /** Pomodoro: when the current phase ends (ISO). */
  endsAt?: string;
}

export interface AppState {
  version: 2;
  items: Item[];
  goals: Goal[];
  notes: Record<string, PeriodNote>;
  settings: Settings;
  timer?: ActiveTimer;
}
