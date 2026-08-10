# Contributing Guide

How to set up a development environment, contribute code, and follow COMPr's standards.

---

## Getting Started

### Prerequisites

- Node.js 18+ (`node --version`)
- PostgreSQL 14+ (`psql --version`)
- Redis 7+ (`redis-server --version`)
- FFmpeg 6+ (`ffmpeg -version`)
- Git

### Local Development Setup

```bash
# Clone repository
git clone https://github.com/olaflay/COMPr.git
cd COMPr

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Fill in local development values
# DATABASE_URL=postgresql://localhost/compr
# REDIS_URL=redis://localhost:6379
# CRYPTO_SALT=dev-salt-12345
# (R2 keys can be dummy for local testing)

# Start Docker Compose (Postgres + Redis)
docker-compose up -d

# Run database migrations
npx prisma migrate deploy

# Start dev server in one terminal
npm run dev

# Start worker in another terminal
npm run worker

# Access: http://localhost:3000 (frontend) | http://localhost:5000 (API)
```

---

## Code Standards

### TypeScript / Node.js

**File Structure:**
```
lib/          # Pure business logic (no side effects)
server/       # HTTP routes + plugins
workers/      # Background job processors
app/          # Next.js frontend (React)
components/   # Reusable React components
config/       # JSON config files (platform limits, encoding profiles)
tests/        # Unit + integration tests
prisma/       # Database schema + migrations
```

**Naming Conventions:**
- Files: `kebab-case.ts` (e.g., `error-classification.ts`)
- Functions: `camelCase` (e.g., `calculateBitrate()`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `BITRATE_FLOORS_KBPS`)
- Types: `PascalCase` (e.g., `BitrateResult`, `ProbeResult`)
- React components: `PascalCase` (e.g., `BeforeAfterSlider.tsx`)

**Line Length:** Max 100 characters (readability on split screens)

### Comments

**Write comments only when WHY is non-obvious:**
```typescript
// ✅ Good: Explains non-obvious constraint
const audioChannels = source.hasAudio ? 2 : 0;  // PRD §26: audio-less skip budget entirely

// ❌ Bad: Just restates code
const videoBitrate = totalBitrate - audioBitrate;  // Subtract audio from total
```

**No docstrings or multi-line blocks** — well-named functions are self-documenting.

### Error Handling

- **Validate at boundaries:** User input, external APIs, file uploads
- **Trust internal code:** No defensive checks between internal functions
- **Fail fast:** Throw errors early; don't mask problems with fallbacks
- **No swallowing errors:** If you catch, either log + rethrow or handle explicitly

```typescript
// ✅ Good: Validate at boundary, trust internally
export async function createJobForFingerprint(input: CreateJobInput) {
  assertTargetSizeRules(input.preset, input.targetSizeMB);  // Validate here
  // ... rest of logic doesn't re-validate
}

// ❌ Bad: Defensive checks inside business logic
const videoBitrate = Math.max(0, bitrate - audio);  // If audio calc is wrong, silently masks it
```

---

## Testing

### Run Tests

```bash
npm run test               # All tests
npm run test:watch        # Watch mode (rerun on change)
npm run test:coverage     # Coverage report
npm run test:integration  # Integration tests (real FFmpeg)
```

### Test Patterns

