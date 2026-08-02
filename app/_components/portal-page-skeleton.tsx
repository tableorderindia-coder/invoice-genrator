export function PortalPageSkeleton({ table = false }: { table?: boolean }) {
  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-4 px-4 py-6 lg:px-6" aria-busy="true">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="skeleton-block h-3 w-28" />
          <div className="skeleton-block h-7 w-56" />
        </div>
        <div className="skeleton-block h-9 w-36" />
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <div className="skeleton-block h-9 w-52" />
          <div className="skeleton-block h-9 w-44" />
          <div className="skeleton-block h-9 w-36" />
          <div className="skeleton-block h-9 w-20" />
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        {table ? (
          <div className="space-y-2">
            <div className="skeleton-block h-11 w-full" />
            {Array.from({ length: 7 }, (_, index) => (
              <div key={index} className="grid grid-cols-[1.2fr_repeat(5,1fr)] gap-2">
                {Array.from({ length: 6 }, (_, cell) => (
                  <div key={cell} className="skeleton-block h-9" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="space-y-3 rounded-lg border border-gray-100 p-4">
                <div className="skeleton-block h-4 w-2/3" />
                <div className="skeleton-block h-8 w-1/2" />
                <div className="skeleton-block h-3 w-full" />
              </div>
            ))}
          </div>
        )}
      </div>
      <span className="sr-only" role="status" aria-live="polite">Loading portal data</span>
    </main>
  );
}
