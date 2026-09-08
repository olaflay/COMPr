# NoBlur — Pending Manual Tasks

Things that cannot be done in code or on this machine; they need **your**
credentials, manual actions in a provider console, or an approval decision.
All code-level work that *can* be complete is already landed and verified.

Every item traces to a TASKLOG.md code so you can cross-reference.

---

## 1. Secrets & environment variables (you supply values → `.env`)

Copy `.env.example` to `.env` and fill in the placeholders. Never commit `.env`.

| Variable | Where to get it | Item |
|---|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Your Postgres (local or managed) connection strings | — |
| `POSTGRES_PASSWORD` | **Choose a strong value** (REQUIRED for `docker compose up`) | D-2 |
| `REDIS_PASSWORD` | **Choose a strong value** (REQUIRED for `docker compose up`) | D-2 |
| `TIGRIS_ACCESS_KEY_ID` / `TIGRIS_SECRET_ACCESS_KEY` | Tigris console → App Keys (`tid_…` / `tsec_…`) | T-3 |
| `TIGRIS_ENDPOINT` / `TIGRIS_REGION` | Keep defaults: `https://t3.storage.dev`, `auto` | (defaults) |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Sentry dashboard → project DSN (same value, two names) | (defaults) |
| `SENTRY_AUTH_TOKEN` | Sentry dashboard → **rotate/regenerate after the P0-1 leak** | P0-1 |
| `NEXT_PUBLIC_POSTHOG_KEY` / `POSTHOG_API_KEY` | PostHog project / personal API key | (supply) |
| `FLUTTERWAVE_*` | Flutterwave dev keys (Phase 2 billing — not yet needed to run core flows) | (supply) |
| `CRYPTO_SALT` | `openssl rand -base64 32` (strong, random) | P0-3 |

---

## 2. Provision infrastructure (manual console actions)

1. **Tigris buckets (T-3, T-5):** create `noblur-uploads` and `noblur-outputs`
   in the Tigris console *before* the first upload. Fill the two `TIGRIS_*` keys
   above. Until this is done, uploads/processing cannot persist objects.
2. **Postgres + Redis (D-2):** provide strong `POSTGRES_PASSWORD` / `REDIS_PASSWORD`.
   `docker compose up` refuses to start infra with empty/default passwords.

---

## 3. Verification you must run (needs real environment)

- **T-6 — Real Tigris round-trip:** with buckets + keys set, run an upload →
  process → download against real Tigris (the S3-API path is already covered by
  unit tests, but only live creds prove the round trip).
- **Docker image build + compose health:** Docker CLI is present but the Docker
  Desktop engine is **not running on this machine**, so image builds and
  `docker compose health` cannot be verified here. Run on a Docker-enabled host,
  then re-check the deploy checklist.
- **Sentry source-map upload:** set `SENTRY_SOURCE_MAPS=1` only in deployment/CI.
  Leave unset locally so `next build` never hangs on Sentry.

---

## 4. Upgrade decisions (breaking changes — apply only on your approval)

Remaining `npm audit` findings require **breaking** fixes. Do **not** auto-apply;
review and approve each:

| Package | Issue | Fix (breaking) |
|---|---|---|
| `next` | moderate, direct | **major 15 → 16** (next@16.x) |
| `postcss` | high, via next | forced to next@16.x |
| `flutterwave-node-v3` + `joi` | moderate, via it | **downgrade** to `flutterwave-node-v3@1.3.0` |
| `fastify` | (already resolved) | already upgraded to 5.12.1 (safe fix applied) |

After any approved upgrade, re-run `npx tsc --noEmit`, `npm test`,
`npm run lint`, and `next build`.

---

## 5. Security follow-up

- **P0-1 — Rotate the leaked Sentry auth token.** Regenerate it in the Sentry
  dashboard and update `.env`. No git purge is required (the token file is
  untracked and nothing is committed to history), but rotate it before real
  deploys to stay safe.

---

## Status legend

- **Pending:** listed here, awaiting your input/action.
- **Blocked (environment):** Docker engine not running on the current machine to
  verify image builds/health; verify on a host with Docker running.