"use client";

// No writable start date in Linear, so a planned start lives here instead --
// per-issue, in localStorage so it survives a reload.

import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "standup-gantt:plannedStart:";

function readAll(): Record<string, string | null> {
  if (typeof window === "undefined") return {};
  const result: Record<string, string | null> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      result[key.slice(STORAGE_PREFIX.length)] = window.localStorage.getItem(key);
    }
  }
  return result;
}

export function usePlannedStarts(): {
  plannedStarts: Record<string, string | null>;
  setPlannedStart: (issueId: string, date: string | null) => void;
} {
  const [plannedStarts, setPlannedStarts] = useState<Record<string, string | null>>({});

  useEffect(() => {
    setPlannedStarts(readAll());
  }, []);

  const setPlannedStart = useCallback((issueId: string, date: string | null) => {
    const key = STORAGE_PREFIX + issueId;
    if (date) {
      window.localStorage.setItem(key, date);
    } else {
      window.localStorage.removeItem(key);
    }
    setPlannedStarts((prev) => ({ ...prev, [issueId]: date }));
  }, []);

  return { plannedStarts, setPlannedStart };
}
