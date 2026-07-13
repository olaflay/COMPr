
# skills/flutterwave-billing.md

```yaml
---
name: Flutterwave Billing
description: |
  Trigger on anything where kobo moves: payments, webhooks, subscriptions, 
  credits, refunds, or the watermark gate. Teaches the webhook order of 
  operations, idempotency by reference, and atomic ledger-paired balance 
  changes.
---

This skill defines the exact order of operations for payment processing using 
Flutterwave. It enforces webhook signature verification, idempotency, and 
atomic balance updates. Its laws live in `money-and-billing.md`.

**⚠ PHASE 2 ONLY — DO NOT USE IN PHASE 1 MVP.**
Payment integration is explicitly a Phase 2 feature (PRD §34). The MVP is login-free 
(AGENTS.md Q3 Rule 4) and the `User` model is not active until Phase 2. 
Do not implement any code from this skill until Phase 2 is explicitly authorized by a human.

## Procedure

1. **Verify the webhook signature.**
   Check the `x-verif-hash` header against the SHA‑256 hash of the 
   request body + secret key. If invalid, return `401 Unauthorized`. 
   (money-and-billing.md §2)

2. **Extract and validate the reference.**
   Use `data.tx_ref` (or equivalent) as the idempotency key. Ensure the 
   reference has not been processed before.

3. **Check the payment status.**
   Only process `status === "successful"`. Reject `failed` or `pending` events.

4. **Lock the user's balance or subscription row.**
   Use a database transaction (`Prisma.$transaction`) to read the current 
   state and update it atomically.

5. **Apply the ledger-paired balance change.**
   If updating credits, also create a `LedgerEntry` record showing the 
   change (old balance, new balance, reason). (money-and-billing.md §5)

6. **Update the user's premium status.**
   Set `isPremium = true` and record `premiumExpiresAt` based on the 
   subscription plan.

7. **Return a success response.**
   Flutterwave expects `200 OK` with a JSON body `{ status: 'success' }`. 
   Do not retry webhooks if you have already processed them.

## Code Skeleton (key patterns)

```typescript
// server/routes/billing.webhook.ts
app.post('/api/v1/billing/webhook', async (request, reply) => {
  const signature = request.headers['x-verif-hash'];
  const computed = crypto.createHmac('sha256', process.env.FLUTTERWAVE_SECRET)
                          .update(JSON.stringify(request.body))
                          .digest('hex');
  if (signature !== computed) return reply.code(401).send({ error: 'Invalid signature' });

  const { tx_ref, status, amount } = request.body.data;
  if (status !== 'successful') return { status: 'ignored' };

  // Idempotency check — lookup by tx_ref, not by user id.
  const existing = await prisma.payment.findUnique({ where: { reference: tx_ref } });
  if (existing) return { status: 'already_processed' };

  // User lookup by flutterwaveCustomerId, not by User.id (PRD §21).
  const flutterwaveCustomerId = request.body.data.customer.id;
  const user = await prisma.user.findUnique({
    where: { flutterwaveCustomerId }
  });
  if (!user) return reply.code(404).send({ error: 'User not found' });

  // Subscription duration from config, not hardcoded.
  const subscriptionDays = SUBSCRIPTION_DURATION_DAYS; // from config
  const premiumExpiresAt = new Date(Date.now() + subscriptionDays * 86400000);

  // Atomic transaction.
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { isPremium: true, premiumExpiresAt }
    });
    await tx.ledgerEntry.create({
      data: { userId: user.id, amount, oldBalance: user.balance, newBalance: user.balance + amount, type: 'CREDIT' }
    });
    await tx.payment.create({ data: { reference: tx_ref, status, amount, userId: user.id } });
  });

  return { status: 'success' };
});
