"use client";

/**
 * System notifications. Uses the service worker when available — required on
 * Android, where `new Notification()` throws — and falls back to the page API.
 */

export type NotifyPermission = NotificationPermission | "unsupported";

export function notifyPermission(): NotifyPermission {
  return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";
}

export async function requestNotifyPermission(): Promise<NotifyPermission> {
  if (notifyPermission() === "unsupported") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return notifyPermission();
  }
}

export async function showNotification(
  title: string,
  opts: { body?: string; tag?: string; url?: string } = {}
): Promise<boolean> {
  if (notifyPermission() !== "granted") return false;
  const options: NotificationOptions = {
    body: opts.body,
    tag: opts.tag,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: opts.url ?? "/today" },
  };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, options);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const n = new Notification(title, options);
    n.onclick = () => {
      window.focus();
      if (opts.url) window.location.assign(opts.url);
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}

/** Short two-tone chime (no audio files needed). */
export function chime(): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.18].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = i ? 880 : 660;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.4);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.45);
    });
  } catch {
    /* audio unavailable */
  }
}
