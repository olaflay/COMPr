# Noblur - Competitive Teardown

Deliverable: 02-COMPETITIVE-TEARDOWN.md
Research date: 27 Aug 2026. Method: ~25 live page fetches (Play Store, Uptodown, APKCombo, AppBrain, Wayback, GitHub API, vendor pages), graded A-F per Company OS rules. Plain ASCII.

## 1. Executive summary - what makes the best competitors WORK WELL

1. LOCAL/WASM PROCESSING = INSTANT + PRIVATE: Squoosh (Google, images never leave device) and Squoosh.online (images, videos, PDFs in-browser via WASM, no uploads). Zero queue, zero upload wait, and the strongest privacy story on the market.
2. TARGET-SIZE COMPRESSION (not just a quality slider): Clideo, Kapwing, FreeConvert all let you target a file size in MB.
3. BEFORE/AFTER COMPARISON UI: TinyPNG slider, Clideo preview, Squoosh side-by-side.
4. FREE TIER WITHOUT LOGIN: TinyPNG (20 images, 5MB each), Clideo (500MB uploads), Squoosh (unlimited, client-side), iLoveIMG (bulk free).
5. AGGRESSIVE TRUST SIGNALS: Compressor.io "auto-deleted after compression"; CloudConvert "files removed after processing"; Squoosh/Squoosh.online "never leaves your device".
6. SHIP-HARDWARE SPEED ON MOBILE: Inverse AI / Rex-style apps use the device's H264/H265 hardware encoder locally.
7. WHATSAPP IS A MARKETED CATEGORY: Online-Convert's homepage literally offers a "Convert for WhatsApp" tool; Compresso.io and SqueezeVid exist purely for WhatsApp (both client-side, "never uploaded").

## 2. The two named competitors - VERIFIED

### OpenStatus - NOT a competitor (Grade A)
- Open-source status page + uptime monitoring tool (GitHub ~9,024 stars, AGPL-3.0, created 2023-06-19, active).
- Pricing (openstatus.dev/pricing): Free Hobby (1 monitor, 1 status page, 3 components, 10-min interval), Starter $30/mo, Pro $100/mo, Scale $500/mo, Enterprise custom.
- Verdict: uptime/status-page product with ZERO media-compression functionality. Does NOT compete with a WhatsApp media optimizer.

### PeerStatus - NO product found (Grade F)
- No record on Play Store or App Store; no GitHub repo; no consumer product anywhere.
- Only "PeerStatus" hits: an Asterisk (telephony) AMI event name and unrelated chatter.
- peerstatus.com exists only in Wayback (Dec 2021) as a PARKED domain (frameset redirect + adblockkey = parked-broker page).
- Verdict: cannot be verified as a real product. Most plausible explanation: a mix-up with OpenStatus (both have "status" in the name). FALSE competitor - the competitive picture is unchanged.

## 3. The REAL competitive set (per-competitor cards)

### Inverse AI "Compress Video Size Compressor" (Android, current Play leader)
- Package com.video_converter.video_compressor, 4.88 rating, ~178k ratings, on-device H264/H265 hardware encode, target-size/bitrate control.
- Speed: uses the device's hardware encoder. Free with ads/limits.
- Rex Studios "Video Compressor" is DELISTED from Play (stale mirrors only) - effectively unavailable.

### VidCompact (Android)
- Verified via Uptodown (dev energysh = VideoShow team, free, v4.2.2.0, ~288k Uptodown downloads). NOT on Google Play anymore. Video editing + compression.

### Web compressors (Clideo, Kapwing, FreeConvert, Online-Convert, CloudConvert, iLoveIMG, Compressor.io)
- Server-side processing with queue; free tiers with limits and watermarks (Kapwing: 10 credits, 4-min/720p cap, Pro $16/mo annual; CloudConvert: 10 credits/day, 1GB, 5-min processing; Clideo: 500MB uploads free; Compressor.io: 10MB/50 compressions/day, Pro $50/yr).
- Strengths: target-size compression, before/after preview, bulk, no login.
- Weaknesses: upload-then-process = slow on mobile data; queue waits; watermarks on free tier; no WhatsApp-awareness beyond a generic "WhatsApp" preset page.

### Local/WASM tools (Squoosh, Squoosh.online)
- Fully client-side, instant, private. Squoosh = images only (Google). Squoosh.online = images, video, PDF in-browser.
- No WhatsApp-specific tuning. No share-to-WhatsApp flow.

### Image tools (TinyPNG, Compressor.io, iLoveIMG)
- TinyPNG: 20 images free, 5MB each, before/after slider. Strong brand. No video, no WhatsApp angle.
- iLoveIMG: bulk free image tools, watermark-free, ad-supported.

### HandBrake (desktop)
- Powerful, free, but requires technical knowledge. No WhatsApp presets shipped by default in a consumer-friendly way. Not a mobile-data-era competitor.

### WhatsApp's own compression (the baseline)
- Verified constants in 01-PERFORMANCE-PLAYBOOK.md: 90s Status cap, 720p/480p video caps, 64/100MB video limits, HD unavailable for Status, photos compressed to roughly 100-200KB (vendor claim, Grade C).
- Users cope by: sending as Document (loses inline preview), Google Photos sharing, camera-app-attach instead of in-app camera. All friction Noblur removes.

