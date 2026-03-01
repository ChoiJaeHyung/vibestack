const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  framework: { bg: "bg-violet-500/10", text: "text-violet-300", border: "border-violet-500/20" },
  language: { bg: "bg-blue-500/10", text: "text-blue-300", border: "border-blue-500/20" },
  database: { bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/20" },
  auth: { bg: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/20" },
  deploy: { bg: "bg-cyan-500/10", text: "text-cyan-300", border: "border-cyan-500/20" },
  styling: { bg: "bg-pink-500/10", text: "text-pink-300", border: "border-pink-500/20" },
  testing: { bg: "bg-orange-500/10", text: "text-orange-300", border: "border-orange-500/20" },
  build_tool: { bg: "bg-yellow-500/10", text: "text-yellow-300", border: "border-yellow-500/20" },
  library: { bg: "bg-indigo-500/10", text: "text-indigo-300", border: "border-indigo-500/20" },
  other: { bg: "bg-zinc-500/10", text: "text-zinc-300", border: "border-zinc-500/20" },
};

const DEFAULT_COLORS = { bg: "bg-violet-500/10", text: "text-violet-300", border: "border-violet-500/20" };

interface TechStackBadgeProps {
  name: string;
  category?: string;
  className?: string;
}

export function TechStackBadge({ name, category, className = "" }: TechStackBadgeProps) {
  const colors = category ? (CATEGORY_COLORS[category] ?? DEFAULT_COLORS) : DEFAULT_COLORS;

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border} ${className}`}
    >
      {name}
    </span>
  );
}
