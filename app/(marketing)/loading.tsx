/**
 * Marketing page skeleton loader.
 *
 * Route-group-specific loading UI for the marketing routes (/, /about,
 * /pricing, /how-it-works). Mirrors the real page structure so the swap
 * into content causes minimal layout shift: header, hero grid, trust strip,
 * three steps, feature cards, CTA, FAQs, footer.
 *
 * Breakpoints match the real page exactly (grid-cols-1 lg:grid-cols-2 hero,
 * md:grid-cols-3 sections) so the skeleton is responsive at every viewport.
 * Uses only CSS-animated divs: no JS, no network, no layout thrash.
 */

function HeaderSkeleton() {
  return (
    <header className="flex md:grid md:grid-cols-3 justify-between items-center w-full max-w-[1120px] mx-auto py-m3-medium px-m3-x-small md:px-0">
      <div className="flex items-center gap-m3-x-small justify-self-start p-m3-xx-small">
        <div className="skeleton w-8 h-8 rounded-m3-md" />
        <div className="skeleton h-6 w-20 rounded-m3-sm" />
      </div>
      <nav className="hidden md:flex justify-center items-center gap-m3-x-small justify-self-center" aria-hidden="true">
        {['How it works', 'About', 'Pricing'].map((item) => (
          <div key={item} className="skeleton h-8 w-24 rounded-m3-full" />
        ))}
      </nav>
      <div className="justify-self-end flex items-center gap-m3-x-small">
        <div className="hidden md:block skeleton h-9 w-28 rounded-m3-full" />
        <div className="md:hidden skeleton h-9 w-9 rounded-m3-full" />
      </div>
    </header>
  );
}

function HeroSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-m3-x-large md:gap-m3-xx-large items-center w-full">
      <div className="flex flex-col items-start text-left gap-y-m3-medium">
        <div className="flex flex-col items-start gap-y-m3-x-small w-full">
          <div className="skeleton h-5 w-44 rounded-m3-sm" />
          <div className="flex flex-wrap gap-m3-x-small">
            {['Status', 'Chat', 'Product'].map((chip) => (
              <div key={chip} className="skeleton h-9 w-24 rounded-m3-full" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-y-m3-x-small w-full">
          <div className="skeleton h-10 w-full max-w-[420px] rounded-m3-sm" />
          <div className="skeleton h-10 w-3/4 max-w-[340px] rounded-m3-sm" />
        </div>
        <div className="flex flex-col gap-y-m3-xx-small w-full">
          <div className="skeleton h-4 w-full max-w-[480px] rounded-m3-sm" />
          <div className="skeleton h-4 w-2/3 max-w-[360px] rounded-m3-sm" />
        </div>
        <div className="flex flex-col items-start gap-m3-small w-full mt-m3-x-small">
          <div className="skeleton h-12 w-full sm:w-56 rounded-m3-full" />
          <div className="skeleton h-4 w-44 rounded-m3-sm" />
        </div>
      </div>
      <div className="w-full">
        <div className="skeleton aspect-[4/3] w-full rounded-m3-xl" aria-hidden="true" />
      </div>
    </div>
  );
}

function TrustStripSkeleton() {
  const items = [1, 2, 3, 4];
  return (
    <div
      className="w-full flex flex-wrap justify-center items-center gap-x-m3-x-large gap-y-m3-small py-m3-medium border-y border-outline-variant/40 mt-m3-xxx-large md:mt-m3-6xl"
      aria-hidden="true"
    >
      {items.map((i) => (
        <div key={i} className="flex items-center gap-m3-x-small">
          <div className="skeleton w-4 h-4 rounded-m3-full" />
          <div className="skeleton h-4 w-28 rounded-m3-sm" />
        </div>
      ))}
    </div>
  );
}

function StepsSkeleton() {
  const steps = [1, 2, 3];
  return (
    <div className="w-full flex flex-col items-center gap-y-m3-x-large mt-m3-xxx-large md:mt-m3-6xl">
      <div className="text-center flex flex-col items-center gap-y-m3-x-small w-full">
        <div className="skeleton h-7 w-64 rounded-m3-sm" />
        <div className="skeleton h-5 w-80 max-w-[80%] rounded-m3-sm" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-m3-large w-full">
        {steps.map((s) => (
          <div key={s} className="flex flex-col items-center text-center gap-y-m3-medium">
            <div className="skeleton w-16 h-16 rounded-m3-full" />
            <div className="flex flex-col items-center gap-y-m3-xx-small w-full">
              <div className="skeleton h-4 w-16 rounded-m3-sm" />
              <div className="skeleton h-5 w-40 rounded-m3-sm" />
              <div className="skeleton h-4 w-48 max-w-[80%] rounded-m3-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturesSkeleton() {
  const cards = [1, 2, 3];
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-m3-large mt-m3-xxx-large md:mt-m3-6xl">
      {cards.map((c) => (
        <div
          key={c}
          className="bg-surface-container-low border border-outline-variant p-m3-large rounded-m3-lg flex flex-col gap-y-m3-medium shadow-m3-1"
        >
          <div className="skeleton w-8 h-8 rounded-m3-sm" />
          <div className="skeleton h-6 w-36 rounded-m3-sm" />
          <div className="flex flex-col gap-y-m3-xx-small">
            <div className="skeleton h-4 w-full rounded-m3-sm" />
            <div className="skeleton h-4 w-5/6 rounded-m3-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CtaSkeleton() {
  return (
    <div className="w-full bg-primary rounded-m3-xl px-m3-large py-m3-xx-large flex flex-col items-center text-center gap-y-m3-medium shadow-m3-2 mt-m3-xxx-large md:mt-m3-6xl">
      <div className="skeleton h-8 w-full max-w-md rounded-m3-sm" />
      <div className="skeleton h-5 w-full max-w-sm rounded-m3-sm" />
      <div className="skeleton h-12 w-56 rounded-m3-full mt-m3-x-small" />
    </div>
  );
}

function FaqSkeleton() {
  const rows = [1, 2, 3, 4];
  return (
    <div className="w-full flex flex-col gap-y-m3-large mt-m3-xxx-large md:mt-m3-6xl">
      <div className="skeleton h-6 w-72 mx-auto rounded-m3-sm" />
      <div className="flex flex-col gap-m3-x-small w-full max-w-2xl mx-auto">
        {rows.map((r) => (
          <div
            key={r}
            className="border border-outline-variant rounded-m3-md overflow-hidden bg-surface-container-low"
          >
            <div className="flex justify-between items-center p-m3-medium gap-m3-medium">
              <div className="skeleton h-5 w-3/5 rounded-m3-sm" />
              <div className="skeleton w-5 h-5 rounded-m3-sm shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FooterSkeleton() {
  return (
    <footer className="w-full border-t border-outline-variant/40 mt-m3-xxx-large md:mt-m3-6xl" aria-hidden="true">
      <div className="max-w-[1120px] mx-auto px-m3-medium py-m3-large flex flex-col md:flex-row justify-between items-center gap-y-m3-medium">
        <div className="flex items-center gap-m3-x-small">
          <div className="skeleton w-6 h-6 rounded-m3-sm" />
          <div className="skeleton h-4 w-24 rounded-m3-sm" />
        </div>
        <div className="flex gap-m3-large">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-4 w-16 rounded-m3-sm" />
          ))}
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLoading() {
  return (
    <main
      className="min-h-screen min-h-[100dvh] w-full flex-1 flex flex-col justify-between bg-background text-on-background pt-m3-medium pb-m3-large px-m3-large md:pt-m3-x-large md:pb-m3-xxx-large md:px-m3-xxx-large"
      role="status"
      aria-label="Loading NoBlur"
      aria-busy="true"
    >
      <HeaderSkeleton />
      <div className="flex-1 flex flex-col items-center justify-start max-w-[1120px] mx-auto w-full px-m3-medium pt-m3-xxx-large md:pt-m3-6xl pb-m3-xxx-large md:pb-m3-7xl">
        <HeroSkeleton />
        <TrustStripSkeleton />
        <StepsSkeleton />
        <FeaturesSkeleton />
        <CtaSkeleton />
        <FaqSkeleton />
      </div>
      <FooterSkeleton />
    </main>
  );
}
