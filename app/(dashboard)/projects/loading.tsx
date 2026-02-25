export default function ProjectsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-2 h-4 w-48 rounded bg-zinc-100 dark:bg-zinc-800/50" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>

      {/* Project cards */}
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-56 rounded bg-zinc-100 dark:bg-zinc-800/50" />
              </div>
              <div className="h-6 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
