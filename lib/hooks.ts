"use client";

import { useEffect, useState } from "react";
import { toKey } from "./dates";

/** Current time, re-rendering every `ms`. */
export function useNow(ms = 30000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** Today's key; rolls over at midnight. */
export function useToday(): string {
  return toKey(useNow(60000));
}

/** True while a CSS media query matches (e.g. phones). */
export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

/** A per-browser UI preference (remembered view, filter, ...). */
export function usePref<T>(key: string, initial: T): [T, (v: T) => void] {
  const storageKey = `decision-inbox:pref:${key}`;
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw !== null) setValue(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [storageKey]);
  const set = (v: T) => {
    setValue(v);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  };
  return [value, set];
}
