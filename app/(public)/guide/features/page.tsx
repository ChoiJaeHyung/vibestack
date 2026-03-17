import type { Metadata } from "next";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderOpen,
  GraduationCap,
  Settings,
  Trophy,
  ArrowRight,
  Upload,
  Brain,
  BarChart3,
  BookOpen,
  MessageSquare,
  Network,
  Key,
  CreditCard,
  Globe,
  Flame,
  Medal,
  Star,
  Zap,
  Target,
  Lightbulb,
  Lock,
  Search,
  CheckCircle,
  RefreshCw,
  FileCode,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Public");
  return {
    title: "Features Guide",
    description: t("features.metaDescription"),
  };
}

interface FeatureItem {
  icon: React.ElementType;
  title: string;
  desc: string;
}

function FeatureCard({ icon: Icon, title, desc }: FeatureItem) {
  return (
    <div className="flex gap-3 rounded-xl border border-border-default bg-bg-primary p-4">
      <Icon className="h-5 w-5 text-violet-400 mt-0.5 shrink-0" />
      <div>
        <h4 className="text-sm font-semibold text-text-primary mb-1">{title}</h4>
        <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function TipBox({ tip }: { tip: string }) {
  return (
    <div className="mt-4 flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <Lightbulb className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
      <p className="text-xs text-text-muted leading-relaxed">{tip}</p>
    </div>
  );
}

export default async function FeaturesGuidePage() {
  const t = await getTranslations("Public");
  const tc = await getTranslations("Common");

  const sections = [
    {
      id: "dashboard",
      icon: LayoutDashboard,
      color: "from-violet-500 to-purple-500",
      title: t("features.dashboard.title"),
      desc: t("features.dashboard.desc"),
      tip: t("features.dashboard.tip"),
      features: [
        {
          icon: BarChart3,
          title: t("features.dashboard.projectOverview"),
          desc: t("features.dashboard.projectOverviewDesc"),
        },
        {
          icon: Target,
          title: t("features.dashboard.learningProgress"),
          desc: t("features.dashboard.learningProgressDesc"),
        },
        {
          icon: Flame,
          title: t("features.dashboard.streak"),
          desc: t("features.dashboard.streakDesc"),
        },
        {
          icon: Zap,
          title: t("features.dashboard.nudge"),
          desc: t("features.dashboard.nudgeDesc"),
        },
        {
          icon: Medal,
          title: t("features.dashboard.badges"),
          desc: t("features.dashboard.badgesDesc"),
        },
      ] as FeatureItem[],
    },
    {
      id: "projects",
      icon: FolderOpen,
      color: "from-cyan-500 to-blue-500",
      title: t("features.projects.title"),
      desc: t("features.projects.desc"),
      tip: t("features.projects.tip"),
      features: [
        {
          icon: Upload,
          title: t("features.projects.register"),
          desc: t("features.projects.registerDesc"),
        },
        {
          icon: Brain,
          title: t("features.projects.analysis"),
          desc: t("features.projects.analysisDesc"),
        },
        {
          icon: BarChart3,
          title: t("features.projects.results"),
          desc: t("features.projects.resultsDesc"),
        },
        {
          icon: FileCode,
          title: t("features.projects.sourceCode"),
          desc: t("features.projects.sourceCodeDesc"),
        },
        {
          icon: Lock,
          title: t("features.projects.security"),
          desc: t("features.projects.securityDesc"),
        },
        {
          icon: FolderOpen,
          title: t("features.projects.manage"),
          desc: t("features.projects.manageDesc"),
        },
      ] as FeatureItem[],
    },
    {
      id: "learning",
      icon: GraduationCap,
      color: "from-emerald-500 to-green-500",
      title: t("features.learning.title"),
      desc: t("features.learning.desc"),
      tip: t("features.learning.tip"),
      features: [
        {
          icon: BookOpen,
          title: t("features.learning.curriculum"),
          desc: t("features.learning.curriculumDesc"),
        },
        {
          icon: GraduationCap,
          title: t("features.learning.contentTypes"),
          desc: t("features.learning.contentTypesDesc"),
        },
        {
          icon: CheckCircle,
          title: t("features.learning.quiz"),
          desc: t("features.learning.quizDesc"),
        },
        {
          icon: RefreshCw,
          title: t("features.learning.prereq"),
          desc: t("features.learning.prereqDesc"),
        },
        {
          icon: MessageSquare,
          title: t("features.learning.tutor"),
          desc: t("features.learning.tutorDesc"),
        },
        {
          icon: Network,
          title: t("features.learning.knowledgeGraph"),
          desc: t("features.learning.knowledgeGraphDesc"),
        },
      ] as FeatureItem[],
    },
    {
      id: "settings",
      icon: Settings,
      color: "from-amber-500 to-orange-500",
      title: t("features.settings.title"),
      desc: t("features.settings.desc"),
      tip: t("features.settings.tip"),
      features: [
        {
          icon: Key,
          title: t("features.settings.apiKey"),
          desc: t("features.settings.apiKeyDesc"),
        },
        {
          icon: Brain,
          title: t("features.settings.llmKey"),
          desc: t("features.settings.llmKeyDesc"),
        },
        {
          icon: Lock,
          title: t("features.settings.encryption"),
          desc: t("features.settings.encryptionDesc"),
        },
        {
          icon: Globe,
          title: t("features.settings.language"),
          desc: t("features.settings.languageDesc"),
        },
        {
          icon: CreditCard,
          title: t("features.settings.billing"),
          desc: t("features.settings.billingDesc"),
        },
      ] as FeatureItem[],
    },
    {
      id: "rewards",
      icon: Trophy,
      color: "from-pink-500 to-rose-500",
      title: t("features.rewards.title"),
      desc: t("features.rewards.desc"),
      tip: t("features.rewards.tip"),
      features: [
        {
          icon: Star,
          title: t("features.rewards.points"),
          desc: t("features.rewards.pointsDesc"),
        },
        {
          icon: Medal,
          title: t("features.rewards.badgesAch"),
          desc: t("features.rewards.badgesAchDesc"),
        },
        {
          icon: Flame,
          title: t("features.rewards.streakChallenge"),
          desc: t("features.rewards.streakChallengeDesc"),
        },
        {
          icon: Search,
          title: t("features.rewards.gallery"),
          desc: t("features.rewards.galleryDesc"),
        },
        {
          icon: Trophy,
          title: t("features.rewards.redeem"),
          desc: t("features.rewards.redeemDesc"),
        },
      ] as FeatureItem[],
    },
  ];

  return (
    <div className="max-w-[900px] mx-auto px-8 max-md:px-4 py-12">
      <Breadcrumb
        items={[
          { label: tc("breadcrumb.home"), href: "/" },
          { label: tc("breadcrumb.guide"), href: "/guide" },
          { label: tc("breadcrumb.features") },
        ]}
      />
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">
          {t("features.title")}
        </h1>
        <p className="text-text-muted max-w-xl mx-auto">
          {t("features.subtitle")}
        </p>
      </div>

      {/* Quick Nav */}
      <div className="flex flex-wrap justify-center gap-2 mb-12">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-bg-primary px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-violet-500/40 hover:text-violet-400 transition-all"
            >
              <Icon className="h-3.5 w-3.5" />
              {s.title}
            </a>
          );
        })}
      </div>

      {/* Sections */}
      <div className="space-y-16">
        {sections.map((section) => {
          const SectionIcon = section.icon;
          return (
            <section key={section.id} id={section.id}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center`}>
                  <SectionIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">{section.title}</h2>
                  <p className="text-sm text-text-muted">{section.desc}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 mt-6">
                {section.features.map((feature) => (
                  <FeatureCard key={feature.title} {...feature} />
                ))}
              </div>
              {section.tip && <TipBox tip={section.tip} />}
            </section>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-16 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 p-8 text-center">
        <h3 className="text-lg font-bold text-text-primary mb-2">
          {t("features.ctaTitle")}
        </h3>
        <p className="text-sm text-text-muted mb-6 max-w-md mx-auto">
          {t("features.ctaDesc")}
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            {t("features.ctaSignup")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/guide"
            className="inline-flex items-center gap-2 rounded-xl border border-border-default px-6 py-3 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            {t("features.ctaGuide")}
          </Link>
        </div>
      </div>
    </div>
  );
}
