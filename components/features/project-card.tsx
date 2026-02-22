import Link from "next/link";
import { FolderOpen, Clock, Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TechStackBadge } from "@/components/features/tech-stack-badge";

type ProjectStatus = "created" | "uploaded" | "analyzing" | "analyzed" | "error";

interface ProjectCardProps {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  techStack?: string[];
  updatedAt: string;
}

const statusConfig: Record<
  ProjectStatus,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
  created: { icon: Clock, label: "Created", color: "text-zinc-500" },
  uploaded: { icon: Upload, label: "Uploaded", color: "text-yellow-600" },
  analyzing: { icon: Loader2, label: "Analyzing", color: "text-blue-600" },
  analyzed: { icon: CheckCircle, label: "Analyzed", color: "text-green-600" },
  error: { icon: AlertCircle, label: "Error", color: "text-red-600" },
};

export function ProjectCard({
  id,
  name,
  description,
  status,
  techStack,
  updatedAt,
}: ProjectCardProps) {
  const statusInfo = statusConfig[status];
  const StatusIcon = statusInfo.icon;

  return (
    <Link href={`/projects/${id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <FolderOpen className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                  {name}
                </h3>
                {description && (
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                    {description}
                  </p>
                )}
              </div>
            </div>
            <div className={`flex items-center gap-1 text-sm ${statusInfo.color}`}>
              <StatusIcon
                className={`h-4 w-4 ${status === "analyzing" ? "animate-spin" : ""}`}
              />
              <span>{statusInfo.label}</span>
            </div>
          </div>

          {techStack && techStack.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {techStack.map((tech) => (
                <TechStackBadge key={tech} name={tech} />
              ))}
            </div>
          )}

          <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
            Updated {new Date(updatedAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
