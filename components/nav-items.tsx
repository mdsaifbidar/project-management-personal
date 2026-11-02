import {
  IconBoard,
  IconCalendar,
  IconChart,
  IconCheck,
  IconFlag,
  IconHome,
  IconInbox,
  IconLock,
  IconRocket,
  IconSettings,
  IconTarget,
  IconToday,
} from "./icons";

export interface NavItem {
  href: string;
  label: string;
  Icon: (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element;
  /** Single-key shortcut, pressed as "g" then this key. */
  key?: string;
}

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Plan",
    items: [
      { href: "/", label: "Home", Icon: IconHome, key: "h" },
      { href: "/today", label: "Today", Icon: IconToday, key: "t" },
      { href: "/planner", label: "Planner", Icon: IconCalendar, key: "p" },
      { href: "/focus", label: "Focus", Icon: IconTarget, key: "f" },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/inbox", label: "Inbox", Icon: IconInbox, key: "i" },
      { href: "/board", label: "Board", Icon: IconBoard, key: "b" },
      { href: "/projects", label: "Projects", Icon: IconRocket, key: "o" },
      { href: "/goals", label: "Goals", Icon: IconFlag, key: "g" },
    ],
  },
  {
    label: "Reflect",
    items: [
      { href: "/review", label: "Review", Icon: IconChart, key: "r" },
      { href: "/done", label: "Done", Icon: IconCheck, key: "d" },
      { href: "/jail", label: "Idea Jail", Icon: IconLock, key: "j" },
      { href: "/settings", label: "Settings", Icon: IconSettings, key: "s" },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
