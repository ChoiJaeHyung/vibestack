import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Zap, Globe, Shield, BookOpen, Code2, Brain, Users, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Public");
  return {
    title: "About",
    description: t("about.metaDescription"),
    openGraph: {
      title: "About VibeUniv",
      description: t("about.ogDescription"),
      url: "https://vibeuniv.com/about",
    },
  };
}

export default async function AboutPage() {
  const t = await getTranslations("Public");
  const tc = await getTranslations("Common");

  const howItWorks: Array<{ icon: typeof Code2; title: string; desc: string; link?: string; linkText?: string }> = [
    { icon: Code2, title: t("about.how1Title"), desc: t("about.how1Desc"), link: "/blog/what-is-mcp", linkText: t("about.how1Link") },
    { icon: Brain, title: t("about.how2Title"), desc: t("about.how2Desc") },
    { icon: BookOpen, title: t("about.how3Title"), desc: t("about.how3Desc") },
    { icon: Users, title: t("about.how4Title"), desc: t("about.how4Desc") },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "About VibeUniv",
    "description": "VibeUniv is an educational platform helping vibe coders understand and learn the tech stacks of projects they've built with AI.",
    "url": "https://vibeuniv.com/about",
    "mainEntity": {
      "@type": "Organization",
      "name": "VibeUniv",
      "url": "https://vibeuniv.com",
      "email": "support@vibeuniv.com",
    },
  };

  return (
    <div className="max-w-[800px] mx-auto px-8 max-md:px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumb
        items={[
          { label: tc("breadcrumb.home"), href: "/" },
          { label: tc("nav.about") },
        ]}
      />
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mx-auto mb-6">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
          {t("about.title")}
        </h1>
        <p className="text-lg text-text-muted max-w-xl mx-auto leading-relaxed">
          {t("about.subtitle")}
        </p>
      </div>

      {/* Mission */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-text-primary mb-4">
          {t("about.missionTitle")}
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          {t("about.missionP1")}{" "}
          <Link href="/blog/what-is-vibe-coding" className="text-violet-400 hover:underline">{t("about.missionP1Link")}</Link>
          {t("about.missionP1Suffix")}
        </p>
        <p className="text-text-secondary leading-relaxed">
          {t("about.missionP2Prefix")}{" "}
          <Link href="/learn" className="text-violet-400 hover:underline">{t("about.missionP2Link")}</Link>
          {t("about.missionP2Suffix")}
        </p>
      </section>

      {/* How It Works */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-text-primary mb-6">
          {t("about.howTitle")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {howItWorks.map(({ icon: Icon, title, desc, link, linkText }) => (
            <div key={title} className="rounded-xl border border-border-default bg-bg-primary p-5">
              <Icon className="h-5 w-5 text-violet-400 mb-3" />
              <h3 className="font-semibold text-text-primary mb-1.5">{title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
              {link && linkText && (
                <Link href={link} className="inline-flex items-center gap-1 text-xs text-violet-400 hover:underline mt-2">
                  {linkText} <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Key Features */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-text-primary mb-6">
          {t("about.featuresTitle")}
        </h2>
        <div className="space-y-4">
          {[
            { icon: Zap, title: t("about.feat1Title"), desc: t("about.feat1Desc") },
            { icon: Globe, title: t("about.feat2Title"), desc: t("about.feat2Desc") },
            { icon: Shield, title: t("about.feat3Title"), desc: t("about.feat3Desc") },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4 rounded-xl border border-border-default bg-bg-primary p-5">
              <Icon className="h-5 w-5 text-violet-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-text-primary mb-1">{title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Company Info */}
      <section className="rounded-2xl border border-border-default bg-bg-primary p-8 mb-12">
        <h2 className="text-xl font-bold text-text-primary mb-4">
          {t("about.companyTitle")}
        </h2>
        <div className="grid gap-3 text-sm">
          {[
            [t("about.companyService"), "VibeUniv"],
            [t("about.companyDomain"), "vibeuniv.com"],
            [t("about.companyRegistration"), "257-37-01450"],
            [t("about.companyRepresentative"), t("about.companyRepresentativeName")],
            [t("about.companyEmail"), "mailto:support@vibeuniv.com"],
            [t("about.companyTechStack"), "Next.js 15, TypeScript, Supabase, Stripe, Multi-LLM"],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-4">
              <span className="text-text-muted w-32 shrink-0">{label}</span>
              {value?.startsWith("mailto:") ? (
                <a href={value} className="text-violet-400 hover:underline">
                  {value.replace("mailto:", "")}
                </a>
              ) : (
                <span className="text-text-secondary">{value}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 p-8 text-center">
        <h3 className="text-lg font-bold text-text-primary mb-2">
          {t("about.ctaTitle")}
        </h3>
        <p className="text-sm text-text-muted mb-6 max-w-md mx-auto">
          {t("about.ctaDesc")}
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            {t("about.ctaSignup")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/guide"
            className="inline-flex items-center gap-2 rounded-xl border border-border-default px-6 py-3 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            {t("about.ctaGuide")}
          </Link>
        </div>
      </div>
    </div>
  );
}
