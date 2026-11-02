import { NextResponse } from "next/server";
import { cloudEnabled, loadSnapshot } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** Full snapshot of the owner's data, or {cloud:false} when no database is configured. */
export async function GET() {
  if (!cloudEnabled()) return NextResponse.json({ cloud: false });
  try {
    return NextResponse.json({ cloud: true, ...(await loadSnapshot()) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("state load failed", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