## 4. Feature matrix (Noblur vs field)

| Feature | Noblur (now) | Web compressors | Squoosh | Android apps | WhatsApp-optimized (Compresso/SqueezeVid) |
|---|---|---|---|---|---|
| WhatsApp-aware presets (Status/Chat) | YES (core) | partial (generic page) | no | no | yes (16MB target) |
| No login | YES | mixed | yes | n/a | yes |
| Mobile-first PWA | YES | mostly desktop web | web | native apps | web |
| Client-side processing (no upload) | NO (server) | no | YES | YES | YES |
| Before/after comparison | YES | yes | yes | some | yes |
| One-tap share to WhatsApp | YES (wa.me) | some | no | native share | some |
| Target-size output | YES (custom 1-16MB) | yes | partial | yes | yes (16MB slider) |
| Auto-delete trust promise | YES (cron) | some | n/a (no upload) | n/a | some |
| Pidgin / Nigeria-specific | YES (locked) | no | no | no | no |
| Data-cost messaging (NGN) | planned | no | no | no | no |
| Free daily quota | 5 jobs/day | credits/watermarks | unlimited | ad-based | free |

## 5. Pricing (all verified from vendor pages, 27 Aug 2026)

| Tool | Free tier | Paid | Grade |
|---|---|---|---|
| OpenStatus | 1 monitor, 10-min interval | Starter $30/mo | A |
| Kapwing | 10 credits, watermark, 4min/720p | Pro $16/mo (annual) | A |
| Clideo | 500MB uploads, watermark | subscription | A |
| CloudConvert | 10 credits/day, 1GB, 5min | per-conversion packs | A |
| Compressor.io | 10MB, 50/day | Pro $50/yr | A |
| TinyPNG | 20 images, 5MB each | from $39/yr | A |
| Cloudflare Stream | n/a | $5/1000min stored, $1/1000min delivered | A |
| Noblur | 5 jobs/day, first job free | Phase 2 (Flutterwave, NGN) | n/a |

## 6. EMULATE / AMPLIFY / FIX / IMPROVE

### EMULATE (they do it right - copy)
- Trust microcopy: "never uploaded / auto-deleted" (Compresso, SqueezeVid, Compressor.io).
- Target-size output as a first-class control (SqueezeVid's MB slider).
- Before/after comparison as the result card centerpiece (Squoosh/TinyPNG).
- No-login free tier (everyone).

### AMPLIFY (their idea is thin - do it strictly better)
- "WhatsApp-optimized" is now a marketed category; NONE of them are mobile-first PWAs with Pidgin copy, NGN data-cost framing, and Status-vs-Chat smart presets. That combo is Noblur's moat. Lead with it.
- Data-cost angle: "1 minute of 1080p costs you ~90MB. Noblur makes it 15-22MB." No competitor speaks this language.
- Images processed ON DEVICE (client-side canvas) = we claim the Squoosh "never uploaded" story for photos while keeping server quality-gating for video.

### FIX (they do it wrong - avoid)
- Upload-then-process web tools are slow on mobile data and die on bad connections (Clideo/Kapwing pattern). Noblur: resumable chunked upload + parallel chunks.
- Fake/hidden progress + watermarks on free tiers (Kapwing). Noblur: honest progress (Nigerian users measure you against the clock on 3G) and no watermark.
- Generic "WhatsApp preset" pages that ignore Status-vs-Chat and Nigeria reality (Online-Convert pattern). Noblur: verified constants in a config table.

### IMPROVE (gaps they leave open - fill them)
- Nobody does verified WhatsApp-constant tuning (90s Status, 720p/480p caps). All competitors guess. We have the config table + empirical validation loop.
- Nobody combines local-image processing + server video quality gate (hybrid).
- Nobody targets the Nigerian seller segment (Nairaland evidence: blurry product photos kill sales).

## 7. Knowledge gaps + [UNVERIFIED]
- Play Store review BODIES are bot-walled from this host (ratings/counts verified; review text [UNVERIFIED]).
- Video Dieter: nothing found (Grade F) - likely misremembered name.
- Rex Studios delisted status: confirmed via Play 404 + stale AppBrain mirrors (Grade B).
- Nigeria-specific compressors: none surfaced (open gap, not a negative).
- Exact WhatsApp bitrate behavior: [UNVERIFIED] (client-side encode, undocumented).

## 8. Sources (all fetched 27 Aug 2026)
- openstatus.dev/pricing, github.com/openstatusHQ/openstatus (A)
- Play Store static HTML for Inverse AI app (A), Rex Studios packages 404 (A)
- uptodown.com VidCompact page (B)
- clideo.com, kapwing.com, cloudconvert.com, compressor.io, tinypng.com pricing pages (A)
- squoosh.app, squoosh.online (B)
- online-convert.com (WhatsApp tool, A)
- compresso.io/compress-for-whatsapp, squeezevid.com/en/compress-video-for-whatsapp (C - vendor)
- Wayback: peerstatus.com (A - parked), Reddit threads via archive (A)
- WABetaInfo + WhatsApp FAQ (A) - see 01-PERFORMANCE-PLAYBOOK.md
