"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  const nextLanguage = language === "en" ? "Somali" : "English";

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={`Switch language to ${nextLanguage}`}
      title={`Switch to ${nextLanguage}`}
      className="h-9 px-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-slate-600 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700"
    >
      <Languages className="w-4 h-4" />
      <span className="text-xs font-bold uppercase">{language === "en" ? "SO" : "EN"}</span>
    </button>
  );
}
