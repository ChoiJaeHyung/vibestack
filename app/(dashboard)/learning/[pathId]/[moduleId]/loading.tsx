export default function ModuleLoading() {
  return (
    <div className="space-y-6 pb-20">
      {/* Back navigation */}
      <div className="h-4 w-32 rounded-lg skeleton" />

      {/* Module header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 rounded-lg skeleton" />
          <div className="h-4 w-12 rounded-lg skeleton" />
        </div>
        <div className="mt-2 h-7 w-72 rounded-lg skeleton" />
        <div className="mt-2 h-4 w-96 rounded-lg skeleton" />
      </div>

      {/* Content sections */}
      <div className="divide-y divide-border-default">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="py-8 first:pt-0 last:pb-0">
            {/* Section type label */}
            <div className="mb-3 flex items-center gap-1.5">
              <div className="h-3.5 w-3.5 rounded skeleton" />
              <div className="h-3 w-12 rounded-lg skeleton" />
            </div>

            {/* Section title */}
            <div className="mb-2 h-5 w-56 rounded-lg skeleton" />

            {/* Section body */}
            <div className="space-y-2">
              <div className="h-4 w-full rounded-lg skeleton" />
              <div className="h-4 w-full rounded-lg skeleton" />
              <div className="h-4 w-3/4 rounded-lg skeleton" />
            </div>

            {/* Code block for some sections */}
            {i % 2 === 1 && (
              <div className="mt-4 h-32 w-full rounded-xl skeleton" />
            )}
          </div>
        ))}
      </div>

      {/* Bottom action bar skeleton */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:left-64">
        <div className="border-t border-border-default bg-background/90 backdrop-blur-xl backdrop-saturate-150">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-2.5">
            <div className="h-8 w-20 rounded-xl skeleton" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-16 rounded-xl skeleton" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
