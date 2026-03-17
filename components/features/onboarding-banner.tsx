"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  X,
  ArrowRight,
  Settings,
  FolderOpen,
  Sparkles,
  GraduationCap,
  Check,
} from "lucide-react";

const ONBOARDING_KEY = "vibeuniv_onboarding_dismissed";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function getSnapshot() {
  return localStorage.getItem(ONBOARDING_KEY) !== "true";
}

function getServerSnapshot() {
  return false;
}

interface OnboardingBannerProps {
  totalProjects?: number;
  hasAnalyzedProject?: boolean;
  hasLearningPath?: boolean;
  hasCompletedModule?: boolean;
}

export function OnboardingBanner({
  totalProjects = 0,
  hasAnalyzedProject = false,
  hasLearningPath = false,
  hasCompletedModule = false,
}: OnboardingBannerProps) {
  const t = useTranslations("Dashboard");
  const shouldShow = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);

  function dismiss() {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setDismissed(true);
  }

  // Auto-dismiss when all steps are complete
  const allComplete = totalProjects > 0 && hasAnalyzedProject && hasLearningPath && hasCompletedModule;
  if (!shouldShow || dismissed || allComplete) return null;

  const steps = [
    {
      icon: Settings,
      label: t("onboarding.mcpSetup.label"),
      desc: t("onboarding.mcpSetup.desc"),
      href: "/settings",
      done: totalProjects > 0,
    },
    {
      icon: FolderOpen,
      label: t("onboarding.syncProject.label"),
      desc: t("onboarding.syncProject.desc"),
      href: "/projects",
      done: hasAnalyzedProject,
    },
    {
      icon: Sparkles,
      label: t("onboarding.startLearning.label"),
      desc: t("onboarding.startLearning.desc"),
      href: "/learning",
      done: hasLearningPath,
    },
    {
      icon: GraduationCap,
      label: t("onboarding.completeModule.label"),
      desc: t("onboarding.completeModule.desc"),
      href: "/learning",
      done: hasCompletedModule,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="relative rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.06] to-cyan-500/[0.04] p-5">
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 rounded-lg p-1 text-text-muted hover:text-text-primary transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            {t("onboardingBanner.title")}
          </h3>
          <p className="text-xs text-text-muted">
            {t("onboardingBanner.progress", { completed: completedCount, total: steps.length })}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1.5 rounded-full bg-bg-surface overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {steps.map((step, idx) => (
          <Link key={idx} href={step.href} onClick={step.done ? undefined : undefined}>
            <div
              className={`flex items-center gap-3 rounded-xl border p-3 transition-all group ${
                step.done
                  ? "border-green-500/20 bg-green-500/[0.04]"
                  : "border-border-default bg-bg-surface hover:border-violet-500/30"
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  step.done
                    ? "bg-green-500/10 text-green-400"
                    : "bg-violet-500/10 text-violet-400"
                }`}
              >
                {step.done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium transition-colors ${
                    step.done
                      ? "text-green-400 line-through opacity-70"
                      : "text-text-secondary group-hover:text-text-primary"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-[11px] text-text-dim">{step.desc}</p>
              </div>
              {!step.done && (
                <ArrowRight className="h-3.5 w-3.5 text-text-dim opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
