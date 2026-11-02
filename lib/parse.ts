import { parseDatePhrase } from "./dates";
import { Item, ItemStatus, Priority, Recurrence, RecurrenceFreq } from "./types";
import { slugTag } from "./utils";

export interface ParsedCapture {
  title: string;
  fields: Partial<Item>;
  /** Human-readable tokens that were recognised, for the live preview. */
  chips: { kind: string; label: string }[];
}

const PRIORITY_TOKENS: Record<string, Priority> = {
  "!1": "URGENT",
  "!urgent": "URGENT",
  "!2": "HIGH",
  "!high": "HIGH",
  "!3": "MEDIUM",
  "!med": "MEDIUM",
  "!medium": "MEDIUM",
  "!4": "LOW",
  "!low": "LOW",
};

const STATUS_TOKENS: Record<string, ItemStatus> = {
  ">now": "NOW",
  ">next": "NEXT",
  ">later": "LATER",
  ">jail": "JAIL",
};

const WEEKDAY =
  "mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday|sun|sunday";
const MONTH =
  "jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december";
const DATE_WORDS =
  "today|tod|tomorrow|tmr|tmrw|next week|next month|eow|eom|end of week|end of month|" +
  `(?:next )?(?:${WEEKDAY})|in \\d+ (?:days?|weeks?|months?)|` +
  `\\d{4}-\\d{2}-\\d{2}|(?:${MONTH}) \\d{1,2}|\\d{1,2} (?:${MONTH})`;

/**
 * Todoist-style quick-capture syntax. Example:
 *   "Write launch post fri 3pm #marketing !high @codetools 45m every week"
 *
 * - `today`, `tmr`, `fri`, `nov 15`, `in 3 days` → scheduled date
 * - `due fri` → due date
 * - `at 3pm`, `3:30pm`, `15:00` → time block
 * - `#tag` · `!1-4` / `!high` · `@project` · `+area` · `>now|next|later|jail`
 * - `30m`, `1h`, `1h30m` → estimate
 * - `daily`, `weekdays`, `weekly`, `monthly`, `yearly`, `every 2 weeks`
 */
