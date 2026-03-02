"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Clock, Upload, Loader2, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { TechStackBadge } from "@/components/features/tech-stack-badge";

type ProjectStatus = "created" | "uploaded" | "analyzing" | "analyzed" | "error";

interface ProjectCardProps {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  techStack?: string[];
  updatedAt: string;
  fileCount?: number;
}

const statusIcons: Record<ProjectStatus, React.ComponentType<{ className?: string }>> = {
  created: Clock,
  uploaded: Upload,
  analyzing: Loader2,
  analyzed: CheckCircle,
  error: AlertCircle,
};

const statusBadgeClasses: Record<ProjectStatus, string> = {
  created: "bg-zinc-500/10 text-text-muted border border-zinc-500/20",
  uploaded: "bg-zinc-500/10 text-text-muted border border-zinc-500/20",
  analyzing: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
  analyzed: "bg-green-500/10 text-green-400 border border-green-500/20",
  error: "bg-red-500/10 text-red-400 border border-red-500/20",
};

// Module-level utility — avoids React purity lint error in component render
function formatRelativeTime(
  dateStr: string,
  tc: (key: string, values?: Record<string, number>) => string,
): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return tc("timeAgo.justNow");
  if (minutes < 60) return tc("timeAgo.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return tc("timeAgo.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return tc("timeAgo.daysAgo", { count: days });
  return new Date(dateStr).toLocaleDateString();
}

export function ProjectCard({
  id,
  name,
  description,
  status,
  techStack,
  updatedAt,
  fileCount,
}: ProjectCardProps) {
  const tp = useTranslations("Projects");
  const tc = useTranslations("Common");
  const StatusIcon = statusIcons[status];

  return (
    <Link href={`/projects/${id}`}>
      <div className="group relative overflow-hidden rounded-2xl border border-border-default bg-bg-surface hover:border-border-hover hover:shadow-glow-card-purple transition-all duration-300 cursor-pointer">
        {/* Top progress indicator line */}
        {status === "analyzed" && (
          <div className="h-0.5 w-full bg-gradient-to-r from-violet-500 to-cyan-500" />
        )}
        {status === "analyzing" && (
          <div className="h-0.5 w-full bg-bg-surface-hover overflow-hidden">
            <div className="h-full w-1/2 bg-gradient-to-r from-violet-500 to-cyan-500 animate-slide-right" />
          </div>
        )}
        {status !== "analyzed" && status !== "analyzing" && (
          <div className="h-0.5 w-full bg-bg-surface-hover" />
        )}

        <div className="p-5">
          {/* Project name + description */}
          <h3 className="text-base font-semibold text-text-primary group-hover:text-white transition-colors">
            {name}
          </h3>
          {description && (
            <p className="mt-1 text-sm text-text-faint line-clamp-2">
              {description}
            </p>
          )}

          {/* Tech stack badges */}
          {techStack && techStack.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {techStack.slice(0, 4).map((tech) => (
                <TechStackBadge key={tech} name={tech} />
              ))}
              {techStack.length > 4 && (
                <span className="text-xs text-text-dim">+{techStack.length - 4}</span>
              )}
            </div>
          )}

          {/* Footer: metadata + status */}
          <div className="mt-4 flex items-center justify-between text-xs text-text-dim">
            <div className="flex items-center gap-3">
              {fileCount !== undefined && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {fileCount} files
                </span>
              )}
              <span>{formatRelativeTime(updatedAt, tc)}</span>
            </div>
            <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${statusBadgeClasses[status]}`}>
              <StatusIcon className={`h-3 w-3 ${status === "analyzing" ? "animate-spin" : ""}`} />
              <span>{tp(`detail.status.${status}`)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
