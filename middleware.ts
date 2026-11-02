import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, authEnabled, isValidSession } from "@/lib/server/auth";

/** Everything is private when APP_PASSWORD is set, except the login flow and static assets. */
export async function middleware(req: NextRequest) {
  if (!authEnabled()) return NextResponse.next();
  if (await isValidSession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|manifest.webmanifest|sw.js|icon|apple-icon|icons/|favicon).*)",
  ],
};
