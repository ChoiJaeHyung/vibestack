import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { LandingNav } from "@/components/features/landing-nav";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

interface LegalSection {
  id: string;
  title: string;
  body: string;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Legal");
  return {
    title: t("privacy.title"),
    description: t("privacy.intro").slice(0, 160),
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations("Legal");
  const tLanding = await getTranslations("Landing");

  let userEmail: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  } catch {
    // auth 실패 시 비로그인 상태로 처리
  }

  const sections = t.raw("privacy.sections") as LegalSection[];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingNav userEmail={userEmail} />

      <main className="flex-1">
        {/* Header */}
        <section className="border-b border-border-default bg-bg-surface">
          <div className="mx-auto max-w-5xl px-6 py-12 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              {t("privacy.title")}
            </h1>
            <p className="mt-3 text-sm text-text-muted">
              {t("privacy.effectiveDate")} · {t("privacy.version")}
            </p>
          </div>
        </section>

        {/* Content */}
        <div className="mx-auto max-w-5xl px-6 py-12 lg:flex lg:gap-10">
          {/* TOC Sidebar — desktop only */}
          <aside className="hidden lg:block lg:w-56 lg:shrink-0">
            <nav className="sticky top-24 space-y-1.5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-faint">
                {t("common.toc")}
              </p>
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block text-[13px] leading-snug text-text-muted transition-colors hover:text-text-primary"
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <article className="prose max-w-none flex-1">
            <p className="lead">{t("privacy.intro")}</p>
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2>{s.title}</h2>
                {/* Static content from our own translation files — safe for dangerouslySetInnerHTML */}
                <div dangerouslySetInnerHTML={{ __html: s.body }} />
              </section>
            ))}
          </article>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-default">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-violet-400" />
              <span className="font-semibold text-text-primary">VibeUniv</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-text-muted">
              <Link
                href="/privacy"
                className="transition-colors hover:text-text-primary"
              >
                {tLanding("footer.privacy")}
              </Link>
              <Link
                href="/terms"
                className="transition-colors hover:text-text-primary"
              >
                {tLanding("footer.terms")}
              </Link>
              <a
                href="https://github.com/vibestack"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-text-primary"
              >
                GitHub
              </a>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-text-faint">
            {tLanding("footer.copyright")}
          </div>
        </div>
      </footer>
    </div>
  );
}
