"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, X, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleName: string;
  score?: number | null;
  nextModuleId?: string | null;
  learningPathId: string;
}

export function CelebrationModal({
  isOpen,
  onClose,
  moduleName,
  score,
  nextModuleId,
  learningPathId,
}: CelebrationModalProps) {
  const t = useTranslations("Learning");
  const tc = useTranslations("Common");

  // Fire confetti when modal opens
  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isOpen]);

  // ESC key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const shareText = score != null
    ? t("celebration.shareTextWithScore", { module: moduleName, score })
    : t("celebration.shareText", { module: moduleName });

  function handleShareX() {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent("https://vibeuniv.com")}`;
    window.open(url, "_blank", "noopener,noreferrer,width=550,height=420");
  }

  function handleShareLinkedIn() {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://vibeuniv.com")}`;
    window.open(url, "_blank", "noopener,noreferrer,width=550,height=420");
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareText + " https://vibeuniv.com");
    } catch {
      // Fallback: do nothing
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 transition-opacity duration-200"
        onClick={onClose}
        role="presentation"
      />

      {/* Modal card */}
      <div
        className="relative z-10 w-full max-w-sm animate-in zoom-in-95 fade-in duration-200 mx-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="celebration-title"
      >
        <div className="rounded-2xl border border-border-default bg-bg-elevated p-8 text-center shadow-xl">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-text-muted transition-colors hover:text-text-primary"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Checkmark icon */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>

          {/* Title */}
          <h2 id="celebration-title" className="text-xl font-bold text-text-primary">{t("celebration.title")}</h2>

          {/* Subtitle */}
          <p className="mt-1 text-sm text-text-muted">{t("celebration.subtitle", { name: moduleName })}</p>

          {/* Score */}
          {score != null && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-violet-500/10 px-4 py-2">
              <span className="text-sm font-medium text-violet-400">
                {t("celebration.score", { score })}
              </span>
            </div>
          )}

          {/* Share buttons */}
          <div className="mt-5 flex items-center justify-center gap-2">
            <button
              onClick={handleShareX}
              className="flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary hover:border-border-hover transition-all"
              title="Share on X"
            >
              <XIcon />
              {t("celebration.share")}
            </button>
            <button
              onClick={handleShareLinkedIn}
              className="flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary hover:border-border-hover transition-all"
              title="Share on LinkedIn"
            >
              <LinkedInIcon />
              LinkedIn
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary hover:border-border-hover transition-all"
              title="Copy"
            >
              <Share2 className="h-3 w-3" />
              {t("celebration.copy")}
            </button>
          </div>

          {/* Buttons */}
          <div className="mt-5 flex flex-col gap-2">
            {nextModuleId && (
              <Link
                href={`/learning/${learningPathId}/${nextModuleId}`}
                onClick={onClose}
              >
                <Button className="w-full bg-violet-600 hover:bg-violet-500 text-white">
                  {t("celebration.nextModule")}
                </Button>
              </Link>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-text-muted transition-colors hover:text-text-primary"
            >
              {tc("close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
