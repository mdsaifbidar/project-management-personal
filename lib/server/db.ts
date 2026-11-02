import postgres from "postgres";

/**
 * Postgres access (Neon, Supabase, local Docker — any Postgres works).
 * Each record is stored as JSONB with a few generated columns, so the data is
 * easy to browse and query in any SQL console:
 *
 *   select title, status, scheduled_date from items order by scheduled_date;
 */

export type SyncTable = "items" | "goals" | "notes" | "kv";

export interface SyncOp {
  t: SyncTable;
  id: string;
  /** null = delete */
  data: unknown | null;
}

let client: postgres.Sql | null = null;
let schemaReady: Promise<void> | null = null;

export function cloudEnabled(): boolean {
  return !!process.env.DATABASE_URL;
}

function sql(): postgres.Sql {
  if (!client) {
    // prepare:false keeps it compatible with connection poolers (Neon/Supabase).
    client = postgres(process.env.DATABASE_URL!, { max: 3, idle_timeout: 20, prepare: false });
  }
  return client;
}

const SCHEMA = `
create table if not exists items (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  title text generated always as (data->>'title') stored,
  type text generated always as (data->>'type') stored,
  status text generated always as (data->>'status') stored,
  priority text generated always as (data->>'priority') stored,
  project_id text generated always as (data->>'projectId') stored,
  scheduled_date text generated always as (data->>'scheduledDate') stored,
  scheduled_time text generated always as (data->>'scheduledTime') stored,
  due_date text generated always as (data->>'dueDate') stored
);
create index if not exists items_status_idx on items (status);
create index if not exists items_project_idx on items (project_id);
create index if not exists items_scheduled_idx on items (scheduled_date);

create table if not exists goals (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  title text generated always as (data->>'title') stored,
  period text generated always as (data->>'period') stored,
  period_key text generated always as (data->>'periodKey') stored
);

create table if not exists notes (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists kv (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
`;

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = sql()
      .unsafe(SCHEMA)
      .then(() => undefined)
      .catch((e) => {
        schemaReady = null;
        throw e;
      });
  }
  return schemaReady;
}

export interface Snapshot {
  items: unknown[];
  goals: unknown[];
  notes: Record<string, unknown>;
  kv: Record<string, unknown>;
  /** Changes whenever any row changes; lets clients skip no-op refreshes. */
  rev: string;
}

export async function loadSnapshot(): Promise<Snapshot> {
  await ensureSchema();
  const db = sql();
  const [items, goals, notes, kv, rev] = await Promise.all([
    db`select data from items`,
    db`select data from goals`,
    db`select id, data from notes`,
    db`select id, data from kv`,
    db`select coalesce(max(m), 'epoch')::text as rev, sum(c)::text as n from (
         select max(updated_at) m, count(*) c from items union all
         select max(updated_at), count(*) from goals union all
         select max(updated_at), count(*) from notes union all
         select max(updated_at), count(*) from kv) t`,
  ]);
  return {
    items: items.map((r) => r.data),
    goals: goals.map((r) => r.data),
    notes: Object.fromEntries(notes.map((r) => [r.id, r.data])),
    kv: Object.fromEntries(kv.map((r) => [r.id, r.data])),
    rev: `${rev[0].rev}#${rev[0].n ?? 0}`,
  };
}

const TABLES: SyncTable[] = ["items", "goals", "notes", "kv"];

/** Apply a batch of upserts/deletes atomically. */
export async function applyOps(ops: SyncOp[]): Promise<void> {
  await ensureSchema();
  await sql().begin(async (tx) => {
    for (const t of TABLES) {
      const forTable = ops.filter((o) => o.t === t);
      // Last op per id wins.
      const latest = new Map<string, SyncOp>();
      for (const o of forTable) latest.set(o.id, o);
      const upserts = Array.from(latest.values()).filter((o) => o.data !== null);
      const deletes = Array.from(latest.values()).filter((o) => o.data === null).map((o) => o.id);
      if (upserts.length) {
        const rows = upserts.map((o) => ({ id: o.id, data: o.data })) as unknown as postgres.JSONValue;
        await tx`
          insert into ${tx(t)} (id, data)
          select x->>'id', x->'data' from jsonb_array_elements(${tx.json(rows)}) x
          on conflict (id) do update set data = excluded.data, updated_at = now()
          where ${tx(t)}.data is distinct from excluded.data`;
      }
      if (deletes.length) {
        await tx`delete from ${tx(t)} where id in ${tx(deletes)}`;
      }
    }
  });
}