export function parseCapture(
  input: string,
  ctx: {
    projects: Pick<Item, "id" | "title">[];
    areas: { id: string; name: string }[];
    weekStartsOn: 0 | 1;
  }
): ParsedCapture {
  let text = ` ${input} `;
  const fields: Partial<Item> = {};
  const chips: ParsedCapture["chips"] = [];
  const take = (re: RegExp, fn: (m: RegExpMatchArray) => boolean | void) => {
    text = text.replace(re, (...args) => {
      const m = args.slice(0, -2) as unknown as RegExpMatchArray;
      return fn(m) === false ? args[0] : " ";
    });
  };

  // Recurrence
  const recurrenceMap: Record<string, Recurrence> = {
    daily: { freq: "DAILY", interval: 1 },
    "every day": { freq: "DAILY", interval: 1 },
    weekdays: { freq: "WEEKDAYS", interval: 1 },
    "every weekday": { freq: "WEEKDAYS", interval: 1 },
    weekly: { freq: "WEEKLY", interval: 1 },
    "every week": { freq: "WEEKLY", interval: 1 },
    monthly: { freq: "MONTHLY", interval: 1 },
    "every month": { freq: "MONTHLY", interval: 1 },
    yearly: { freq: "YEARLY", interval: 1 },
    "every year": { freq: "YEARLY", interval: 1 },
  };
  take(/\severy (\d+) (day|week|month|year)s?(?=\s)/i, (m) => {
    const unit: Record<string, RecurrenceFreq> = {
      day: "DAILY",
      week: "WEEKLY",
      month: "MONTHLY",
      year: "YEARLY",
    };
    fields.recurrence = { freq: unit[m[2].toLowerCase()], interval: Number(m[1]) };
    chips.push({ kind: "repeat", label: m[0].trim() });
  });
  take(/\s(daily|weekdays|weekly|monthly|yearly|every (?:day|weekday|week|month|year))(?=\s)/i, (m) => {
    if (fields.recurrence) return false;
    fields.recurrence = recurrenceMap[m[1].toLowerCase()];
    chips.push({ kind: "repeat", label: m[1] });
  });

  // Due date
  take(new RegExp(`\\sdue (${DATE_WORDS})(?=\\s)`, "i"), (m) => {
    const key = parseDatePhrase(m[1], ctx.weekStartsOn);
    if (!key) return false;
    fields.dueDate = key;
    chips.push({ kind: "due", label: `due ${m[1]}` });
  });

  // Scheduled date
  take(new RegExp(`\\s(?:on )?(${DATE_WORDS})(?=\\s)`, "i"), (m) => {
    if (fields.scheduledDate) return false;
    const key = parseDatePhrase(m[1], ctx.weekStartsOn);
    if (!key) return false;
    fields.scheduledDate = key;
    chips.push({ kind: "date", label: m[1] });
  });

  // Time: "at 3pm", "3:30pm", "15:00"
  take(/\s(?:at )?(\d{1,2})(?::(\d{2}))?\s?(am|pm)(?=\s)|\s(?:at )?([01]?\d|2[0-3]):([0-5]\d)(?=\s)/i, (m) => {
    let h: number;
    let min: number;
    if (m[3]) {
      h = Number(m[1]) % 12 + (m[3].toLowerCase() === "pm" ? 12 : 0);
      min = Number(m[2] ?? 0);
    } else {
      h = Number(m[4]);
      min = Number(m[5]);
    }
    if (h > 23 || min > 59) return false;
    fields.scheduledTime = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    chips.push({ kind: "time", label: m[0].trim() });
  });

  // Estimate: 30m, 1h, 1h30m, 90min
  take(/\s(\d+(?:\.\d+)?)\s?(h|hr|hrs|hours?)(?:\s?(\d+)\s?(m|min|mins))?(?=\s)|\s(\d+)\s?(m|min|mins|minutes)(?=\s)/i, (m) => {
    const minutes = m[1]
      ? Math.round(Number(m[1]) * 60 + Number(m[3] ?? 0))
      : Number(m[5]);
    if (!minutes) return false;
    fields.estimatedMinutes = minutes;
    chips.push({ kind: "estimate", label: m[0].trim() });
  });

  // Priority
  take(/\s(![a-z0-9]+)(?=\s)/i, (m) => {
    const p = PRIORITY_TOKENS[m[1].toLowerCase()];
    if (!p) return false;
    fields.priority = p;
    chips.push({ kind: "priority", label: p.toLowerCase() });
  });

  // Status
  take(/\s(>[a-z]+)(?=\s)/i, (m) => {
    const s = STATUS_TOKENS[m[1].toLowerCase()];
    if (!s) return false;
    fields.status = s;
    chips.push({ kind: "status", label: s.toLowerCase() });
  });

  // Tags
  const tags: string[] = [];
  text = text.replace(/\s#([\p{L}\p{N}_-]+)(?=\s)/gu, (_, t: string) => {
    const tag = slugTag(t);
    if (tag && !tags.includes(tag)) tags.push(tag);
    return " ";
  });
  if (tags.length) {
    fields.tags = tags;
    tags.forEach((t) => chips.push({ kind: "tag", label: `#${t}` }));
  }

  // Project: @name (matches by slug prefix)
  take(/\s@([\p{L}\p{N}_-]+)(?=\s)/u, (m) => {
    const q = slugTag(m[1]);
    const project =
      ctx.projects.find((p) => slugTag(p.title) === q) ??
      ctx.projects.find((p) => slugTag(p.title).startsWith(q)) ??
      ctx.projects.find((p) => slugTag(p.title).replace(/-/g, "").startsWith(q.replace(/-/g, "")));
    if (!project) return false;
    fields.projectId = project.id;
    chips.push({ kind: "project", label: project.title });
  });

  // Area: +name
  take(/\s\+([\p{L}\p{N}_-]+)(?=\s)/u, (m) => {
    const q = slugTag(m[1]);
    const area = ctx.areas.find((a) => slugTag(a.name).startsWith(q));
    if (!area) return false;
    fields.areaId = area.id;
    chips.push({ kind: "area", label: area.name });
  });

  const title = text.replace(/\s+/g, " ").trim();
  return { title, fields, chips };
}
