# M2 Dossier - Noblur research milestone (Gate 1 + Gate 3 submission)

Date: 27 Aug 2026. Assembled by Master Orchestrator (Company OS).

## Artifacts produced
- 00-PERF-DIAGNOSIS.md - code + live evidence of every slow path (A grades)
- 01-PERFORMANCE-PLAYBOOK.md - verified WhatsApp constants + speed playbook (A-C grades)
- 02-COMPETITIVE-TEARDOWN.md - real competitive set; OpenStatus/PeerStatus verdicts (A-F)
- 03-MARKET-UX-BRIEF.md - problem validation + Nigeria context + UX patterns (A-F)
- 04-ENGINEERING-VETTING.md - APPLY NOW (10) / FUTURE SCOPE (9) / REJECT (6) + 4 locked amendments
- 05-BUILD-SPEC.md - P0/P1/P2 build spec with acceptance + verify per item

## Key decisions + why + grade
| Decision | Why | Grade |
|----------|-----|-------|
| OpenStatus/PeerStatus are NOT competitors (uptime tool + untraceable) | live fetch: openstatus.dev = status pages; peerstatus = no product | A/F |
| Real competitive set = web compressors, WASM tools, Android HW apps, WhatsApp itself | 25 live page fetches | A |
| Wedge is vacated: WhatsApp-aware + mobile-first PWA + Pidgin + NGN data-cost framing | no competitor combines them | B |
| Fix upload FIRST (batch presign + parallel chunks + client image pre-compress) | 3G 0.5-2Mbps; 30+ serial ops today; biggest bottleneck | A |
| H.264 fast/medium default; AV1 deferred; VMAF stays (cheaper sampling) | SVT-AV1 4-8x slower on tiny CPU; floor 80 preserved | B |
| Deploy on eu-west (London); Supabase Storage stays (S3-compatible); Redis (Upstash) = queue + cache | Human rejected Cloudflare 2026-08-27; Lagos-London 75-90ms is the verified fast route; Redis already in stack | B |
| Locked changes approved by human: AV1 -> H.264 MVP, VMAF 4s sampling, no Cloudflare, Redis cache | User mandate 2026-08-27 + SVT-AV1 4-8x slower than x264 on small CPU workers | A |
| Honest trust copy (auto-delete) instead of "never uploaded" for video | server-side encode makes the claim false | A |
| Data-cost messaging as the Nigeria marketing wedge | 1min 1080p = ~90-120MB = ~NGN 55-70 (illustrative); compress cuts 4-6x | A |

## Cost
- $0 spend. Free tiers only (Vercel, Railway/Render, Upstash, Supabase, R2 pay-per-use ~$0.015/GB/mo, Cloudflare free CDN). ~50 API calls per research agent, 3 agents.
- Deploy cost when P1.4 lands: R2 storage ~$0.015/GB-month + egress through Cloudflare free; Railway/Render worker ~$5-7/mo or Fly.io ~$3-5/mo; Vercel free; Upstash free 10k commands/day.

## Risks + what was deliberately NOT done
- NOT done: any code changes (build spec only), no deployment, no billing, no AV1 removal (code preserved), no client-side video encoding.
- Risk: R2 S3 signing compat -> verify presign round-trip before cutover (spec P1.4).
- Risk: VMAF sampling change -> regression check on 20-clip set before shipping.
- Risk: 3 NGN-specific stats [UNVERIFIED] (per-operator data prices, WhatsApp NG user count, Flutterwave willingness-to-pay) - none are used in copy; re-verify before Phase 2 pricing.
- Honest gaps: WhatsApp exact bitrates + 16MB trigger + Status resolution caps remain [UNVERIFIED]; empirical self-test procedure defined in 01-A4.

## Ask
APPROVE to start building P0 (spec 05), or CHANGE / LOOPBACK.
