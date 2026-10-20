---
trigger: always_on
---

Prisma is the primary ORM and `prisma/schema.prisma` is the canonical schema surface.

## Multi-Tenant Schema Rules

- Tenant isolation: All core operational models (`ApiKey`, `StorageDestination`, `WebhookEndpoint`, `Job`) must reference `tenantId`.
- API keys: Store only salted SHA-256 hashes in `ApiKey.keyHash`. The key prefix (`vct_live_` or `vct_test_`) may be stored unhashed for display.
- Secret credentials: `StorageDestination` credentials (access keys) must be stored encrypted or managed via IAM role assumptions.

## Deletion and Retention

- Staging files: `MediaFile.deletedAt` is written by the cleanup cron job upon expiration.
- Destination files: Saved directly to customer-owned storage; lifecycle rules on customer buckets govern customer data.

## Definition of Done (Schema Level)

- [ ] All multi-tenant foreign keys maintain `onDelete: Cascade` where appropriate.
- [ ] No raw secret keys or passwords stored unhashed.
- [ ] Indexes preserved on `[tenantId, createdAt]` and `[status]`.
- [ ] Zero em dashes or double hyphens used.
