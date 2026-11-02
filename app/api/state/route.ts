import { NextResponse } from "next/server";
import { cloudEnabled, loadSnapshot } from "@/lib/server/db";
import { guardDataRoute } from "@/lib/server/guard";

export const dynamic = "force-dynamic";

/** Full snapshot of the owner's data, or {cloud:false} when no database is configured. */
export async function GET() {
  if (!cloudEnabled()) return NextResponse.json({ cloud: false });
  const blocked = await guardDataRoute();
  if (blocked) return blocked;
  try {
    return NextResponse.json({ cloud: true, ...(await loadSnapshot()) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("state load failed", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
