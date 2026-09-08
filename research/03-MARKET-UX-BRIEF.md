# Noblur - Nigerian Market + UX Research Brief

Deliverable: 03-MARKET-UX-BRIEF.md
Research date: 27 Aug 2026. Method: live web verification (primary sources fetched and quoted), graded A-F per Company OS rules. Plain ASCII.

## Executive Summary

1. The core claim is REAL and confirmed by WhatsApp itself. WhatsApp Help Center states videos are sent at 720p on fast connections and 480p on slower connections, with a 64-100MB cap, and that "the internet connection will impact the quality of media being sent and received, even if the media is sent in HD quality". Photos sent as media are compressed to roughly 100-200KB (vendor-confirmed, consistent with user reports). Standard quality is the DEFAULT; the HD toggle still applies "light compression" and is not available for Status or profile pictures.
2. Users across the English-speaking market actively complain, and the standard workarounds (send as Document, share via Google Photos, use the camera app instead of the in-app camera) are exactly the friction Noblur removes. Nigerian discourse exists but is thinner: search surfaced WhatsApp-for-business articles in Nigerian tech press, and a Nairaland thread about blurry seller photos killing car sales (quality matters for sellers). No dedicated "WhatsApp compression" Nairaland thread surfaced - treat as a gap, not a negative.
3. The generic-compressor field ALREADY markets WhatsApp compatibility (Compresso, SqueezeVid, Clideo, FlexClip, TotalMedia, Klipa, Compresto). Verified: browser-side "never uploaded" processing and 16MB target-size sliders are the current pattern. None are Nigeria-specific, none offer Pidgin copy, and most are upload-server or web tools rather than mobile-first PWAs.
4. Nigeria is price- and device-right for Noblur: Android 82.5%, budget OEMs dominate (Tecno/Infinix/Samsung ~48%), median mobile upload ~11-16 Mbps, and 1GB average price ~$0.39 (rank 31/237 cheapest). Uploading 1 minute of 1080p costs the typical user roughly 90-150MB of data and ~45-90 seconds of upload time. Compressing to 480p/720p before upload cuts that cost 3-8x. This is the single most persuasive number for Nigerian marketing copy.
5. UX bar: the best tools (Compresso, SqueezeVid) achieve result in 3-4 taps, process 100% in-browser with explicit "never uploaded / files deleted" microcopy, show honest progress, and offer a target-size slider. Noblur should copy: 3-tap flow, before/after slider, "no upload / auto-delete" trust line, WhatsApp icon one-tap share, and honest progress (fake progress bars will backfire on slow 3G where users measure you against the clock).

## PART A - Problem Validation

### A1. Evidence that WhatsApp compresses photos/videos and quality visibly suffers

**A1-1. WhatsApp Help Center - "Can't send longer videos" (PRIMARY, GRADE A)**
Quote: "The maximum file size for videos sent or forwarded through WhatsApp is 64MB on all platforms. For users with a faster internet connection, the default video size limit is 100MB and 720p resolution. For users with a slower internet connection, the default video size limit is 64MB and 480p resolution."
URL: https://faq.whatsapp.com/823886715479103 (fetched 27 Aug 2026 via reader proxy; native page is JS-rendered)
Verdict: CONFIRMED. WhatsApp itself confirms resolution is capped at 720p/480p based on connection, i.e. video quality is ALWAYS reduced on send. The strongest possible citation for the core claim.

