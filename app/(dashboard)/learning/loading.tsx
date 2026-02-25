export default function LearningLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-7 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-2 h-4 w-64 rounded bg-zinc-100 dark:bg-zinc-800/50" />
      </div>

      {/* Generator placeholder */}
      <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <div className="h-5 w-36 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-3 h-10 w-full rounded-lg bg-zinc-100 dark:bg-zinc-800/50" />
      </div>

      {/* Path cards */}
      <div className="space-y-4">
        <div className="h-5 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-72 rounded bg-zinc-100 dark:bg-zinc-800/50" />
                <div className="mt-3 flex gap-2">
                  <div className="h-5 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800/50" />
                  <div className="h-5 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800/50" />
                </div>
              </div>
            </div>
            <div className="mt-4 h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
