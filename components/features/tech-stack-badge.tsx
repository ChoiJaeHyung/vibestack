interface TechStackBadgeProps {
  name: string;
  className?: string;
}

export function TechStackBadge({ name, className = "" }: TechStackBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 ${className}`}
    >
      {name}
    </span>
  );
}