**A1-2. WhatsApp Help Center - "About HD photos and videos" (PRIMARY, GRADE A)**
Quotes: "You can send photos and videos in standard quality or HD quality." "If you attach an existing photo or video, you don't have to select between Standard quality or HD quality." "Note: HD media isn't currently available for status updates or profile pictures." "The internet connection will impact the quality of media being sent and received, even if the media is sent in HD quality."
URL: https://faq.whatsapp.com/759301289012856 (fetched 27 Aug 2026)
Verdict: CONFIRMED. HD is opt-in per message, default is Standard quality, and Status (the #1 small-business showcase surface) does not support HD. Noblur's Status-optimized angle is validated.

**A1-3. WABetaInfo - HD photos rollout feature article (STRONG SECONDARY, GRADE A/B)**
Quotes: "some users may experiment with sending HD photos, preserving their resolution." "Note that this does not mean that you can send photos in their original quality because this option preserves image dimensions, but light compression is still applied to the image." "the default option is always 'Standard quality' for any photo." "There is no way to send a video with better quality without sending it as a document."
URL: https://wabetainfo.com/whatsapp-is-rolling-out-a-feature-to-send-hd-photos-on-ios-and-android-beta/ (fetched 27 Aug 2026)
Verdict: CONFIRMED. Even the "HD" path compresses. WABetaInfo is the established WhatsApp-beta tracker; primary in practice (they hold beta builds), secondary in authority.

**A1-4. Reddit r/androidapps - "WhatsApp compression killing quality of image/gifs/videos" (PRIMARY USER EVIDENCE, GRADE A via Wayback archive)**
Quotes (OP): "WhatsApp is compressing my files and reducing them to hot shit piles of bad quality. It's gotten so bad recently, any study notes that I send or receive, are just totally unintelligible, and pics or gifs that I send have awful pixelation." Comment: "every photo clicked via WhatsApp has added blurriness to it. Makes it a pain to quickly send pictures."
URL: https://www.reddit.com/r/androidapps/comments/7cew75/whatsapp_compression_killing_quality_of/ (archived: web.archive.org/web/20250302105616)
Verdict: CONFIRMED. Real user pain, including a "study notes unintelligible" use case (students) and the note "the whole country only uses WhatsApp" - mirroring Nigeria's single-app reality.

**A1-5. Reddit r/whatsapp - "Why does WhatsApp massively reduce the quality of Videos and Pictures sent through chat" (PRIMARY USER EVIDENCE, GRADE A via Wayback archive)**
Quote (OP): "Why does WhatsApp massively reduce the quality of Videos and Pictures sent through chat, I dont understand why, its the worst I've seen on any app or social service does anyone have any answers or suggestions about this."
URL: https://www.reddit.com/r/whatsapp/comments/i91f3c/ (archived: web.archive.org/web/20230616202505)
Verdict: CONFIRMED. Long-running complaint (2020 thread, archived 2023); "worst of any app" sentiment appears in multiple threads.

**A1-6. Vendor corroboration (WEAKER, GRADE C) - Compresso.io**
Quotes: "WhatsApp compresses media aggressively when you send it - but if you pre-compress with the right settings, you control the quality instead of letting WhatsApp's algorithm decide." "WhatsApp automatically compresses all photos sent as media to reduce bandwidth usage. It typically reduces photos to around 100-200KB regardless of original quality."
URL: https://compresso.io/compress-for-whatsapp (fetched 27 Aug 2026)
Verdict: PARTIALLY CONFIRMED. The 100-200KB figure is a vendor claim (auto-downgrade to C) but consistent with user reports and WhatsApp's own 480p/720p caps.

### A2. How users cope today + Nigerian discussion
- Coping workarounds (all from the verified r/androidapps thread comments): (1) send as Document to bypass compression - "I think sending your pics as document in WhatsApp will prevent loss of quality... a downside is that you won't be able to see the image in thumbnail" (GRADE A); (2) "I use sharing with Google photos for this reason" (GRADE A); (3) use the phone camera app and attach instead of the in-app camera (GRADE A). These map 1:1 to Noblur's value props (inline preview + quality).
- Blurry-video complaints exist across web: HitPaw "Why Are My Videos on WhatsApp Blurry?" and DHgate "Why Are WhatsApp Videos Blurry?" (both GRADE C, fix-bait content mills; evidence the query is common but not quotable as authority).
- Nigerian-specific: Techpoint Africa search index (fetched live, GRADE C - listing, bodies not read this session) surfaces: "WhatsApp, not Instagram, is the preferable platform for small businesses in Nigeria" (Sep 2019, techpoint.africa), "3 reasons why WhatsApp will not leave Nigeria" (Aug 2024), "More than 10 lucrative ways you can use WhatsApp for business" (Dec 2015). WhatsApp-for-business is an established Nigerian tech-press theme.
- Nairaland: searches for "whatsapp blurry photos" / "whatsapp compress video" / "whatsapp video quality" (fetched live) did NOT surface a dedicated compression-complaint thread. Closest hit (GRADE C): an Aug 2026 Autos thread on why cars don't sell - "Dark, blurry, one-angle photos kill sales instantly" and "You're only posting on whatsapp status. Your whatsapp contacts are not car buyers." Nigerian sellers already know bad photos kill sales; the WhatsApp-compression angle is an unclaimed niche in Nairaland discourse, not a saturated one.
- Missing: no Nigerian-English "data cost of uploading video" article verified. Marked [UNVERIFIED].

### A3. Existing WhatsApp-optimized tools and claims
- Verified live (fetched, GRADE C vendor pages): Compresso.io ("Compress Images & Videos for WhatsApp", browser-only, 16MB target guidance, "private photos and videos are never uploaded to any server") and SqueezeVid ("WhatsApp crushes videos sent as media and caps them at about 16 MB... pick the quality, fit the limit... your video is never uploaded to us", target-size slider UI).
- Surfaced in search (snippets only, GRADE C listings): Clideo "Compress Video for WhatsApp", FlexClip "Compress Videos for WhatsApp Free", TotalMedia.ai "How to Compress Video for WhatsApp Without Losing Quality", Klipa.ai, Compresto.app. "WhatsApp-optimized" is already a mainstream marketing category - Noblur's differentiation cannot be the category itself, only the mobile-first/PWA/no-login/NGN/Pidgin combo.
- Reviews/quality: NOT verified this session (Play Store review counts [UNVERIFIED]).

## PART B - Nigerian Market Context (all live-verified unless marked)

| # | Fact | Value | Source (live) | Grade |
|---|------|-------|---------------|-------|
| B1 | Average cost of 1GB mobile data, Nigeria | USD 0.39, rank 31 of 237 countries (cheapest third globally) | cable.co.uk/mobiles/worldwide-data-pricing | A/B |
| B2 | Per-operator NGN prices (MTN/Glo/Airtel/9mobile) | [UNVERIFIED] - do NOT publish naira tables without fresh operator pricing pages | - | F |
| B3 | Median mobile download speed | 43.79 Mbps (rank 86) latest; newer July 2026 reading 93.24 Mbps (rank 81) | speedtest.net/global-index/nigeria | A |
| B4 | Median mobile upload speed | 11.20 Mbps latest; 16.43 Mbps in newer July 2026 reading | speedtest.net/global-index/nigeria | A |
| B5 | Mobile latency | 33-48 ms | speedtest.net/global-index/nigeria | A |
| B6 | Android share of smartphones | 82.51% (July 2026); iOS 17.4% | gs.statcounter.com/os-market-share/mobile/nigeria | A (StatCounter measures web traffic, skews higher-SES) |
| B7 | Top phone vendors (July 2026) | Apple 17.39%, Tecno 17.21%, Samsung 16.18%, Infinix 14.72%, Unknown 11.64%, Xiaomi 7.96%. Tecno+Infinix+Samsung = ~48% | gs.statcounter.com/vendor-market-share/mobile/nigeria | A (same caveat) |
| B8 | Internet users / penetration | 107 million users, 45.4% penetration (Jan 2025) | datareportal.com/reports/digital-2025-nigeria | A |
| B9 | Mobile connections | 150 million cellular connections = 64.0% of population (early 2025; includes voice/SMS-only) | datareportal.com/reports/digital-2025-nigeria | A |
| B10 | WhatsApp users in Nigeria | [UNVERIFIED] - DataReportal section truncated; secondary estimates (~40-50M) NOT re-verified, do not quote | - | F |
| B11 | WhatsApp primary messaging / business use | PARTIALLY VERIFIED: Techpoint Africa shows long-running WhatsApp-for-small-business coverage | techpoint.africa/?s=whatsapp | C (listing) |
| B12 | Flutterwave popularity / payment willingness | [UNVERIFIED] - search blocked; no live stat this session | - | F |
| B13 | Play Store vs PWA discovery | [UNVERIFIED] - no stats fetched this session | - | F |

### Cost math for 1 minute of 1080p video (transparent calculation, not a fabricated stat)
- 1 minute of 1080p at ~12 Mbps H.264 is about 90 MB (12,000,000 bits/s x 60s / 8 = 90 MB); at 16 Mbps it is 120 MB.
- Data cost at USD 0.39/GB: 90-120 MB = USD 0.035-0.047 per minute (GRADE A inputs, arithmetic shown).
- Upload time at 11 Mbps median upload: 90 MB / (11 Mbps / 8) = ~65 seconds (GRADE A input).
- Naira conversion: [UNVERIFIED]/estimate only - no live FX rate fetched this session. At an assumed ~NGN 1,500/USD this would be roughly NGN 55-70 per minute, and pre-compressing to 480p (~2-3 Mbps, ~15-22 MB/min) cuts both cost and time by roughly 4-6x. FRAME ALL NAIRA NUMBERS as illustrative, never as verified fact.

## PART C - UX Patterns Worth Stealing

Pattern cards based on LIVE verification of Compresso.io and SqueezeVid (both fetched this session) plus stable widely-documented behavior of Squoosh/TinyPNG (GRADE B/C - not re-fetched this session).

**C1. "Never uploaded / processed on your device" trust microcopy**
- What: explicit inline promise that files never leave the browser.
- Who does it best (verified): Compresso ("your private photos and videos are never uploaded to any server"), SqueezeVid ("your video is never uploaded to us").
- Noblur version: permanent line under the drop zone for IMAGES: "Photo dey stay for your phone. No upload." For videos (server-side): "Your video delete itself after 30 minutes. Nothing dey stay." Plus a data-cost note ("compression go help you save data").

**C2. Target-size slider / output control**
- What: user picks an output target (MB) instead of abstract quality percentages; the tool encodes to fit.
- Who does it best (verified): SqueezeVid - "Desired output size... Target size (MB)... Squeezing Power 60%... Resolution Original".
- Noblur version: preset chips aligned to WhatsApp reality: "For Status (short + sharp)", "Chat video (under 16MB)", "Photo (send clean)". Show estimated data saved per option.

**C3. 3-tap flow to result (minimum taps)**
- What: count taps from open to shareable result. Best-in-class is 3: (1) tap/pick media, (2) tap preset, (3) result + share.
- Who does it best (verified): SqueezeVid single "Squeeze Video" action after one settings pick; Compresso drop -> result panel.
- Noblur version: Tap photo/video -> tap preset chip -> result screen with WhatsApp icon button. No account, no email, no settings. Target: 3 taps, under 60 seconds on 3G.

**C4. One-tap share-to-WhatsApp**
- What: after processing, the primary button opens WA share sheet / sends to selected chat, not "download then go find it".
- Who does it best (verified partial): both verified tools end on a result panel with share actions inlined.
- Noblur version: big green WhatsApp button with the WA glyph + "Send to WhatsApp"; secondary "Save to phone". PWA share target support so users can pick Noblur from the WA share sheet directly.

**C5. "Auto-delete" trust promise**
- What: promise that processed files are deleted automatically after a short window; reduces no-login web tool anxiety.
- Who does it best: standard in no-login compressors; SqueezeVid/Compresso lead with the "never uploaded" variant (verified).
- Noblur version: "Your file delete itself after 30 minutes. Nothing dey stay." - next to the upload button and in the FAQ. Pair with an honest, prominent privacy paragraph (no account = nothing to hack).

**C6. Honest progress, not fake front-loading**
- What: real progress % and phase labels (preparing / compressing / almost done).
- Who does it best (verified): SqueezeVid shows real phase text ("Squeezing your video... 0% Preparing to squeeze...") - honest.
- Noblur version: HONEST phases with actual encoder progress; on slow mid-range devices, pre-warm expectations with a phase label instead of a spinner. Rationale: Nigerian users on 3G measure tools against the clock; a fake 90% that stalls burns trust instantly. Show estimated time and data saved on the result card.

**C7. Before/after comparison slider**
- What: side-by-side or draggable split showing original vs output with the savings (MB saved, % smaller).
- Who does it best: Squoosh's side-by-side comparison slider is the canonical example (GRADE B - stable, well-documented).
- Noblur version: on the result card, a drag handle comparing original vs compressed, with "you don lose much quality" copy, plus file-size badge "24MB -> 3.2MB".

**C8. Zero-login, first-run shows value in one interaction**
- What: no account wall; the first screen is the drop zone; a sample/demo asset for first-time users.
- Who does it best: Squoosh (open source, instant, no login) and TinyPNG (no login for web) (GRADE B/C).
- Noblur version: first screen = drop zone + "Try wetin don ready" demo button that loads a sample product photo. Pidgin microcopy on all empty states.

### Delays that feel acceptable on mobile data (judgement, flagged as such)
- Verified anchor: median mobile upload 11-16 Mbps; a 90MB clip uploads in ~45-70s. Anything that finishes in under the WhatsApp-upload time and shows a smaller file than the original feels like a win.
- Rule of thumb for Noblur UX (D/UNVERIFIED - product judgement): result screen target under 30s on mid-range 4G, under 90s on 3G; if longer, show phase progress, never an unbounded spinner.

## [UNVERIFIED] List (explicitly not verified this session)
- Per-operator NGN data prices (MTN/Glo/Airtel/9mobile) and NGN conversion of data costs.
- WhatsApp Nigeria user count and WhatsApp Business penetration stats.
- Flutterwave popularity stats and Nigerian willingness-to-pay data; NGN app-subscription price benchmarks.
- Play Store vs PWA discovery stats for Nigeria.
- Live UX walk-throughs of Squoosh, TinyPNG, Clideo, Kapwing, VidCompact (Compresso + SqueezeVid verified; others B/C from stable public knowledge).
- Review counts/ratings for existing WhatsApp-compressor apps.
- Nairaland dedicated "WhatsApp compression" complaint thread (searched, none surfaced - gap, not negative).
- "1 minute 1080p = NGN X" naira figure (calculation shown transparently from verified USD/math inputs instead).

## Source List (all fetched live 27 Aug 2026 unless noted)
1. WhatsApp Help Center - Can't send longer videos: https://faq.whatsapp.com/823886715479103 (A)
2. WhatsApp Help Center - About HD photos and videos: https://faq.whatsapp.com/759301289012856 (A)
3. WABetaInfo - HD photos on iOS/Android beta: https://wabetainfo.com/whatsapp-is-rolling-out-a-feature-to-send-hd-photos-on-ios-and-android-beta/ (A/B)
4. Reddit r/androidapps - compression thread: https://www.reddit.com/r/androidapps/comments/7cew75/ (A, via Wayback 2025-03-02)
5. Reddit r/whatsapp - quality reduction thread: https://www.reddit.com/r/whatsapp/comments/i91f3c/ (A, via Wayback 2023-06-16)
6. Compresso.io - compress for WhatsApp: https://compresso.io/compress-for-whatsapp (C)
7. SqueezeVid - compress video for WhatsApp: https://www.squeezevid.com/en/compress-video-for-whatsapp/ (C)
8. StatCounter - Nigeria mobile vendor share (Jul 2026): https://gs.statcounter.com/vendor-market-share/mobile/nigeria (A)
9. StatCounter - Nigeria mobile OS share (Jul 2026): https://gs.statcounter.com/os-market-share/mobile/nigeria (A)
10. Ookla Speedtest Global Index - Nigeria (Jul 2026): https://www.speedtest.net/global-index/nigeria (A)
11. Cable.co.uk - cost of 1GB in 237 countries: https://www.cable.co.uk/mobiles/worldwide-data-pricing/ (A/B)
12. DataReportal - Digital 2025 Nigeria: https://datareportal.com/reports/digital-2025-nigeria (A)
13. Techpoint Africa - WhatsApp search results: https://techpoint.africa/?s=whatsapp (C)
14. Nairaland searches: /search?q=whatsapp+blurry+photos ; /search?q=whatsapp+compress+video ; /search?q=whatsapp+video+quality (C)

## Method notes
- WhatsApp FAQ is JS-rendered; fetched via r.jina.ai reader proxy. Reddit blocks direct fetch; used Wayback CDX API for snapshots. Nairaland search works directly. StatCounter/Ookla/Cable/DataReportal fetched directly.
- Confidence grading per Company OS: A = primary source (WhatsApp's own help pages, archived primary user threads, StatCounter/Ookla/DataReportal primary stats). B = strong secondary (WABetaInfo, Cable.co.uk). C = vendor/marketing pages or search-listing-only. F = could not verify.
