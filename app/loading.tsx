export default function Loading() {
  return (
    <main className="min-h-screen bg-background text-on-background p-m3-medium md:p-m3-x-large">
      <div className="max-w-xl mx-auto flex flex-col gap-m3-large">
        {/* Header skeleton */}
        <div className="flex justify-between items-center pb-m3-medium border-b border-outline-variant">
          <div className="flex items-center gap-m3-x-small">
            <div className="skeleton w-6 h-6 rounded-m3-sm" />
            <div className="skeleton h-5 w-24 rounded-m3-sm" />
          </div>
          <div className="skeleton h-4 w-32 rounded-m3-sm" />
        </div>

        {/* Upload card skeleton */}
        <section className="bg-surface-container-low border border-outline-variant rounded-m3-lg p-m3-large shadow-m3-1 flex flex-col gap-m3-large">
          <div className="skeleton h-6 w-40 rounded-m3-sm" />
          <div className="skeleton h-32 w-full rounded-m3-md" />
          <div className="flex gap-m3-x-small">
            <div className="skeleton h-10 flex-1 rounded-m3-full" />
            <div className="skeleton h-10 flex-1 rounded-m3-full" />
            <div className="skeleton h-10 flex-1 rounded-m3-full" />
          </div>
          <div className="skeleton h-12 w-full rounded-m3-full" />
        </section>
      </div>
    </main>
  );
}
