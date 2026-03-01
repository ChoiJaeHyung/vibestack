export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="h-7 w-32 rounded-lg skeleton" />
        <div className="mt-2 h-4 w-48 rounded-lg skeleton" />
      </div>

      {/* 4 Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border-default bg-bg-surface p-5"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl skeleton" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-12 rounded-lg skeleton" />
                <div className="h-3 w-20 rounded-lg skeleton" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Usage section */}
      <div className="space-y-4">
        <div className="h-5 w-16 rounded-lg skeleton" />
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 rounded-lg skeleton" />
              <div className="h-2 w-full rounded-full skeleton" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent projects */}
      <div className="space-y-4">
        <div className="h-5 w-28 rounded-lg skeleton" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border-default bg-bg-surface p-5"
          >
            <div className="h-4 w-40 rounded-lg skeleton" />
            <div className="mt-2 h-3 w-24 rounded-lg skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}
