"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

interface ProjectSelectorProps {
  projects: { id: string; name: string }[];
  currentProjectId: string;
}

export function ProjectSelector({ projects, currentProjectId }: ProjectSelectorProps) {
  const t = useTranslations("Learning");
  const router = useRouter();

  return (
    <div className="relative">
      <select
        value={currentProjectId}
        onChange={(e) => {
          router.push(`/learning/knowledge-map?project=${e.target.value}`);
        }}
        className="appearance-none rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 pr-8 text-sm text-text-primary hover:bg-bg-surface-hover focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
        aria-label={t("knowledgeMap.selectProject")}
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
    </div>
  );
}