**Unit Tests (lib/*.ts):**
```typescript
import { describe, it, expect } from 'vitest';
import { calculateBitrate } from './bitrate';

describe('calculateBitrate', () => {
  it('should match PRD Section 14 worked example', () => {
    const result = calculateBitrate(16, 30, 2);
    expect(result.videoBitrateFinalKbps).toBeCloseTo(4188, -1);
  });

  it('should skip audio bitrate for audio-less input', () => {
    const result = calculateBitrate(16, 30, 0);
    expect(result.audioBitrateKbps).toBe(0);
  });
});
```

**Integration Tests:**
```typescript
// Test full pipeline with real FFmpeg
it('should encode and verify VMAF score', async () => {
  const result = await runAdaptivePipeline({
    inputPath: './test_fixtures/sample.mp4',
    outputDir: './temp',
    targetSizeMB: 8,
  });
  expect(result.plan.crf).toBeDefined();
  expect(result.attempts[0].vmaf?.score).toBeGreaterThan(75);
});
```

### Coverage Targets

- **Bitrate math:** 100% (critical path)
- **Resolution selection:** 100%
- **Error classification:** 100%
- **UI components:** 80%+ (visual testing harder)
- **Overall:** 75%+

---

## Git Workflow

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `perf`, `ci`

**Examples:**
```bash
# Feature
git commit -m "feat(encoding): add AV1 fallback for document preview"

# Bug fix
git commit -m "fix(pipeline): audio-less videos waste 96kbps"

# Refactor
git commit -m "refactor(polling): denormalize queuePosition to eliminate O(n) scan"

# Docs
git commit -m "docs: add deployment guide for Railway"
```

### Pull Request Process

1. **Create branch:** `git checkout -b fix/issue-123-audio-bitrate`
2. **Make changes:** Follow code standards above
3. **Test:** `npm run test && npm run test:integration`
4. **Commit:** Use conventional format
5. **Push:** `git push origin fix/issue-123-audio-bitrate`
6. **Open PR:** Link to GitHub issue, describe changes + testing
7. **Review:** Address feedback, update PR
8. **Merge:** Rebase (not squash) to preserve commit history

**PR Template:**
```markdown
## Description
What problem does this solve? Link to issue if applicable.

## Changes
- Bullet list of what changed
- Why this approach was chosen

## Testing
- [ ] Added tests for new logic
- [ ] Verified integration tests pass
- [ ] Tested manually in browser/API

## Screenshots (if UI change)
Attach before/after if applicable.
```

---

## Development Workflow

### Hot Reload

```bash
npm run dev
# Frontend: Changes to app/* reload automatically (Next.js)
# Backend: Changes to lib/*, server/* require manual restart (Fastify not watch-enabled)
```

### Database Changes

**Add column to schema:**
```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name add_queue_position

# 3. Migration auto-runs + client regenerated
# 4. Commit: both schema.prisma + migration SQL file
```

**Reset local database (destructive):**
```bash
npx prisma migrate reset
# Deletes all data, re-runs all migrations
```

### Debug Logging

```typescript
// lib/pipeline.ts
console.log(`[Pipeline] Job ${jobId} started with target size ${targetSizeMB}MB`);

// server/routes/jobs.ts
request.log.debug({ jobId }, 'Creating job');

// Check logs
docker logs compr-web_1 | grep Pipeline
```

---

## Performance Tips

### Before Submitting a PR

- **Run tests:** `npm run test`
- **Check bundle size:** `npm run build && npm analyze`
- **Lint:** `npm run lint` (ESLint + Prettier via pre-commit hook)
- **Type check:** `npm run type-check` (TypeScript strict mode)

### Common Bottlenecks to Avoid

1. **N+1 queries:** Eager-load related data in Prisma
   ```typescript
   // ❌ Bad: Queries user inside loop
   const jobs = await prisma.job.findMany();
   for (const job of jobs) {
     const user = await prisma.user.findUnique({ where: { id: job.userId } });
   }

   // ✅ Good: Eager-load in one query
   const jobs = await prisma.job.findMany({ include: { user: true } });
   ```

2. **Unindexed queries:** Check `.prisma/schema.prisma` for `@@index`
   ```prisma
   model Job {
     @@index([status])  // Frequent WHERE clause
     @@index([fingerprintHash, createdAt])  // Composite index for sorted queries
   }
   ```

3. **Full queue scans:** Use denormalized fields (e.g., `queuePosition`)
   - ❌ Don't: `await queue.getJobs(['waiting'])` to find job #N
   - ✅ Do: Query `Job.queuePosition` from database

4. **Blocking operations:** Keep handlers async
   ```typescript
   // ❌ Bad: synchronous
   const hash = crypto.pbkdfSync(...);

   // ✅ Good: async
   const hash = await crypto.pbkdf(...);
   ```

---

## Coding Checklist

Before pushing your PR:

- [ ] Code follows naming conventions (kebab-case files, camelCase functions)
- [ ] Comments explain WHY, not WHAT
- [ ] No console.log() left in production code (use logger instead)
- [ ] Tests added/updated for new logic
- [ ] No hardcoded values (use config/env/constants)
- [ ] No `.catch(() => {})` without logging
- [ ] Commit message follows conventional format
- [ ] No secrets committed to git (.env in .gitignore)
- [ ] Database changes include migration files
- [ ] PRD or comments reference where applicable (e.g., "FR-7", "PRD §14")

---

## Common Tasks

### Add a New Encoding Profile

1. **Update config:**
   ```json
   // config/encoding-profiles.json
   {
     "name": "av1_hq",
     "codec": "libsvtav1",
     "crf": 18,
     "speedPreset": "6",
     "minMotionScore": 0.2
   }
   ```

2. **Update policy engine:**
   ```typescript
   // lib/policy-engine.ts
   export function selectProfile(analysis, targetSize, ...) {
     if (analysis.hasFaces && analysis.avgMotionScore > 0.2) {
       return profiles['av1_hq'];  // High-motion scenes need better quality
     }
     // ...
   }
   ```

3. **Test:**
   ```bash
   npm run test:integration -- --grep "policy-engine"
   ```

### Add a New API Endpoint

1. **Create route handler:**
   ```typescript
   // server/routes/my-route.ts
   export default async (app: FastifyInstance) => {
     app.get('/api/v1/my-endpoint', async (req, res) => {
       // ...
     });
   };
   ```

2. **Register in API server:**
   ```typescript
   // server/index.ts
   app.register(myRoute);
   ```

3. **Add schema validation:**
   ```typescript
   const schema = z.object({ param: z.string() });
   app.get('/api/v1/my-endpoint', { schema: { body: schema } }, ...);
   ```

### Add a New Test

```bash
# Create test file
touch tests/my-feature.test.ts

# Write test
npm run test:watch

# Run until green
npm run test -- my-feature
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Database connection refused** | Check `DATABASE_URL` in `.env`, ensure Postgres running (`docker-compose up -d`) |
| **Redis connection refused** | Ensure Redis running, check `REDIS_URL` |
| **FFmpeg not found** | Install: `brew install ffmpeg` (Mac) or `apt-get install ffmpeg` (Linux) |
| **Port 3000 already in use** | Kill process: `lsof -i :3000` and `kill -9 <PID>` |
| **Prisma client out of sync** | Regenerate: `npx prisma generate` |
| **Tests timeout** | Some integration tests slow; use `--timeout 30000` for those |

---

## Resources

- **PRD:** [docs/COMPr-PRD-v1.md](./COMPr-PRD-v1.md) — Full spec
- **Architecture:** [docs/DEPLOYMENT.md](./DEPLOYMENT.md) §2 — System design
- **Prisma Docs:** https://www.prisma.io/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Fastify Docs:** https://www.fastify.io/docs
- **BullMQ Docs:** https://docs.bullmq.io

---

Questions? Open an issue or email [dev@compr.app](mailto:dev@compr.app)
