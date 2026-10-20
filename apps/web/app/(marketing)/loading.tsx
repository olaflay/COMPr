/**
 * Marketing page skeleton loader.
 *
 * Route-group-specific loading UI for the marketing routes (/, /about,
 * /pricing, /how-it-works). Provides an elegant, neutral loading state
 * that smoothly transitions into any sub-page without layout flashing.
 */

function HeaderSkeleton() {
  return (
    <header className="flex md:grid md:grid-cols-3 justify-between items-center w-full max-w-[1080px] mx-auto py-m3-small px-m3-x-small md:px-0">
      <div className="flex items-center gap-m3-x-small justify-self-start p-m3-xx-small">
        <div className="skeleton w-7 h-7 rounded-m3-md" />
        <div className="skeleton h-5 w-16 rounded-m3-sm" />
      </div>
      <nav className="hidden md:flex justify-center items-center gap-m3-xx-small justify-self-center" aria-hidden="true">
        {['Home', 'How it works', 'About', 'Pricing'].map((item) => (
          <div key={item} className="skeleton h-7 w-20 rounded-m3-full" />
        ))}
      </nav>
      <div className="justify-self-end flex items-center gap-m3-x-small">
        <div className="hidden md:block skeleton h-7 w-24 rounded-m3-full" />
        <div className="md:hidden skeleton h-7 w-7 rounded-m3-full" />
      </div>
    </header>
  );
}

function ContentSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-start max-w-[800px] mx-auto w-full px-m3-medium py-m3-large md:py-m3-x-large gap-y-m3-large">
      <div className="w-full flex flex-col items-center gap-y-m3-x-small text-center">
        <div className="skeleton h-8 w-64 max-w-[85%] rounded-m3-sm" />
        <div className="skeleton h-4 w-96 max-w-[70%] rounded-m3-sm" />
      </div>
      <div className="w-full flex flex-col gap-y-m3-medium mt-m3-medium">
        <div className="skeleton h-32 w-full rounded-m3-lg" />
        <div className="skeleton h-24 w-full rounded-m3-lg" />
        <div className="skeleton h-24 w-full rounded-m3-lg" />
      </div>
    </div>
  );
}

function FooterSkeleton() {
  return (
    <footer className="w-full border-t border-outline-variant/40 mt-m3-large" aria-hidden="true">
      <div className="max-w-[1080px] mx-auto px-m3-medium py-m3-medium flex flex-col sm:flex-row justify-between items-center gap-y-m3-small">
        <div className="skeleton h-4 w-32 rounded-m3-sm" />
        <div className="flex gap-m3-medium">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-4 w-14 rounded-m3-sm" />
          ))}
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLoading() {
  return (
    <main
      className="min-h-screen min-h-[100dvh] w-full flex-1 flex flex-col justify-between bg-background text-on-background px-m3-medium md:px-m3-large py-m3-small"
      role="status"
      aria-label="Loading page"
      aria-busy="true"
    >
      <HeaderSkeleton />
      <ContentSkeleton />
      <FooterSkeleton />
    </main>
  );
}
