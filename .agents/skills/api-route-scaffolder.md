
# skills/api-route-scaffolder.md

```yaml
---
name: API Route Scaffolder
description: |
  Trigger on any new or edited route, endpoint, or server action. 
  Teaches the opening ritual in exact order (session, input, ownership, 
  limits) and the thin-handler discipline with the R31 blocked-message 
  pattern.
---

This skill provides the exact order of operations for building a Fastify route 
handler. It enforces the thin-handler discipline where business logic lives 
in `/lib`, and HTTP concerns stay in the route. Its laws live in 
`coding-standards.md`, `security.md`, and `money-and-billing.md`.

## Procedure

1. **Define the schema validation.**
   Use Fastify's `schema` property with JSON Schema to validate `body`, 
   `querystring`, and `params`. Reject invalid requests with a 400.

2. **Extract the fingerprint from request.**
   Read the anonymous fingerprint from headers (e.g., `X-Device-Fingerprint`) 
   or cookies. Hash it with a salt to produce `fingerprintHash`. 
   (security.md §2)

3. **Check ownership and quotas (the opening ritual).**
   - Check if this is the user's first job EVER for this fingerprint (reciprocity, PRD FR-11, §27). 
     Use `isFirstJobForFingerprint` from the Job model — this is a one-time exemption per 
     fingerprint at the database level, NOT a daily reset (PRD §26).
   - Check the daily free limit (read `FREE_DAILY_LIMIT` from config, not a hardcoded value). 
     If exceeded, return the loss-aversion upsell copy (FR-12). 
     (money-and-billing.md §3)

4. **Validate preset and target size.**
   Reject `targetSizeMB` for non-`CUSTOM` presets. Bound custom target to 
   1–16MB. (money-and-billing.md §4)

5. **Call the `/lib` function.**
   Pass validated, primitive arguments (strings, numbers) into the library. 
   Never pass the raw request object.

6. **Shape the standard error envelope.**
   On any error, return `{ error: { code, message } }`. 
   (AGENTS.md §18)

7. **Log the request metadata (not content).**
   Capture request duration and payload size for analytics, but never the 
   media content. (security.md §2)

## Code Skeleton (key patterns)

```typescript
// server/routes/jobs.post.ts
import { fastify } from 'fastify';
import { suggestPreset } from '../../lib/smart-defaults';
import { FREE_DAILY_LIMIT } from '../../config/platform-limits';

export default async function (app: FastifyInstance) {
  app.post('/api/v1/jobs', {
    schema: {
      body: {
        type: 'object',
        required: ['fileKey', 'preset'],
        properties: {
          fileKey: { type: 'string' },
          preset: { type: 'string', enum: ['STATUS', 'CHAT', 'CUSTOM'] },
          targetSizeMB: { type: 'number', minimum: 1, maximum: 16 },
          fingerprint: { type: 'string' },
        }
      }
    }
  }, async (request, reply) => {
    // 1. Input is already validated by schema.
    const { fileKey, preset, targetSizeMB, fingerprint } = request.body;

    // 2. Ownership: hash the fingerprint.
    const fingerprintHash = hash(fingerprint + salt);

    // 3. First-job reciprocity (PRD FR-11): check DB for first job EVER for this
    // fingerprint, NOT "first job today." This exemption applies once per fingerprint
    // at the database level, not per browser session (PRD §26).
    const isFirstJob = await checkIsFirstJobForFingerprint(fingerprintHash);

    // 4. Daily quota check (skip if first-job reciprocity applies).
    if (!isFirstJob) {
      const usedToday = await getUsageCount(fingerprintHash);
      if (usedToday >= FREE_DAILY_LIMIT) {
        return reply.code(429).send({
          error: { code: 'QUOTA_EXCEEDED', message: buildUpsellCopy(usedToday).anchorLine }
        });
      }
    }

    // 5. Logic resides in lib.
    const jobId = await createJob({ fileKey, preset, targetSizeMB, fingerprintHash });

    // 6. Standard envelope.
    return { jobId, status: 'queued' };
  });
}
