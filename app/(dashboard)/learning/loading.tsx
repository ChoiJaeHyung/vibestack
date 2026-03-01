export default function LearningLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="h-7 w-24 rounded-lg skeleton" />
        <div className="mt-2 h-4 w-64 rounded-lg skeleton" />
      </div>

      {/* Generator placeholder */}
      <div className="rounded-2xl border border-border-default bg-bg-surface p-6">
        <div className="h-5 w-36 rounded-lg skeleton" />
        <div className="mt-3 h-10 w-full rounded-xl skeleton" />
      </div>

      {/* Path cards */}
      <div className="space-y-4">
        <div className="h-5 w-32 rounded-lg skeleton" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border-default bg-bg-surface p-5"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-48 rounded-lg skeleton" />
                <div className="h-3 w-72 rounded-lg skeleton" />
                <div className="mt-3 flex gap-2">
                  <div className="h-5 w-16 rounded-full skeleton" />
                  <div className="h-5 w-20 rounded-full skeleton" />
                </div>
              </div>
            </div>
            <div className="mt-4 h-2 w-full rounded-full skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}
