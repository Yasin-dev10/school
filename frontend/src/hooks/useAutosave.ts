"use client";

import { useEffect, useRef, useState } from "react";

export function useAutosave<T>(key: string, value: T, enabled = true, delay = 600) {
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(value));
      setSavedAt(new Date());
    }, delay);
    return () => window.clearTimeout(timer);
  }, [delay, enabled, key, value]);

  const loadDraft = (): T | null => {
    try {
      const draft = localStorage.getItem(key);
      return draft ? JSON.parse(draft) as T : null;
    } catch {
      return null;
    }
  };

  const clearDraft = () => localStorage.removeItem(key);
  return { savedAt, loadDraft, clearDraft };
}
