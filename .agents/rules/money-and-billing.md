---
trigger: glob
---



**Gate first, rules second.** Payment integration (`/billing/checkout`,
`/billing/webhook`, `Subscription` logic) is explicitly Phase 2 in the PRD
(§18, §34). No billing, checkout, or webhook code is written in Phase 1
unless a human explicitly instructs it for this task. Seeing `Flutterwave`
locked in AGENTS.md is not authorization to start building payment flows —
it's the answer to "which provider" for whenever that work is assigned.

## When billing work is explicitly requested

**Provider**

- Flutterwave only. This supersedes any Stripe/Paystack reference in earlier
  PRD drafts (PRD §31, §32; AGENTS.md Q2). Never introduce a second payment
  provider, even as a fallback or for comparison.

**Webhooks**

- Every webhook handler verifies the `x-verif-hash` signature before
  processing anything in the payload. No exceptions, no "verify later" TODO
  (PRD §18, AGENTS.md #9).
- Webhook processing is idempotent by `tx_ref` (`Payment.reference` is
  `@unique`) — a replayed webhook must never double-credit a balance
  (PRD §21, §18).

**Card data**

- Never store raw card data anywhere. Flutterwave's hosted
  checkout/tokenization only (AGENTS.md #9).

**Ledger**

- Every balance change goes through `LedgerEntry` with `oldBalance` and
  `newBalance` recorded, `reference` set to the Flutterwave `tx_ref` when
  applicable (PRD §21). Never mutate `User.balance` directly outside a
  ledger-writing code path — that breaks the audit trail.

**Plan limits**

- Premium is a high, configured daily cap (initial: 100 jobs/day per PRD
  FR-11/§27) — never truly unbounded, even though it's marketed as
  effectively unlimited. Free tier stays at its configured cap (initial: 5/day).
- Pricing is a **Phase 2 concern** (PRD §27, §32) — no price point is set,
  displayed, or hard-coded in Phase 1 code or copy.

## Definition of done (billing-level, when applicable)

- [ ] Task was explicitly scoped as Phase 2 billing work.
- [ ] Flutterwave is the only provider referenced.
- [ ] Webhook signature verification present and tested.
- [ ] Webhook processing is idempotent by `tx_ref`.
- [ ] No raw card data stored anywhere.
- [ ] Every balance mutation goes through `LedgerEntry`.
