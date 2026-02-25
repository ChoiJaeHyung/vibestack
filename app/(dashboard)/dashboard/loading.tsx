export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-7 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-2 h-4 w-48 rounded bg-zinc-100 dark:bg-zinc-800/50" />
      </div>

      {/* 4 Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-12 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-20 rounded bg-zinc-100 dark:bg-zinc-800/50" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Usage section */}
      <div className="space-y-4">
        <div className="h-5 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="rounded-xl border border-zinc-200 p-5 space-y-4 dark:border-zinc-800">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-800/50" />
              <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent projects */}
      <div className="space-y-4">
        <div className="h-5 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-2 h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-800/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
