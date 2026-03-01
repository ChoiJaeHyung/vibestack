export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="h-7 w-24 rounded-lg skeleton" />
        <div className="mt-2 h-4 w-48 rounded-lg skeleton" />
      </div>

      {/* Setting cards */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border-default bg-bg-surface p-6"
          >
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded skeleton" />
              <div className="h-5 w-24 rounded-lg skeleton" />
            </div>
            <div className="mt-2 h-3 w-48 rounded-lg skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}
