/**
 * Single-owner password auth. Set APP_PASSWORD (and optionally AUTH_SECRET)
 * in the environment. The session cookie holds an HMAC derived from both, so
 * changing the password signs every device out. Uses Web Crypto so it runs in
 * middleware (edge) and route handlers alike.
 */

export const SESSION_COOKIE = "di_session";
export const SESSION_DAYS = 180;

export function authEnabled(): boolean {
  return !!process.env.APP_PASSWORD;
}

const enc = new TextEncoder();

async function hmac(message: string): Promise<string> {
  const secret = `${process.env.AUTH_SECRET ?? ""}:${process.env.APP_PASSWORD ?? ""}`;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function sessionToken(): Promise<string> {
  return hmac("decision-inbox-session-v1");
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!authEnabled()) return true;
  if (!token) return false;
  return safeEqual(token, await sessionToken());
}

export async function checkPassword(input: string): Promise<boolean> {
  if (!authEnabled()) return true;
  // Compare digests so timing doesn't leak the password length.
  const [a, b] = await Promise.all([hmac(`pw:${input}`), hmac(`pw:${process.env.APP_PASSWORD}`)]);
  return safeEqual(a, b);
}
