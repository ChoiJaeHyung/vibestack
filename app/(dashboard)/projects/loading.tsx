export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-24 rounded-lg skeleton" />
          <div className="mt-2 h-4 w-48 rounded-lg skeleton" />
        </div>
        <div className="h-9 w-32 rounded-xl skeleton" />
      </div>

      {/* Project cards */}
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border-default bg-bg-surface p-5"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-40 rounded-lg skeleton" />
                <div className="h-3 w-56 rounded-lg skeleton" />
              </div>
              <div className="h-6 w-16 rounded-full skeleton" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
