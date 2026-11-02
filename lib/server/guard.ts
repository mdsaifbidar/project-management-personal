import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, authEnabled, isValidSession } from "./auth";

/**
 * Checked inside every data route, not only in middleware — the database must
 * never depend on a single layer. Returns a response to send when blocked.
 */
export async function guardDataRoute(): Promise<NextResponse | null> {
  // A deployed database without a password would be readable by anyone.
  if (!authEnabled() && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Server misconfigured: set APP_PASSWORD to enable the database." },
      { status: 503 }
    );
  }
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await isValidSession(token))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
