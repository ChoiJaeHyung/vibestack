"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface BadgeEarnedModalProps {
  isOpen: boolean;
  onClose: () => void;
  badges: Array<{ name: string; icon: string; description: string }>;
}

export function BadgeEarnedModal({
  isOpen,
  onClose,
  badges,
}: BadgeEarnedModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Slight delay for mount animation
      const timer = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(timer);
    }
    // Synchronous setState for unmount animation — safe here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(false);
  }, [isOpen]);

  if (!isOpen || badges.length === 0) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />

      {/* Modal card */}
      <div
        className={`relative w-full max-w-sm rounded-2xl bg-bg-elevated p-6 shadow-2xl transition-all duration-300 ${visible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-text-faint hover:bg-bg-surface hover:text-text-secondary transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Title */}
        <h2 className="text-center text-lg font-bold text-text-primary mb-5">
          새 배지 획득!
        </h2>

        {/* Badge list */}
        <div className="space-y-4">
          {badges.map((badge) => (
            <div key={badge.name} className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-500/10">
                <span className="text-4xl">{badge.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text-primary">
                  {badge.name}
                </p>
                <p className="text-sm text-text-muted">{badge.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
        >
          확인
        </button>
      </div>
    </div>
  );
}
