"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, X } from "lucide-react";
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-sm animate-in zoom-in-95 fade-in duration-200 mx-4">
        <div className="rounded-2xl border border-border-default bg-bg-elevated p-8 text-center shadow-xl">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-text-muted transition-colors hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Checkmark icon */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-text-primary">{t("celebration.title")}</h2>

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

          {/* Buttons */}
          <div className="mt-6 flex flex-col gap-2">
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
