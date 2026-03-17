import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  GraduationCap,
  Layers,
  Code2,
  Brain,
  MessageCircleQuestion,
  Trophy,
  Cpu,
  ArrowRight,
  Sparkles,
  Target,
} from "lucide-react";
import { getPublicLearningPaths } from "@/server/actions/public-learning";
import { getTranslations } from "next-intl/server";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Public");
  return {
    title: t("learn.metaTitle"),
    description: t("learn.metaDescription"),
    openGraph: {
      title: t("learn.ogTitle"),
      description: t("learn.ogDescription"),
    },
  };
}

const difficultyColors: Record<string, string> = {
  beginner: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  intermediate: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  advanced: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

export default async function PublicLearnPage() {
  const paths = await getPublicLearningPaths();
  const t = await getTranslations("Public");
  const tc = await getTranslations("Common");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": t("learn.metaTitle"),
    "description": t("learn.metaDescription"),
    "provider": {
      "@type": "Organization",
      "name": "VibeUniv",
      "url": "https://vibeuniv.com",
    },
    "url": "https://vibeuniv.com/learn",
    "educationalLevel": "Beginner to Advanced",
    "isAccessibleForFree": true,
  };

  return (
    <div className="max-w-[960px] mx-auto px-8 max-md:px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumb
        items={[
          { label: tc("breadcrumb.home"), href: "/" },
          { label: tc("nav.learn") },
        ]}
      />
      {/* ===== Section 1: Hero / Introduction ===== */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 mb-6">
          <GraduationCap className="h-4 w-4 text-violet-400" />
          <span className="text-xs font-medium text-violet-400">
            {t("learn.badge")}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
          {t("learn.heroTitle")}
        </h1>
        <p className="text-lg text-text-muted max-w-2xl mx-auto leading-relaxed mb-4">
          {t("learn.heroP1")}
        </p>
        <p className="text-text-muted max-w-2xl mx-auto leading-relaxed mb-4">
          {t("learn.heroP2")}
        </p>
        <p className="text-text-muted max-w-2xl mx-auto leading-relaxed">
          {t("learn.heroP3Prefix")}
          <Link
            href="/signup"
            className="text-violet-400 hover:text-violet-300 underline underline-offset-2"
          >
            {t("learn.heroP3Link")}
          </Link>
          {t("learn.heroP3Suffix")}
        </p>
      </div>

      {/* ===== Section 2: How Learning Works (3 Steps) ===== */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            {t("learn.howTitle")}
          </h2>
          <p className="text-text-muted">
            {t("learn.howSubtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              icon: Code2,
              title: t("learn.how1Title"),
              desc: t("learn.how1Desc"),
            },
            {
              step: "02",
              icon: Target,
              title: t("learn.how2Title"),
              desc: t("learn.how2Desc"),
            },
            {
              step: "03",
              icon: Brain,
              title: t("learn.how3Title"),
              desc: t("learn.how3Desc"),
            },
          ].map(({ step, icon: Icon, title, desc }) => (
            <div
              key={step}
              className="rounded-2xl border border-border-default bg-bg-primary p-6 relative"
            >
              <span className="absolute top-4 right-4 text-3xl font-black text-text-muted/10">
                {step}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {title}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Section 3: Key Features (4 Cards) ===== */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            {t("learn.featuresTitle")}
          </h2>
          <p className="text-text-muted">
            {t("learn.featuresSubtitle")}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              icon: BookOpen,
              title: t("learn.feat1Title"),
              desc: t("learn.feat1Desc"),
              gradient: "from-violet-500 to-purple-600",
            },
            {
              icon: MessageCircleQuestion,
              title: t("learn.feat2Title"),
              desc: t("learn.feat2Desc"),
              gradient: "from-cyan-500 to-blue-600",
            },
            {
              icon: Trophy,
              title: t("learn.feat3Title"),
              desc: t("learn.feat3Desc"),
              gradient: "from-amber-500 to-orange-600",
            },
            {
              icon: Cpu,
              title: t("learn.feat4Title"),
              desc: t("learn.feat4Desc"),
              gradient: "from-emerald-500 to-teal-600",
            },
          ].map(({ icon: Icon, title, desc, gradient }) => (
            <div
              key={title}
              className="rounded-2xl border border-border-default bg-bg-primary p-6"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4`}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-2">
                {title}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Section 3.5: Who Is This For ===== */}
      <section className="mb-16">
        <div className="rounded-2xl border border-border-default bg-bg-primary p-8">
          <h2 className="text-2xl font-bold text-text-primary mb-6 text-center">
            {t("learn.targetTitle")}
          </h2>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            {[
              t("learn.target1"),
              t("learn.target2"),
              t("learn.target3"),
              t("learn.target4"),
              t("learn.target5"),
              t("learn.target6"),
            ].map((text, idx) => (
              <div key={idx} className="flex items-start gap-3 py-2">
                <Sparkles className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                <span className="text-sm text-text-secondary leading-relaxed">
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Section 3.7: Related Resources ===== */}
      <section className="mb-16">
        <h2 className="text-xl font-bold text-text-primary mb-4">
          {t("learn.resourcesTitle")}
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              href: "/blog/how-to-learn-ai-generated-code",
              title: t("learn.res1Title"),
              desc: t("learn.res1Desc"),
            },
            {
              href: "/technology",
              title: t("learn.res2Title"),
              desc: t("learn.res2Desc"),
            },
            {
              href: "/guide/features",
              title: t("learn.res3Title"),
              desc: t("learn.res3Desc"),
            },
          ].map(({ href, title, desc }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-xl border border-border-default bg-bg-primary p-5 hover:border-violet-500/40 transition-colors"
            >
              <h3 className="text-sm font-semibold text-text-primary group-hover:text-violet-400 transition-colors mb-1.5 flex items-center gap-1.5">
                {title}
                <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Section 4: Public Curricula ===== */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-primary">
              {t("learn.publicTitle")}
            </h2>
            <p className="text-sm text-text-muted">
              {t("learn.publicSubtitle")}
            </p>
          </div>
        </div>

        {/* Path List */}
        {paths.length === 0 ? (
          <div className="text-center py-20 text-text-muted">
            {t("learn.emptyPublic")}
          </div>
        ) : (
          <div className="space-y-4">
            {paths.map((path) => (
              <Link
                key={path.id}
                href={`/learn/${path.id}`}
                className="block rounded-2xl border border-border-default bg-bg-primary hover:border-violet-500/40 transition-all p-6 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-text-primary group-hover:text-violet-400 transition-colors truncate">
                        {path.title}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize ${
                          difficultyColors[path.difficulty ?? "beginner"] ??
                          difficultyColors.beginner
                        }`}
                      >
                        {path.difficulty ?? "beginner"}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted line-clamp-2 mb-3">
                      {path.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" />
                        {path.module_count} {t("learn.modules")}
                      </span>
                      {path.estimated_hours && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {path.estimated_hours}h
                        </span>
                      )}
                      {path.project_name && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {path.project_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ===== Section 5: CTA ===== */}
      <div className="mt-16 text-center rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 p-8">
        <h2 className="text-xl font-bold text-text-primary mb-2">
          {t("learn.ctaTitle")}
        </h2>
        <p className="text-sm text-text-muted mb-6 max-w-lg mx-auto">
          {t("learn.ctaDesc")}
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          {t("learn.ctaButton")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
