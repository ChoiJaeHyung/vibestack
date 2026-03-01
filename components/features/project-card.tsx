import Link from "next/link";
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

const statusConfig: Record<
  ProjectStatus,
  { icon: React.ComponentType<{ className?: string }>; label: string; badgeClass: string }
> = {
  created: { icon: Clock, label: "Created", badgeClass: "bg-zinc-500/10 text-text-muted border border-zinc-500/20" },
  uploaded: { icon: Upload, label: "Uploaded", badgeClass: "bg-zinc-500/10 text-text-muted border border-zinc-500/20" },
  analyzing: { icon: Loader2, label: "Analyzing", badgeClass: "bg-violet-500/10 text-violet-400 border border-violet-500/20" },
  analyzed: { icon: CheckCircle, label: "Analyzed", badgeClass: "bg-green-500/10 text-green-400 border border-green-500/20" },
  error: { icon: AlertCircle, label: "Error", badgeClass: "bg-red-500/10 text-red-400 border border-red-500/20" },
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
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
  const statusInfo = statusConfig[status];
  const StatusIcon = statusInfo.icon;

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
              <span>{formatRelativeTime(updatedAt)}</span>
            </div>
            <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${statusInfo.badgeClass}`}>
              <StatusIcon className={`h-3 w-3 ${status === "analyzing" ? "animate-spin" : ""}`} />
              <span>{statusInfo.label}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
