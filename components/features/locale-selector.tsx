"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateUserLocale } from "@/server/actions/learning";
import type { Locale } from "@/types/database";

interface LocaleSelectorProps {
  currentLocale: Locale;
}

const LOCALE_OPTIONS = [
  { value: "ko" as const, label: "한국어", desc: "Korean" },
  { value: "en" as const, label: "English", desc: "영어" },
] as const;

export function LocaleSelector({ currentLocale }: LocaleSelectorProps) {
  const t = useTranslations("Settings");
  const [selected, setSelected] = useState<Locale>(currentLocale);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSelect(value: Locale) {
    if (value === selected || isPending) return;
    setSelected(value);
    setSaved(false);

    startTransition(async () => {
      const result = await updateUserLocale(value);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-text-secondary">
          {t("locale.label")}
        </p>
        {saved && (
          <span className="text-xs text-green-500 font-medium">
            {t("locale.saved")}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {LOCALE_OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={isPending}
              onClick={() => handleSelect(opt.value)}
              className={`relative rounded-xl border px-3 py-3 text-center transition-all ${
                isSelected
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-border-default bg-bg-surface hover:border-border-hover"
              } ${isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <p className={`text-sm font-semibold ${isSelected ? "text-violet-400" : "text-text-primary"}`}>
                {opt.label}
              </p>
              <p className={`text-[10px] mt-0.5 ${isSelected ? "text-violet-400/70" : "text-text-dim"}`}>
                {opt.desc}
              </p>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-text-dim">
        {t("locale.notice")}
      </p>
    </div>
  );
}
