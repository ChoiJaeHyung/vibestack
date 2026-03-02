"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

function getCookieLocale(): "ko" | "en" {
  const match = document.cookie.match(/(?:^|;\s*)locale=(\w+)/);
  return match?.[1] === "en" ? "en" : "ko";
}

export function LocaleToggle() {
  const router = useRouter();
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!mounted) {
    return <div className="h-8 w-8" />;
  }

  const current = getCookieLocale();
  const next = current === "ko" ? "en" : "ko";

  function handleToggle() {
    document.cookie = `locale=${next}; path=/; samesite=lax; max-age=31536000`;
    router.refresh();
  }

  return (
    <button
      onClick={handleToggle}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold text-text-muted hover:text-text-primary hover:bg-bg-surface-hover transition-colors"
      aria-label={`Switch to ${next === "en" ? "English" : "Korean"}`}
    >
      {next.toUpperCase()}
    </button>
  );
}
