"use client";

import { X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { ArchNode } from "@/server/actions/architecture";

interface MapSidebarProps {
  node: ArchNode | null;
  projectId: string;
  onClose: () => void;
}

export function MapSidebar({ node, projectId, onClose }: MapSidebarProps) {
  const t = useTranslations("Projects");

  if (!node) return null;

  return (
    <div className="absolute right-0 top-0 z-10 h-full w-72 border-l border-border-default bg-bg-elevated shadow-lg">
      <div className="flex items-center justify-between border-b border-border-default p-4">
        <h3 className="text-sm font-semibold text-text-primary">
          {node.label}
        </h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-text-muted hover:bg-bg-surface-hover"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        {/* Version */}
        {node.version && (
          <div>
            <dt className="text-xs text-text-faint">
              {t("architecture.sidebar.version")}
            </dt>
            <dd className="mt-0.5 text-sm text-text-primary">{node.version}</dd>
          </div>
        )}

        {/* Category */}
        <div>
          <dt className="text-xs text-text-faint">
            {t("architecture.sidebar.category")}
          </dt>
          <dd className="mt-0.5 text-sm text-text-primary">{node.category}</dd>
        </div>

        {/* Layer */}
        <div>
          <dt className="text-xs text-text-faint">
            {t("architecture.sidebar.layer")}
          </dt>
          <dd className="mt-0.5 text-sm text-text-primary">{node.layer}</dd>
        </div>

        {/* Importance */}
        <div>
          <dt className="text-xs text-text-faint">
            {t("architecture.sidebar.importance")}
          </dt>
          <dd className="mt-0.5 text-sm text-text-primary">
            {node.importance}
          </dd>
        </div>

        {/* Description */}
        {node.description && (
          <div>
            <dt className="text-xs text-text-faint">
              {t("architecture.sidebar.description")}
            </dt>
            <dd className="mt-1 text-sm leading-relaxed text-text-secondary">
              {node.description}
            </dd>
          </div>
        )}

        {/* Link to learning */}
        <Link href={`/learning?project=${projectId}`}>
          <Button variant="secondary" size="sm" className="mt-2 w-full gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            {t("architecture.sidebar.goToLearning")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
