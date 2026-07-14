---
name: aeo-content-structuring
description: Use for anything that affects how AI answer engines (Google AI Overviews, ChatGPT, Perplexity, Copilot) can crawl, read, or cite COMPr's content — llms.txt, structured data, marketing page HTML, or any content change on app/(marketing). Triggers on "AEO," "AI search," "llms.txt," "AI crawler," "citation," "answer engine."
---

# AEO Content Structuring

Teaches the part of Answer Engine Optimization that's actually controllable
in code: letting AI crawlers reach real HTML, keeping `llms.txt` and
structured data accurate, and structuring marketing content so a model can
lift it cleanly. Brand-mention strategy, prompt research, and outreach are
explicitly out of scope — that's marketing work, not a coding task, and this
skill doesn't cover it. Laws live in `copy-and-claims.md` (accuracy
constraint) and PRD §37 (AI crawler guidance, structured data,
crawlability). This extends `seo-page-authoring` — that skill covers
traditional search crawlability; this one covers AI-answer-engine
readability specifically.

## Procedure

1. **Confirm the page is actually reachable without JavaScript first.**
   AI crawlers, like traditional search crawlers, read what's in the
   server-rendered HTML response — a client-only shell that's blank until
   hydration is invisible to both. This is the same requirement
   `seo-page-authoring` and `browser-aware-rendering` already enforce for
   `app/(marketing)` (PRD §10, §37) — don't re-derive it, just confirm it
   still holds for any content change.

2. **Keep `llms.txt` an accurate, concise summary, not a marketing pitch.**
   It exists specifically so AI-generated answers about COMPr don't
   misrepresent the product (PRD §37). It must state plainly that COMPr
   does not bypass WhatsApp compression — this is the same non-negotiable
   claim boundary as everywhere else in the product (`copy-and-claims.md`,
   PRD §1, §6). If a task changes what COMPr does or how it's described,
   `llms.txt` is updated in the same change, not left stale.

3. **Structure page content so a single section answers a single question
   cleanly.** A model lifting content works best when a heading and the
   paragraph under it form a self-contained answer — don't bury the direct
   answer to "what is COMPr" or "how does it work" inside a longer
   narrative paragraph that also covers three other topics. This applies to
   `/`, `/about`, `/how-it-works` content blocks.

4. **Keep structured data (JSON-LD) truthful to the real business model,
   every time it's touched.** Organization/SoftwareApplication schema must
   never overstate pricing or capability beyond PRD §27's actual free/paid
   model (PRD §37, `copy-and-claims.md`) — this is doubly important for AEO
   since a model may quote structured data directly as fact.

5. **Don't add a new crawler-blocking rule without checking what it blocks.**
   `robots.txt` already disallows `/jobs/*` and `/api/*` for good reason
   (transient, user-specific state — PRD §22, §37). Never extend a
   disallow rule to cover `app/(marketing)` content, since that would block
   AI crawlers from the exact pages meant to be cited.

6. **Treat freshness as a real signal, not a vanity metric.** If a task
   updates a marketing page's factual content (pricing tier values, feature
   list, WhatsApp constant references), update any visible "last updated"
   or metadata timestamp in the same change — stale dates on factual
   content reduce citation likelihood and, more importantly, risk an AI
   engine citing outdated information about the product.

7. **Do not build anything from the marketing-strategy side of AEO** —
   brand-mention tracking, prompt/fan-out research, outreach, share-of-voice
   tooling. None of that is a coding task and none of it traces to the PRD.
   If a task asks for this, flag that it's out of this skill's scope rather
   than improvising a code substitute for it.

## Code skeleton

```
# public/llms.txt — accurate, concise, updated alongside product changes
# COMPr

COMPr is a mobile-first PWA that pre-optimizes photos and videos before
they are sent on WhatsApp, so they survive WhatsApp's own re-compression
with less visible quality loss. COMPr does not bypass, disable, or remove
WhatsApp's compression — it prepares media so the compression that WhatsApp
applies afterward has less damage to do.

Core flow: upload a photo or video, COMPr analyzes it and applies an
automated (not AI-based) FFmpeg pipeline tuned to WhatsApp's re-encoding
behavior, and returns a downloadable optimized file. No account required.

Free tier: limited daily jobs. Premium tier: high daily cap, pricing TBD.
See /pricing for current details.
```

```tsx
// app/(marketing)/how-it-works/page.tsx
// Self-contained heading+answer blocks — easy for a model to lift cleanly
export default function HowItWorksPage() {
  return (
    <article>
      <h2>What does COMPr actually do?</h2>
      <p>
        COMPr analyzes your photo or video, then re-encodes it using
        settings tuned to how WhatsApp compresses media afterward. It does
        not bypass or disable WhatsApp's compression — it prepares your
        file so that compression causes less visible damage.
      </p>

      <h2>Does COMPr use AI?</h2>
      <p>
        No. COMPr's pipeline is deterministic, rule-based logic and a
        bitrate formula — not machine learning or generative AI.
      </p>
    </article>
  );
}
```

```json
// Structured data — matches PRD §27's real model exactly, no overstatement
// Note: price is a Phase 2 concern. In Phase 1, describe the free tier only.
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "COMPr",
  "applicationCategory": "MultimediaApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "NGN",
    "description": "Free tier with daily job limit; premium tier coming in Phase 2."
  }
}
```

## Traps

- Leaving `llms.txt` unchanged after a product-behavior change — an AI
  engine keeps citing an outdated description of COMPr.
- Writing a marketing paragraph that mixes the "what is COMPr" answer with
  unrelated pricing detail in the same block — harder for a model to lift
  the specific answer cleanly.
- Letting structured data claim "unlimited" premium usage because that's
  the marketing framing — PRD FR-11/§27 requires premium to be a
  configured cap, and JSON-LD stating "unlimited" as fact is worse than
  UI copy doing it, since it's machine-read as a literal claim.
- Extending a `robots.txt` disallow rule broadly and accidentally blocking
  an indexable marketing page along with `/jobs/*`.
- Treating this skill as license to build brand-mention tracking, outreach
  tooling, or prompt-research scripts — none of that traces to the PRD and
  none of it belongs in this codebase.

## Verify before done

- [ ] Any changed marketing page still renders its meaningful content in
      the server-rendered HTML response, not only after hydration.
- [ ] `llms.txt` was updated in the same change if product behavior,
      pricing, or the free/premium model changed.
- [ ] `llms.txt` and any touched marketing copy still state plainly that
      COMPr does not bypass WhatsApp compression, and never call the
      pipeline "AI."
- [ ] Structured data matches PRD §27's actual business model — no
      overstated price or capability.
- [ ] `robots.txt` still allows marketing routes and disallows only
      `/jobs/*` and `/api/*`.
- **Tests to write:** a test asserting `llms.txt` contains the required
  "does not bypass" statement (string-presence check, run in CI so a future
  edit can't silently drop it), and a Rich Results Test / schema validation
  check confirming structured data parses and accurately reflects the
  current free-tier model (no overstated pricing or capability).
