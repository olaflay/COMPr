---
name: flutterwave-billing
description: Use for anything where money or credits move — Flutterwave checkout, payment webhooks, subscription status, or ledger/balance changes. Also use to check whether billing work is even in scope for the current task.
---

# Flutterwave Billing

Teaches the order of operations inside a payment/webhook handler, and the
gate that decides whether this skill should be running at all. Laws live in
`money-and-billing.md` and PRD §18, §21, §27.

## Procedure

1. **Check the gate first.** Billing/checkout/webhook code is Phase 2
   (PRD §18, §34). Before writing any billing code, confirm the current
   task explicitly asked for Phase 2 billing work. If it didn't, stop —
   this skill does not apply, and no `/billing/*` route or `Payment`/
   `LedgerEntry` code should be touched (`money-and-billing.md`).

2. **Confirm Flutterwave is the only provider referenced anywhere in the
   task** — no Stripe/Paystack, even from an older draft or an example
   found elsewhere (PRD §31, §32, AGENTS.md Q2).

3. **For a webhook handler, verify the signature before touching the
   payload.** Check `x-verif-hash` against the configured webhook secret.
   If it doesn't match, reject immediately — do not parse or act on the
   body first and check the signature after (`money-and-billing.md`, PRD §18).

4. **Check idempotency next, before any balance change.** Look up
   `Payment.reference` (the Flutterwave `tx_ref`) — if a `Payment` row with
   this reference already exists and is `successful`, return success
   without processing again. A replayed webhook must never double-credit
   (`money-and-billing.md`, PRD §21).

5. **Write the ledger entry before or atomically with the balance update —
   never after.** Every balance mutation gets a paired `LedgerEntry` with
   `oldBalance` and `newBalance` recorded and `reference` set to the
   `tx_ref`. Do this in a single transaction so a crash mid-update can't
   leave a balance changed with no ledger row, or a ledger row with no
   balance change.

6. **Update `Payment.status`** (`successful`/`failed`/`pending`) as part of
   the same transaction, keyed by `tx_ref`.

7. **Never store raw card data.** Only Flutterwave's hosted
   checkout/tokenization is used — nothing about card number, CVV, or
   expiry is ever persisted (`money-and-billing.md`, AGENTS.md #9).

8. **Respect plan caps, not "unlimited."** Premium grants a high configured
   daily cap (initial: 100 jobs/day), never a truly unbounded value in code
   — even though it's marketed as effectively unlimited (PRD FR-11, §27).

9. **Return `{ status: 'success' }`** on successful webhook processing
   (PRD §18) — the standard shape, not a custom response.

## Code skeleton

```typescript
// server/routes/billing.ts
export async function handleWebhook(req: FastifyRequest, reply: FastifyReply) {
  // 1. Gate already passed — this task explicitly opened Phase 2 billing.

  // 3. Signature check BEFORE trusting the payload
  const signature = req.headers['x-verif-hash'];
  if (!verifyFlutterwaveSignature(signature, process.env.FLW_WEBHOOK_SECRET)) {
    return reply.code(401).send({ error: { code: 'INVALID_SIGNATURE', message: 'Rejected.' } });
  }

  const payload = req.body;
  const txRef = payload.data.tx_ref;

  // 4. Idempotency BEFORE any balance change
  const existing = await prisma.payment.findUnique({ where: { reference: txRef } });
  if (existing?.status === 'successful') {
    return reply.send({ status: 'success' }); // already processed, no-op
  }

  // 5-6. Ledger + balance + payment status, one transaction
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: payload.data.customer_id } });
    const newBalance = user.balance + payload.data.amount;

    await tx.ledgerEntry.create({
      data: {
        userId: user.id,
        amount: payload.data.amount, // kobo
        oldBalance: user.balance,
        newBalance,
        type: 'CREDIT',
        reference: txRef,
      },
    });
    await tx.user.update({ where: { id: user.id }, data: { balance: newBalance } });
    await tx.payment.upsert({
      where: { reference: txRef },
      update: { status: 'successful' },
      create: { reference: txRef, status: 'successful', amount: payload.data.amount, userId: user.id },
    });
  });

  return reply.send({ status: 'success' }); // 9. standard shape
}
```

## Traps

- Writing any billing code when the task never explicitly opened Phase 2 —
  building ahead of an unlocked price point (PRD §32 flags it as open).
- Parsing and acting on the webhook payload before checking the signature.
- Crediting a balance without checking `Payment.reference` first — a
  retried/replayed webhook double-credits.
- Updating `User.balance` outside the same transaction as the `LedgerEntry`
  write — leaves the two out of sync if the process crashes mid-update.
- Marking premium as `Infinity`/`null` cap in code because it's "marketed as
  unlimited" — it must still be a configured numeric ceiling.

## Verify before done

- [ ] This task explicitly requested Phase 2 billing work.
- [ ] Only Flutterwave appears anywhere in the new code.
- [ ] Signature verification happens before the payload is trusted.
- [ ] Idempotency check by `tx_ref` happens before any balance mutation.
- [ ] Balance update and `LedgerEntry` write happen in one transaction.
- [ ] No raw card data field exists anywhere in the change.
- **Tests to write:** a replayed-webhook test (same `tx_ref` twice → balance changes once), a bad-signature test (rejected before any DB write), and a test asserting `LedgerEntry.newBalance - LedgerEntry.oldBalance === LedgerEntry.amount`.
