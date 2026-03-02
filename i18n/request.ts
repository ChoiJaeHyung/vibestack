import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const locales = ["ko", "en"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "ko";

function negotiateLocale(acceptLanguage: string | null): AppLocale {
  if (!acceptLanguage) return defaultLocale;
  const preferred = acceptLanguage
    .split(",")
    .map((part) => {
      const [lang, q] = part.trim().split(";q=");
      return {
        lang: lang.trim().split("-")[0].toLowerCase(),
        quality: q ? parseFloat(q) : 1.0,
      };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { lang } of preferred) {
    if (lang === "ko") return "ko";
    if (lang === "en") return "en";
  }
  return "en"; // 한국어가 아니면 영어 기본
}

// Namespace list — each maps to messages/{locale}/{name}.json
const NAMESPACES = [
  "Common",
  "Metadata",
  "Landing",
  "Auth",
  "Dashboard",
  "Projects",
  "Learning",
  "Settings",
  "Billing",
  "Tutor",
  "Guide",
  "NotFound",
  "Errors",
] as const;

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieLocale = cookieStore.get("locale")?.value;
  const locale: AppLocale =
    cookieLocale === "ko" || cookieLocale === "en"
      ? cookieLocale
      : negotiateLocale(headerStore.get("accept-language"));

  // Dynamically import all namespace files and merge
  const messages: Record<string, Record<string, string>> = {};
  for (const ns of NAMESPACES) {
    try {
      const mod = await import(`../messages/${locale}/${ns}.json`);
      messages[ns] = mod.default;
    } catch {
      // Fallback to ko if namespace file missing
      try {
        const fallback = await import(`../messages/ko/${ns}.json`);
        messages[ns] = fallback.default;
      } catch {
        messages[ns] = {};
      }
    }
  }

  return { locale, messages };
});
