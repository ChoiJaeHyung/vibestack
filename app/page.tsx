import type { Metadata } from "next";
import Link from "next/link";
import React from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { LandingNav } from "@/components/features/landing-nav";
import { TerminalDemo } from "@/components/features/terminal-demo";
import { AnimatedCounter } from "@/components/features/animated-counter";
import { SectionReveal } from "@/components/features/section-reveal";
import { GlowCard } from "@/components/features/glow-card";
import { FaqAccordion } from "@/components/features/faq-accordion";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Landing");
  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
  };
}

export default async function LandingPage() {
  const t = await getTranslations("Landing");

  let userEmail: string | null = null;
  let userPlanType: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
    if (user) {
      const { data: userData } = await supabase
        .from("users")
        .select("plan_type")
        .eq("id", user.id)
        .single();
      userPlanType = userData?.plan_type ?? "free";
    }
  } catch {
    // auth 실패 시 비로그인 상태로 처리
  }

  const richTags = {
    p: (chunks: React.ReactNode) => <p>{chunks}</p>,
    strong: (chunks: React.ReactNode) => <strong className="text-text-secondary">{chunks}</strong>,
    em: (chunks: React.ReactNode) => <em>{chunks}</em>,
    step: (chunks: React.ReactNode) => <p className="font-medium text-text-secondary">{chunks}</p>,
  };

  const STEPS = [
    {
      emoji: "🔌",
      title: t("steps.0.title"),
      description: t("steps.0.description"),
      code: t.raw("steps.0.code"),
    },
    {
      emoji: "🧠",
      title: t("steps.1.title"),
      description: t("steps.1.description"),
      code: t.raw("steps.1.code"),
    },
    {
      emoji: "🎓",
      title: t("steps.2.title"),
      description: t("steps.2.description"),
      code: t.raw("steps.2.code"),
    },
  ];

  const FEATURES = [
    { emoji: "🔌", title: t("features.0.title"), description: t("features.0.description") },
    { emoji: "🤖", title: t("features.1.title"), description: t("features.1.description") },
    { emoji: "📚", title: t("features.2.title"), description: t("features.2.description") },
    { emoji: "💬", title: t("features.3.title"), description: t("features.3.description") },
    { emoji: "🔐", title: t("features.4.title"), description: t("features.4.description") },
    { emoji: "🔑", title: t("features.5.title"), description: t("features.5.description") },
  ];

  const FAQ_ITEMS = [
    { question: t("faq.0.question"), answer: t.rich("faq.0.answer", richTags) },
    { question: t("faq.1.question"), answer: t.rich("faq.1.answer", richTags) },
    { question: t("faq.2.question"), answer: t.rich("faq.2.answer", richTags) },
    { question: t("faq.3.question"), answer: t.rich("faq.3.answer", richTags) },
    { question: t("faq.4.question"), answer: t.rich("faq.4.answer", richTags) },
    { question: t("faq.5.question"), answer: t.rich("faq.5.answer", richTags) },
  ];

  return (
    <div className="min-h-screen bg-background text-text-primary font-sans">
      {/* Navigation */}
      <LandingNav userEmail={userEmail} />

      <main>
        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center pt-[120px] pb-[80px] px-8 max-md:px-4 relative overflow-hidden">
          {/* Background effects */}
          <div
            className="absolute blur-[80px] opacity-60 pointer-events-none"
            style={{
              top: "-20%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "800px",
              height: "800px",
              background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(6,182,212,0.06) 40%, transparent 70%)",
            }}
          />
          <div className="absolute inset-0 dot-grid opacity-50 pointer-events-none" />

          <div className="max-w-[1120px] w-full flex items-center gap-16 flex-wrap relative z-10">
            {/* Left - Copy */}
            <div className="flex-[1_1_460px] min-w-[320px]">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[13px] text-violet-300 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-[pulse-dot_2s_infinite]" />
                {t("hero.badge")}
              </div>

              {/* Title */}
              <h1 className="text-[clamp(36px,5vw,56px)] font-extrabold leading-[1.15] tracking-[-1.5px] text-text-primary">
                {t("hero.title.prefix")}<span className="gradient-text">{t("hero.title.highlight")}</span>
                <br />
                {t("hero.title.line2")}
                <br />
                {t("hero.title.line3")}
              </h1>

              {/* Description */}
              <p className="text-[17px] leading-relaxed text-text-muted max-w-[480px] mt-6 mb-9">
                {t("hero.description.line1")}
                <br />
                {t("hero.description.line2")}
              </p>

              {/* CTA Buttons */}
              <div className="flex gap-3.5 items-center flex-wrap">
                {userEmail ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-[15px] font-semibold text-white shadow-glow-purple hover:shadow-glow-purple-lg hover:scale-[1.02] transition-all duration-300"
                    >
                      {t("hero.cta.dashboard")}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/guide"
                      className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-bg-input border border-border-strong text-[15px] font-medium text-text-tertiary hover:bg-bg-surface-hover hover:border-border-hover transition-all duration-300"
                    >
                      {t("hero.cta.guide")}
                      <BookOpen className="h-4 w-4" />
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/signup"
                      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-[15px] font-semibold text-white shadow-glow-purple hover:shadow-glow-purple-lg hover:scale-[1.02] transition-all duration-300"
                    >
                      {t("hero.cta.signup")}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/guide"
                      className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-bg-input border border-border-strong text-[15px] font-medium text-text-tertiary hover:bg-bg-surface-hover hover:border-border-hover transition-all duration-300"
                    >
                      {t("hero.cta.guideArrow")}
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Right - Terminal */}
            <TerminalDemo />
          </div>
        </section>

        {/* Social Proof Bar */}
        <SectionReveal className="px-8 max-md:px-4 pb-[80px] flex justify-center">
          <div className="max-w-[900px] w-full flex justify-center gap-12 flex-wrap px-12 py-8 rounded-2xl bg-bg-surface border border-border-default max-md:px-6 max-md:gap-8">
            <div className="text-center min-w-[140px]">
              <div className="text-[32px] font-extrabold mb-1">
                <AnimatedCounter target={500} suffix="+" />
              </div>
              <div className="text-[13px] text-text-faint">{t("stats.projects")}</div>
            </div>
            <div className="text-center min-w-[140px]">
              <div className="text-[32px] font-extrabold mb-1">
                <AnimatedCounter target={11} suffix={t("stats.aiModelsSuffix")} />
              </div>
              <div className="text-[13px] text-text-faint">{t("stats.aiModels")}</div>
            </div>
            <div className="text-center min-w-[140px]">
              <div className="text-[32px] font-extrabold mb-1">
                <AnimatedCounter target={2400} suffix="+" />
              </div>
              <div className="text-[13px] text-text-faint">{t("stats.modules")}</div>
            </div>
          </div>
        </SectionReveal>

        {/* How It Works */}
        <section id="how" className="py-[100px] px-8 max-md:px-4 flex justify-center">
          <div className="max-w-[1120px] w-full">
            <SectionReveal className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-text-primary tracking-tight">
                {t("how.title.prefix")}<span className="gradient-text">{t("how.title.highlight")}</span>{t("how.title.suffix")}
              </h2>
              <p className="text-base text-text-faint max-w-[480px] mx-auto mt-4">
                {t("how.subtitle")}
              </p>
            </SectionReveal>

            <div className="flex flex-col gap-8">
              {STEPS.map((step, i) => (
                <GlowCard key={i} delay={i * 150} glowColor={i % 2 === 0 ? "purple" : "cyan"}>
                  <div className="flex gap-8 items-start flex-wrap">
                    <div className="flex-[1_1_320px] min-w-[280px]">
                      <div className="text-[13px] font-extrabold font-mono gradient-text mb-2">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <div className="text-[28px] mb-3">{step.emoji}</div>
                      <h3 className="text-[22px] font-bold text-text-primary mb-2">
                        {step.title}
                      </h3>
                      <p className="text-[15px] leading-relaxed text-text-muted">
                        {step.description}
                      </p>
                    </div>
                    <div className="flex-[1_1_280px] min-w-[260px]">
                      <div className="dark bg-[rgba(0,0,0,0.3)] rounded-[10px] p-4 border border-[rgba(255,255,255,0.05)] font-mono text-xs leading-relaxed text-zinc-400 whitespace-pre-wrap">
                        {step.code}
                      </div>
                    </div>
                  </div>
                </GlowCard>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-[100px] px-8 max-md:px-4 flex justify-center">
          <div className="max-w-[1120px] w-full">
            <SectionReveal className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-text-primary tracking-tight">
                {t("features.title.prefix")}<span className="gradient-text">{t("features.title.highlight")}</span>
              </h2>
              <p className="text-base text-text-faint max-w-[480px] mx-auto mt-4">
                {t("features.subtitle")}
              </p>
            </SectionReveal>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
              {FEATURES.map((feature, i) => (
                <GlowCard key={i} delay={i * 100} glowColor={i % 2 === 0 ? "purple" : "cyan"}>
                  <div className="text-[32px] mb-4">{feature.emoji}</div>
                  <h3 className="text-lg font-bold text-text-primary mb-2.5">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-text-muted">
                    {feature.description}
                  </p>
                </GlowCard>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-[100px] px-8 max-md:px-4 flex justify-center relative">
          <div
            className="absolute blur-[80px] opacity-40 pointer-events-none"
            style={{
              top: "10%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "600px",
              height: "600px",
              background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 60%)",
            }}
          />
          <div className="max-w-[1120px] w-full relative z-10">
            <SectionReveal className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-text-primary tracking-tight">
                {t("pricing.title.prefix")}<span className="gradient-text">{t("pricing.title.highlight")}</span>
              </h2>
              <p className="text-base text-text-faint max-w-[480px] mx-auto mt-4">
                {t("pricing.subtitle")}
              </p>
            </SectionReveal>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5 items-stretch">
              <PricingCard
                name="Free"
                planKey="free"
                description={t("pricing.free.description")}
                price={t("pricing.free.price")}
                features={[
                  t("pricing.free.features.0"),
                  t("pricing.free.features.1"),
                  t("pricing.free.features.2"),
                  t("pricing.free.features.3"),
                ]}
                ctaLabel={t("pricing.free.cta")}
                ctaHref="/signup"
                isLoggedIn={!!userEmail}
                userPlanType={userPlanType}
                checkColor="text-cyan-500"
                perMonthLabel={t("pricing.perMonth")}
                currentPlanLabel={t("pricing.currentPlan")}
                upgradeLabel={t("pricing.upgrade")}
                popularLabel={t("pricing.popular")}
              />
              <PricingCard
                name="Pro"
                planKey="pro"
                description={t("pricing.pro.description")}
                price={t("pricing.pro.price")}
                isPopular
                features={[
                  t("pricing.pro.features.0"),
                  t("pricing.pro.features.1"),
                  t("pricing.pro.features.2"),
                  t("pricing.pro.features.3"),
                  t("pricing.pro.features.4"),
                ]}
                ctaLabel={t("pricing.pro.cta")}
                ctaHref="/signup"
                isLoggedIn={!!userEmail}
                userPlanType={userPlanType}
                checkColor="text-violet-500"
                perMonthLabel={t("pricing.perMonth")}
                currentPlanLabel={t("pricing.currentPlan")}
                upgradeLabel={t("pricing.upgrade")}
                popularLabel={t("pricing.popular")}
              />
              <PricingCard
                name="Team"
                planKey="team"
                description={t("pricing.team.description")}
                price={t("pricing.team.price")}
                features={[
                  t("pricing.team.features.0"),
                  t("pricing.team.features.1"),
                  t("pricing.team.features.2"),
                  t("pricing.team.features.3"),
                ]}
                ctaLabel={t("pricing.team.cta")}
                ctaHref="/signup"
                isLoggedIn={!!userEmail}
                userPlanType={userPlanType}
                checkColor="text-cyan-500"
                perMonthLabel={t("pricing.perMonth")}
                currentPlanLabel={t("pricing.currentPlan")}
                upgradeLabel={t("pricing.upgrade")}
                popularLabel={t("pricing.popular")}
              />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-[100px] pb-[120px] px-8 max-md:px-4 flex justify-center">
          <div className="max-w-[720px] w-full">
            <SectionReveal className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-text-primary tracking-tight">
                {t("faq.title.prefix")}<span className="gradient-text">{t("faq.title.highlight")}</span>
              </h2>
            </SectionReveal>

            <FaqAccordion items={FAQ_ITEMS} />
          </div>
        </section>

        {/* Final CTA */}
        <SectionReveal className="px-8 max-md:px-4 pb-[120px] flex justify-center">
          <div className="max-w-[800px] w-full text-center px-12 py-16 rounded-3xl bg-gradient-to-b from-violet-500/[0.08] to-cyan-500/[0.04] border border-violet-500/20 relative overflow-hidden max-md:px-6">
            <div
              className="absolute blur-[60px] opacity-50 pointer-events-none"
              style={{
                top: "-30%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "400px",
                height: "400px",
                background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 60%)",
              }}
            />
            <div className="relative z-10">
              <h2 className="text-[32px] font-extrabold text-text-primary tracking-tight">
                {t("finalCta.title")}
              </h2>
              <p className="text-base text-text-muted leading-relaxed max-w-[500px] mx-auto mt-4 mb-8">
                {t("finalCta.description.line1")}
                <br />
                {t("finalCta.description.line2")}
              </p>
              {userEmail ? (
                <Link
                  href="/dashboard"
                  className="inline-block px-10 py-4 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-base font-bold text-white shadow-glow-purple-lg hover:scale-[1.03] transition-all duration-300"
                >
                  {t("finalCta.dashboard")}
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="inline-block px-10 py-4 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-base font-bold text-white shadow-glow-purple-lg hover:scale-[1.03] transition-all duration-300"
                >
                  {t("finalCta.signup")}
                </Link>
              )}
            </div>
          </div>
        </SectionReveal>
      </main>

      {/* Footer */}
      <footer className="px-8 max-md:px-4 py-10 border-t border-border-default flex justify-center">
        <div className="max-w-[1120px] w-full flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-[22px] h-[22px] rounded-md bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-[11px] font-extrabold text-white">
              V
            </div>
            <span className="text-sm font-semibold text-text-faint">VibeUniv</span>
          </div>
          <div className="flex gap-6 text-[13px] text-text-dim">
            <a
              href="https://github.com/vibestack"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-tertiary transition-colors"
            >
              GitHub
            </a>
          </div>
          <div className="text-xs text-text-ghost">
            <div>{t("footer.copyright")}</div>
            <div className="mt-1">{t("footer.company")}</div>
          </div>
        </div>
      </footer>

      {/* FAQ JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [0, 1, 2, 3, 4, 5].map((i) => ({
              "@type": "Question",
              name: t(`jsonLd.faq.${i}.question`),
              acceptedAnswer: {
                "@type": "Answer",
                text: t(`jsonLd.faq.${i}.answer`),
              },
            })),
          }),
        }}
      />
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────── */

const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, team: 2 };

function PricingCard({
  name,
  planKey,
  description,
  price,
  features,
  ctaLabel,
  ctaHref,
  isPopular,
  isLoggedIn,
  userPlanType,
  checkColor,
  perMonthLabel,
  currentPlanLabel,
  upgradeLabel,
  popularLabel,
}: {
  name: string;
  planKey: string;
  description: string;
  price: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  isPopular?: boolean;
  isLoggedIn?: boolean;
  userPlanType?: string | null;
  checkColor: string;
  perMonthLabel: string;
  currentPlanLabel: string;
  upgradeLabel: string;
  popularLabel: string;
}) {
  const isCurrentPlan = isLoggedIn && userPlanType === planKey;
  const userRank = PLAN_RANK[userPlanType ?? "free"] ?? 0;
  const cardRank = PLAN_RANK[planKey] ?? 0;
  const isUpgrade = isLoggedIn && cardRank > userRank;

  let resolvedLabel = ctaLabel;
  let resolvedHref = ctaHref;
  let disabled = false;

  if (isLoggedIn) {
    if (isCurrentPlan) {
      resolvedLabel = currentPlanLabel;
      resolvedHref = "/settings/billing";
      disabled = true;
    } else if (isUpgrade) {
      resolvedLabel = upgradeLabel;
      resolvedHref = "/settings/billing";
    } else {
      resolvedLabel = ctaLabel;
      resolvedHref = "/settings/billing";
    }
  }

  return (
    <div
      className={`relative rounded-2xl px-7 py-8 transition-all duration-300 ${
        isPopular
          ? "border border-violet-500/40 bg-gradient-to-b from-violet-500/[0.08] to-cyan-500/[0.04]"
          : "border border-border-default bg-bg-surface hover:border-border-hover"
      }`}
    >
      {isPopular && (
        <div className="absolute -top-px left-1/2 -translate-x-1/2">
          <span className="px-4 py-1 rounded-b-[10px] bg-gradient-to-br from-violet-500 to-cyan-500 text-[11px] font-bold text-white tracking-wide">
            {popularLabel}
          </span>
        </div>
      )}
      <h3 className="text-xl font-bold text-text-primary">{name}</h3>
      <p className="text-[13px] text-text-faint mt-1">{description}</p>
      <div className="mt-4 flex items-baseline">
        <span className="text-[44px] font-extrabold text-text-primary tracking-[-2px]">
          {price}
        </span>
        <span className="ml-1 text-sm text-text-faint">{perMonthLabel}</span>
      </div>
      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-center gap-2.5 text-sm text-text-tertiary"
          >
            <svg
              className={`h-4 w-4 flex-shrink-0 ${checkColor}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      {disabled ? (
        <span className="mt-8 flex h-12 w-full cursor-not-allowed items-center justify-center rounded-xl border border-border-default text-sm font-semibold text-text-faint">
          {resolvedLabel}
        </span>
      ) : (
        <Link
          href={resolvedHref}
          className={`mt-8 flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold text-white transition-all duration-300 ${
            isPopular
              ? "bg-gradient-to-br from-violet-500 to-violet-600 shadow-glow-purple-md hover:shadow-glow-purple hover:scale-[1.01]"
              : "bg-bg-surface-hover border border-border-strong hover:bg-bg-input-hover"
          }`}
        >
          {resolvedLabel}
        </Link>
      )}
    </div>
  );
}
