export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-7 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-2 h-4 w-48 rounded bg-zinc-100 dark:bg-zinc-800/50" />
      </div>

      {/* Setting cards */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800"
          >
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-5 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <div className="mt-2 h-3 w-48 rounded bg-zinc-100 dark:bg-zinc-800/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
