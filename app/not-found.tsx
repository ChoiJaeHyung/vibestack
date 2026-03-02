import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Home, BookOpen } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("NotFound");
  return {
    title: t("metadata.title"),
  };
}

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      {/* Logo */}
      <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-glow-purple-md">
        <GraduationCap className="h-7 w-7 text-white" />
      </div>

      {/* 404 */}
      <h1 className="text-[120px] font-extrabold leading-none tracking-tighter text-text-primary/10 select-none sm:text-[160px]">
        404
      </h1>

      {/* Message */}
      <h2 className="mt-2 text-xl font-bold text-text-primary sm:text-2xl">
        {t("title")}
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-text-muted">
        {t("description").split("\n").map((line, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {line}
          </span>
        ))}
      </p>

      {/* Links */}
      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-glow-purple hover:shadow-glow-purple-lg hover:scale-[1.02] transition-all duration-300"
        >
          <Home className="h-4 w-4" />
          {t("home")}
        </Link>
        <Link
          href="/guide"
          className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-bg-input px-6 py-3 text-sm font-medium text-text-tertiary hover:bg-bg-surface-hover hover:border-border-hover transition-all duration-300"
        >
          <BookOpen className="h-4 w-4" />
          {t("guide")}
        </Link>
      </div>
    </div>
  );
}
