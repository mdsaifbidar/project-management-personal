# Decision Inbox

A personal planning system: capture everything, decide what matters, plan it
down to the hour, and work on less. Works offline, syncs to your own Postgres
database, installs on your phone like an app.

> Capture everything. Decide what matters. Work on less.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no environment variables set it runs in
**browser-only mode** (data in this browser, no login).

## Put it online with a permanent database (free)

You need two free accounts: **Neon** (database) and **Vercel** (hosting).

1. **Database** — sign up at [neon.tech](https://neon.tech), create a project,
   then *Connect* → copy the **pooled** connection string
   (`postgres://…-pooler…/neondb?sslmode=require`).
2. **Secrets** — pick a sign-in password, and generate a random secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. **Deploy**:
   ```bash
   npx vercel login
   npx vercel link
   npx vercel env add DATABASE_URL production   # paste the Neon string
   npx vercel env add APP_PASSWORD production   # your password
   npx vercel env add AUTH_SECRET production    # the random secret
   npx vercel --prod
   ```
4. Open `https://<your-project>.vercel.app`, sign in. Tables are created
   automatically, and whatever this browser already had is uploaded on the
   first sign-in.

Locally, put the same three values in `.env.local` (see `.env.example`).
Any Postgres works (Supabase, Railway, Docker:
`docker run -e POSTGRES_PASSWORD=pw -p 5432:5432 postgres:16-alpine`).

### How sync works

- Every change is saved instantly in the browser, queued, and pushed to the
  database in the background (`/api/sync`). Offline edits wait in the queue and
  upload when you're back online.
- The app pulls the latest copy from the database when it opens, when you come
  back to the tab, and every minute — so phone and laptop stay in step.
- Status shows in the sidebar (phone: **More** sheet; or **Settings → Storage &
  sync**). Tap it to sync now.
- Changing `APP_PASSWORD` signs out every device.

### Managing the data

Each record is a row with its full JSON in `data` plus readable columns, so you
can browse and edit it in Neon's **SQL Editor** (or any Postgres client):

```sql
select title, status, scheduled_date, scheduled_time, due_date
from items where status <> 'DONE' order by scheduled_date nulls last;

select title, period, period_key from goals;
select id, data->>'notes' from notes order by id desc;      -- daily/weekly notes
select data from kv where id = 'settings';
```

Tables: `items`, `goals`, `notes`, `kv` (settings, running timer). Settings →
Data still exports JSON / CSV / calendar (.ics) backups — export one now and
then; Neon's free tier only keeps a short restore window.

## Install it on your phone

Open the site on your phone and choose **Add to Home Screen** (iPhone: Share
menu; Android: ⋮ menu or the install prompt). It opens full-screen like an app,
starts on Today, and keeps working offline. Scheduling on touch screens: use an
item's **•••** menu → **Pick date & time…** (drag-and-drop needs a mouse).

## Pickers

Dates, times, dropdowns and numbers use the app's own controls
(`components/pickers/`), not the browser's: a calendar with quick picks
(Today, This weekend, Next week…), dots on busy days, and typing ("fri",
"nov 15", "in 3 days"); a time list in 15-minute steps that shows end times
for the estimate and accepts "3pm" / "15:30"; searchable, keyboard-friendly
dropdowns; − / + number steppers. On phones they open as bottom sheets.

## What's inside

| Screen | What it does |
| --- | --- |
| **Home** | Quick capture, "what should I work on?", this week strip, today, coming up, active projects, goals |
| **Today** | Daily planner: stats vs. capacity, hourly timeline, overdue, Big 3, backlog to drag in, daily notes / mood / energy |
| **Planner** | Day / Week / Month / Year calendars. Drag to schedule, drag to move, resize blocks, click empty slots to create. Repeats show as dashed ghosts. Deep links: `/planner?view=month&date=2026-11-15` |
| **Focus** | One recommended task, checklist, Pomodoro / time tracking |
| **Inbox** | All active work, filter by project / area / tag / priority, group by status / project / priority / area |
| **Board** | Kanban (Later → Next → Now → Done, optional Idea Jail), drag between columns |
| **Projects** | Cards grouped by status or area, Gantt-style roadmap with milestones, templates |
| **Project page** | Why (goal / metric / linked goals), stats & pace, list or board view of tasks, duplicate, save as template |
| **Goals** | Year → quarter → month → week goals with numeric targets or roll-up from linked projects |
| **Review** | Day/week/month/quarter/year stats, charts, plan hit rate, streak, where the work went, reflection |
| **Done / Idea Jail** | History grouped by day; parked ideas with one-click promote to task or project |
| **Settings** | WIP limit, capacity, planner hours, week start, pomodoro, custom types, areas, tag colors, templates, import/export |

## The five states

| State | Meaning |
| --- | --- |
| **NOW** | Actively working on it |
| **NEXT** | Committed, coming up |
| **LATER** | Someday, not now |
| **IDEA JAIL** | Deliberately *not* working on it |
| **DONE** | Finished |

Projects in NOW are capped by the **WIP limit** (default 3, configurable). Try to
start one more and it asks which project to pause.

## Quick capture syntax

Type naturally in any capture box; recognised tokens are previewed as chips.

| Token | Meaning |
| --- | --- |
| `today`, `tmr`, `fri`, `next week`, `nov 15`, `in 3 days` | plan for that day |
| `due fri` | deadline |
| `3pm`, `15:30`, `at 9am` | time block |
| `30m`, `1h`, `1h30m` | estimate |
| `!1`–`!4`, `!urgent`, `!high`, `!low` | priority |
| `#tag` | tag |
| `@project` | link to a project (prefix match) |
| `+area` | life area |
| `daily`, `weekdays`, `weekly`, `every 2 weeks`, `monthly`, `yearly` | repeat |
| `>now`, `>next`, `>later`, `>jail` | status |

Example: `Write launch post fri 3pm #marketing !high @codetools 45m`

Undated captures go to Idea Jail (configurable); anything with a date or project
goes to Next.

## Planning model

- **Scheduled date + time** — when you plan to do it (shows on the calendar /
  time grid; length = estimate).
- **Due date** — hard deadline (shows as ⚑).
- **Recurring items** — completing one logs a Done copy and rolls the item to
  its next occurrence.
- **Checklists** — subtasks inside any item.
- **Time tracking** — ▶ on any item, or 🍅 Pomodoro from Focus; logs roll up to
  projects and reviews.
- **Big 3** — pick the three things that make a day (or week / month) a win.
- **Recommendation** — deterministic scoring, no AI: NOW, Big 3, overdue, due
  today, scheduled now, priority, active project. The reason is shown.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `N` | New task |
| `/` or `Ctrl K` | Search & command palette |
| `T` / `P` / `F` | Today / Planner / Focus |
| `G` then `H T P F I B O G R D J S` | Go to any screen |
| `Ctrl Z` | Undo |
| `?` | Shortcut help |
| `Ctrl Enter` | Save in the editor |
| `Esc` | Close dialog |

## Data

With a database configured, Postgres is the source of truth (see above) and
the browser keeps an offline copy. Without one, everything is stored **locally
in your browser** under one versioned key
(`decision-inbox:state:v2`): items, goals, notes and settings. Data from v1
(`decision-inbox:items:v1`) is migrated automatically. Corrupted or imported
data is sanitized before use.

Settings → Data offers **JSON backup / restore (merge or replace)**, **CSV
export**, and an **.ics calendar export** for Google / Apple / Outlook.

Persistence lives in [`lib/storage.ts`](lib/storage.ts) and all state changes
are pure functions in [`lib/actions.ts`](lib/actions.ts), so a real database or
sync layer can be swapped in without touching the UI.

## Project structure

```
app/                      one folder per screen (see table above)
components/
  planner/                TimeGrid (day/week), MonthView, YearView, Backlog,
                          BigThree, Journal, PeriodNav
  ItemCard, ItemModal, ItemActions, QuickCapture, FocusCard, Board,
  ProjectCard, ProjectTimeline, TemplatePicker, SearchOverlay (palette),
  TimerWidget, FilterBar, BarChart, primitives (Button, Card, Modal, ...)
lib/
  types.ts                Item / Goal / PeriodNote / Settings / AppState
  constants.ts            defaults, palette, sample data
  dates.ts                local date keys, periods, natural-date parsing
  parse.ts                quick-capture parser
  recurrence.ts           repeat rules
  actions.ts              pure state transitions
  selectors.ts            calendar entries, stats, goal progress, filters
  recommendation.ts       "what should I work on?" engine
  storage.ts              local persistence, migration, import/export
  sync.ts                 row-level diff, offline queue, push/pull
  store.tsx               React context + undo history + cloud sync
  server/db.ts            Postgres schema + snapshot/apply (API side)
  server/auth.ts          single-password session (HMAC cookie)
app/api/                  state (load), sync (save), auth/login, auth/logout
middleware.ts             locks every page + API behind the password
public/sw.js              offline app shell (PWA); app/manifest.ts
  useActions.ts           shared UI actions (WIP checks, toasts, undo)
  templates.ts            built-in project templates
```

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
```
