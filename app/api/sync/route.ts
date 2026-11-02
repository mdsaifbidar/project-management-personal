import { NextResponse } from "next/server";
import { SyncOp, SyncTable, applyOps, cloudEnabled } from "@/lib/server/db";
import { guardDataRoute } from "@/lib/server/guard";

export const dynamic = "force-dynamic";

const TABLES: SyncTable[] = ["items", "goals", "notes", "kv"];
const MAX_OPS = 5000;
const MAX_BYTES = 5_000_000;

function isOp(o: unknown): o is SyncOp {
  if (!o || typeof o !== "object") return false;
  const r = o as Record<string, unknown>;
  return (
    TABLES.includes(r.t as SyncTable) &&
    typeof r.id === "string" &&
    r.id.length > 0 &&
    r.id.length <= 200 &&
    (r.data === null || (typeof r.data === "object" && !Array.isArray(r.data)))
  );
}

/** Apply a batch of changes from a client. */
export async function POST(req: Request) {
  if (!cloudEnabled()) return NextResponse.json({ error: "No database configured" }, { status: 400 });
  const blocked = await guardDataRoute();
  if (blocked) return blocked;
  const text = await req.text();
  if (text.length > MAX_BYTES) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const ops = (body as { ops?: unknown })?.ops;
  if (!Array.isArray(ops) || ops.length > MAX_OPS || !ops.every(isOp)) {
    return NextResponse.json({ error: "Invalid ops" }, { status: 400 });
  }
  try {
    await applyOps(ops);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("sync failed", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
