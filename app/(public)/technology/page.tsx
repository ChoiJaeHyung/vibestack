import type { Metadata } from "next";
import Link from "next/link";
import {
  Brain,
  Network,
  BookOpen,
  Shield,
  Cpu,
  Layers,
  GitBranch,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Public");
  return {
    title: "Technology",
    description: t("technology.metaDescription"),
    openGraph: {
      title: "VibeUniv Technology",
      description: t("technology.ogDescription"),
      url: "https://vibeuniv.com/technology",
    },
  };
}

export default async function TechnologyPage() {
  const t = await getTranslations("Public");
  const tc = await getTranslations("Common");

  return (
    <div className="max-w-[900px] mx-auto px-8 max-md:px-4 py-12">
      <Breadcrumb
        items={[
          { label: tc("breadcrumb.home"), href: "/" },
          { label: tc("nav.technology") },
        ]}
      />
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400 mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          {t("technology.badge")}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
          {t("technology.title")}
        </h1>
        <p className="text-lg text-text-muted max-w-2xl mx-auto leading-relaxed">
          {t("technology.subtitle")}
        </p>
      </div>

      {/* Quick Nav */}
      <div className="flex flex-wrap justify-center gap-2 mb-12">
        {[
          { id: "knowledge-graph", icon: Network, label: t("technology.navKnowledgeGraph") },
          { id: "adaptive-curriculum", icon: BookOpen, label: t("technology.navAdaptive") },
          { id: "local-first-ai", icon: Shield, label: t("technology.navLocalFirst") },
          { id: "multi-llm", icon: Cpu, label: t("technology.navMultiLlm") },
          { id: "quality-assurance", icon: Sparkles, label: t("technology.navQuality") },
          { id: "comparison", icon: Zap, label: t("technology.navComparison") },
        ].map(({ id, icon: Icon, label }) => (
          <a
            key={id}
            href={`#${id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-bg-primary px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-violet-500/40 hover:text-violet-400 transition-all"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </a>
        ))}
      </div>

      {/* Tech 1: Knowledge Graph */}
      <section id="knowledge-graph" className="mb-16 scroll-mt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Network className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary">
            {t("technology.kg.title")}
          </h2>
        </div>

        <div className="rounded-2xl border border-border-default bg-bg-primary p-6 mb-4">
          <p className="text-text-secondary leading-relaxed mb-4">
            {t("technology.kg.intro")}
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                icon: Layers,
                title: t("technology.kg.classTitle"),
                desc: t("technology.kg.classDesc"),
              },
              {
                icon: GitBranch,
                title: t("technology.kg.prereqTitle"),
                desc: t("technology.kg.prereqDesc"),
              },
              {
                icon: Brain,
                title: t("technology.kg.masteryTitle"),
                desc: t("technology.kg.masteryDesc"),
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-border-default bg-bg-surface p-4">
                <Icon className="h-5 w-5 text-violet-400 mb-2" />
                <h4 className="text-sm font-semibold text-text-primary mb-1">{title}</h4>
                <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
          <p className="text-sm text-text-secondary">
            {t("technology.kg.tip")}
          </p>
        </div>
      </section>

      {/* Tech 2: Adaptive Curriculum */}
      <section id="adaptive-curriculum" className="mb-16 scroll-mt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary">
            {t("technology.ac.title")}
          </h2>
        </div>

        <div className="rounded-2xl border border-border-default bg-bg-primary p-6 mb-4">
          <p className="text-text-secondary leading-relaxed mb-6">
            {t("technology.ac.intro")}
          </p>

          <div className="space-y-3">
            {[
              {
                step: "1",
                title: t("technology.ac.step1Title"),
                desc: t("technology.ac.step1Desc"),
              },
              {
                step: "2",
                title: t("technology.ac.step2Title"),
                desc: t("technology.ac.step2Desc"),
              },
              {
                step: "3",
                title: t("technology.ac.step3Title"),
                desc: t("technology.ac.step3Desc"),
              },
              {
                step: "4",
                title: t("technology.ac.step4Title"),
                desc: t("technology.ac.step4Desc"),
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4 rounded-xl border border-border-default bg-bg-surface p-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {step}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-1">{title}</h4>
                  <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech 3: Local-First AI */}
      <section id="local-first-ai" className="mb-16 scroll-mt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary">
            {t("technology.lf.title")}
          </h2>
        </div>

        <div className="rounded-2xl border border-border-default bg-bg-primary p-6 mb-4">
          <p className="text-text-secondary leading-relaxed mb-6">
            {t("technology.lf.introPrefix")}<Link href="/blog/what-is-mcp" className="text-violet-400 hover:underline">{t("technology.lf.introLink")}</Link>{t("technology.lf.introSuffix")}
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                {t("technology.lf.privacyTitle")}
              </h4>
              <p className="text-xs text-text-muted leading-relaxed">
                {t("technology.lf.privacyDesc")}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-400" />
                {t("technology.lf.costTitle")}
              </h4>
              <p className="text-xs text-text-muted leading-relaxed">
                {t("technology.lf.costDesc")}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-primary p-5">
          <Link href="/guide" className="text-sm font-semibold text-text-primary mb-3 hover:text-violet-400 transition-colors inline-flex items-center gap-1.5">
            {t("technology.lf.toolsTitle")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <div className="flex flex-wrap gap-2">
            {["Claude Code", "Cursor", "Windsurf", "Cline", "Kimi Code", "Gemini CLI", "OpenAI Codex"].map((tool) => (
              <span
                key={tool}
                className="rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs text-text-secondary"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Tech 4: Multi-LLM */}
      <section id="multi-llm" className="mb-16 scroll-mt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Cpu className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary">
            {t("technology.ml.title")}
          </h2>
        </div>

        <div className="rounded-2xl border border-border-default bg-bg-primary p-6">
          <p className="text-text-secondary leading-relaxed mb-6">
            {t("technology.ml.intro")}
          </p>

          <div className="grid gap-2 md:grid-cols-2">
            {[
              { name: "Anthropic (Claude)", desc: t("technology.ml.anthropicDesc") },
              { name: "OpenAI (GPT)", desc: t("technology.ml.openaiDesc") },
              { name: "Google (Gemini)", desc: t("technology.ml.googleDesc") },
              { name: "Groq / Mistral / DeepSeek", desc: t("technology.ml.groqDesc") },
            ].map(({ name, desc }) => (
              <div key={name} className="flex items-start gap-2 rounded-lg border border-border-default bg-bg-surface p-3">
                <CheckCircle2 className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-sm font-medium text-text-primary">{name}</span>
                  <p className="text-xs text-text-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm text-text-secondary">
              {t("technology.ml.byokTipPrefix")}<Link href="/guide" className="text-violet-400 hover:underline">{t("technology.ml.byokLink")}</Link>{t("technology.ml.byokSuffix")}
            </p>
          </div>
        </div>
      </section>

      {/* Tech 5: Quality Assurance */}
      <section id="quality-assurance" className="mb-16 scroll-mt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary">
            {t("technology.qa.title")}
          </h2>
        </div>

        <div className="rounded-2xl border border-border-default bg-bg-primary p-6">
          <p className="text-text-secondary leading-relaxed mb-6">
            {t("technology.qa.intro")}
          </p>

          <div className="space-y-3">
            {[
              {
                title: t("technology.qa.diffTitle"),
                desc: t("technology.qa.diffDesc"),
              },
              {
                title: t("technology.qa.autoTitle"),
                desc: t("technology.qa.autoDesc"),
              },
              {
                title: t("technology.qa.multiTitle"),
                desc: t("technology.qa.multiDesc"),
              },
            ].map(({ title, desc }) => (
              <div key={title} className="flex gap-3 rounded-xl border border-border-default bg-bg-surface p-4">
                <CheckCircle2 className="h-4 w-4 text-pink-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-1">{title}</h4>
                  <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="comparison" className="mb-16 scroll-mt-8">
        <h2 className="text-2xl font-bold text-text-primary mb-6 text-center">
          {t("technology.comp.title")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border-default bg-bg-primary p-6">
            <h3 className="text-sm font-semibold text-text-muted mb-4 uppercase tracking-wider">
              {t("technology.comp.traditional")}
            </h3>
            <ul className="space-y-2 text-sm text-text-muted">
              {[
                t("technology.comp.trad1"),
                t("technology.comp.trad2"),
                t("technology.comp.trad3"),
                t("technology.comp.trad4"),
                t("technology.comp.trad5"),
              ].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 p-6">
            <h3 className="text-sm font-semibold text-violet-400 mb-4 uppercase tracking-wider">
              VibeUniv
            </h3>
            <ul className="space-y-2 text-sm text-text-secondary">
              {[
                t("technology.comp.vibeuniv1"),
                t("technology.comp.vibeuniv2"),
                t("technology.comp.vibeuniv3"),
                t("technology.comp.vibeuniv4"),
                t("technology.comp.vibeuniv5"),
              ].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 p-8 text-center">
        <h3 className="text-lg font-bold text-text-primary mb-2">
          {t("technology.ctaTitle")}
        </h3>
        <p className="text-sm text-text-muted mb-6 max-w-md mx-auto">
          {t("technology.ctaDesc")}
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            {t("technology.ctaSignup")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 rounded-xl border border-border-default px-6 py-3 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            {t("technology.ctaPreview")}
          </Link>
        </div>
      </div>
    </div>
  );
}
