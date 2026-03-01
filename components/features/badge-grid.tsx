"use client";

import { Lock } from "lucide-react";

interface BadgeGridProps {
  allBadges: Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    icon: string;
  }>;
  earnedBadgeSlugs: Set<string>;
}

export function BadgeGrid({ allBadges, earnedBadgeSlugs }: BadgeGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {allBadges.map((badge) => {
        const earned = earnedBadgeSlugs.has(badge.slug);
        return (
          <div
            key={badge.id}
            className={`group relative rounded-xl border p-3 text-center transition-all duration-200 ${
              earned
                ? "border-border-default bg-bg-surface hover:border-border-hover"
                : "border-border-default/50 bg-bg-surface/50"
            }`}
          >
            {/* Icon */}
            <div
              className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
                earned ? "bg-violet-500/10" : "bg-bg-surface"
              }`}
            >
              {earned ? (
                <span className="text-3xl">{badge.icon}</span>
              ) : (
                <Lock className="h-5 w-5 text-text-dim opacity-40" />
              )}
            </div>

            {/* Name */}
            <p
              className={`mt-2 text-xs font-medium truncate ${
                earned ? "text-text-primary" : "text-text-dim opacity-40"
              }`}
            >
              {badge.name}
            </p>

            {/* Description (earned only) */}
            {earned && (
              <p className="mt-0.5 text-[11px] text-text-faint line-clamp-2">
                {badge.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
