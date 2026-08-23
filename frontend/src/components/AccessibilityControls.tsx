"use client";

import { useEffect, useRef, useState } from "react";
import { Accessibility, Minus, Plus, Contrast } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type TextSize = "normal" | "large" | "larger";
const sizes: TextSize[] = ["normal", "large", "larger"];

export function AccessibilityControls() {
  const { translate: t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [textSize, setTextSize] = useState<TextSize>("normal");
  const [highContrast, setHighContrast] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedSize = localStorage.getItem("a11y-text-size") as TextSize | null;
    const savedContrast = localStorage.getItem("a11y-high-contrast") === "true";
    if (savedSize && sizes.includes(savedSize)) setTextSize(savedSize);
    setHighContrast(savedContrast);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.textSize = textSize;
    document.documentElement.dataset.highContrast = String(highContrast);
    localStorage.setItem("a11y-text-size", textSize);
    localStorage.setItem("a11y-high-contrast", String(highContrast));
  }, [textSize, highContrast]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const adjustText = (direction: number) => {
    const next = Math.min(sizes.length - 1, Math.max(0, sizes.indexOf(textSize) + direction));
    setTextSize(sizes[next]);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t('Accessibility settings')}
        aria-expanded={open}
        aria-controls="accessibility-menu"
        className="w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
      >
        <Accessibility className="w-4 h-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          id="accessibility-menu"
          role="dialog"
          aria-label={t('Accessibility settings')}
          className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-xl"
        >
          <p className="text-sm font-bold text-slate-800 dark:text-white">{t('Accessibility')}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-sm text-slate-600 dark:text-slate-300">{t('Text size')}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => adjustText(-1)} disabled={textSize === "normal"} aria-label={t('Decrease text size')} className="a11y-icon-button">
                <Minus className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => adjustText(1)} disabled={textSize === "larger"} aria-label={t('Increase text size')} className="a11y-icon-button">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHighContrast((value) => !value)}
            aria-pressed={highContrast}
            className="mt-3 w-full flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
          >
            <span className="flex items-center gap-2"><Contrast className="w-4 h-4" /> {t('High contrast')}</span>
            <span aria-hidden="true">{t(highContrast ? "On" : "Off")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
