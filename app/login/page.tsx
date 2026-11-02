"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.replace("/today");
        return;
      }
      setError(res.status === 401 ? "Wrong password." : "Couldn't sign in. Try again.");
    } catch {
      setError("You're offline.");
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <form onSubmit={submit} className="animate-pop-in w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-lift dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900">◆</span>
          <div>
            <h1 className="text-base font-semibold text-stone-900 dark:text-stone-100">Decision Inbox</h1>
            <p className="text-[12px] text-stone-400">Private. Enter your password.</p>
          </div>
        </div>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mt-5 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 outline-none focus:border-stone-400 focus:ring-4 focus:ring-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:focus:ring-stone-800"
        />
        {error ? <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-4 w-full rounded-xl bg-stone-900 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
