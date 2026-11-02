import { PRIORITY_WEIGHT } from "./constants";
import { Item } from "./types";

export interface Recommendation {
  item: Item | null;
  reason: string;
}

const EMPTY_REASON =
  "You're clear. Capture something or enjoy the empty space.";

/**
 * Deterministic "what should I work on right now?" logic. No AI.
 *
 * Candidates are NOW and NEXT items (never DONE, JAIL, or projects), skipping
 * anything scheduled for a future day. Each gets a transparent score:
 *
 *   NOW status .............. +100
 *   In today's Big 3 ........ +60
 *   Overdue ................. +55
 *   Due today ............... +45
 *   Scheduled today ......... +35 (+10 if its time block has started)
 *   Priority ................ +10 × weight (LOW 1 … URGENT 4)
 *   Part of an active project +8
 *
 * Ties go to the shorter estimate, then the most recently touched.
 */
export function recommend(
  items: Item[],
  ctx: { today: string; nowTime?: string; bigThree?: string[] }
): Recommendation {
  const { today, nowTime = "", bigThree = [] } = ctx;
  const activeProjects = new Set(
    items.filter((i) => i.type === "PROJECT" && i.status === "NOW").map((i) => i.id)
  );

  const scored = items
    .filter(
      (i) =>
        (i.status === "NOW" || i.status === "NEXT") &&
        i.type !== "PROJECT" &&
        !(i.scheduledDate && i.scheduledDate > today)
    )
    .map((item) => {
      const why: string[] = [];
      let score = 0;
      if (item.status === "NOW") {
        score += 100;
        why.push("it's already active");
      }
      if (bigThree.includes(item.id)) {
        score += 60;
        why.push("it's in today's Big 3");
      }
      if (item.dueDate && item.dueDate < today) {
        score += 55;
        why.push("it's overdue");
      } else if (item.dueDate === today) {
        score += 45;
        why.push("it's due today");
      }
      if (item.scheduledDate === today) {
        score += 35;
        if (item.scheduledTime && item.scheduledTime <= nowTime) {
          score += 10;
          why.push("its time block has started");
        } else {
          why.push("you planned it for today");
        }
      } else if (item.scheduledDate && item.scheduledDate < today) {
        score += 30;
        why.push("it slipped from an earlier day");
      }
      score += PRIORITY_WEIGHT[item.priority] * 10;
      if (item.priority === "URGENT") why.push("it's urgent");
      else if (item.priority === "HIGH") why.push("it's high priority");
      if (item.projectId && activeProjects.has(item.projectId)) {
        score += 8;
        why.push("it moves an active project");
      }
      return { item, score, why };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const at = a.item.estimatedMinutes ?? Number.MAX_SAFE_INTEGER;
      const bt = b.item.estimatedMinutes ?? Number.MAX_SAFE_INTEGER;
      if (at !== bt) return at - bt;
      return b.item.updatedAt.localeCompare(a.item.updatedAt);
    });

  const top = scored[0];
  if (!top) return { item: null, reason: EMPTY_REASON };

  const why = top.why.slice(0, 3);
  if (top.item.estimatedMinutes && top.item.estimatedMinutes <= 60) {
    why.push("it fits in one focused session");
  } else if (why.length === 0) {
    why.push("it's the top of your Next list");
  }
  const sentence =
    why.length > 1 ? `${why.slice(0, -1).join(", ")} and ${why[why.length - 1]}` : why[0];
  return { item: top.item, reason: `Because ${sentence}.` };
}

export function priorityLabel(item: Item): string {
  switch (item.priority) {
    case "URGENT":
      return "Urgent";
    case "HIGH":
      return "High impact";
    case "MEDIUM":
      return "Medium impact";
    default:
      return "Low impact";
  }
}
