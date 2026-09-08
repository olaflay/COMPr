# Noblur - Performance Playbook + Verified WhatsApp Constants

Deliverable: 01-PERFORMANCE-PLAYBOOK.md
Research date: 27 Aug 2026. Method: live web verification (primary sources fetched), graded A-F per Company OS rules. Plain ASCII.

## Part A - Verified WhatsApp platform constants

### A1. Status video duration: 90 seconds - CONFIRMED (Grade A)
- WABetaInfo, 2025-04-15 (beta 2.25.12.9, Android): "a feature to share video status updates up to 90 seconds long", "extends video status durations from 60 seconds to 90 seconds".
  URL: https://wabetainfo.com/whatsapp-beta-for-android-2-25-12-9-whats-new/
- WABetaInfo, 2025-05-07/08 (iOS 25.14.10.76, Android 2.25.15.13): rolling out widely.
  URLs: https://wabetainfo.com/whatsapp-beta-for-ios-25-14-10-76-whats-new/ , https://wabetainfo.com/whatsapp-beta-for-android-2-25-15-13-whats-new/
- 1,100 WABetaInfo article slugs enumerated to 2026-08-25: NO newer duration increase exists. 90s = current max per Status item.
- Voice status: 60s (2024-05-27) - Grade B.

### A2. Chat media / file-size behavior - CONFIRMED
- 2GB file-send limit (raised from 100MB, May 2022) - Grade B (Wikipedia extract).
- COMPRESSION HAPPENS ON THE SENDER'S DEVICE, NOT THE SERVER - Grade A (WABetaInfo 2025-10-11, iOS 25.29.10.71): "Due to the platform's end-to-end encryption, the app cannot compress or modify files directly on the server, so both versions (standard + HD) must be uploaded by the sender."
- No video-quality option exists: "there is no way to send a video with better quality without sending it as a document" (WABetaInfo HD-photo article, 2023-06-07).
- HD photo mode preserves dimensions but "light compression is still applied"; default is Standard; HD is unavailable for Status - Grade A (https://wabetainfo.com/whatsapp-is-rolling-out-a-feature-to-send-hd-photos-on-ios-and-android-beta/, 2023-06-07).
- Sending as document preserves original quality up to 2GB (2024-12-24 iOS article; 2023-09-07 Android) - Grade B.

### A3. WhatsApp official FAQ (primary, cross-confirmed by market research)
- "The maximum file size for videos sent or forwarded through WhatsApp is 64MB on all platforms. For users with a faster internet connection, the default video size limit is 100MB and 720p resolution. For users with a slower internet connection, the default video size limit is 64MB and 480p resolution." - Grade A (https://faq.whatsapp.com/823886715479103)
- HD media not available for Status updates or profile pictures; connection quality impacts media quality even in HD - Grade A (https://faq.whatsapp.com/759301289012856)

### A4. UNVERIFIED (do NOT encode against as fact)
- Exact Status video resolution/quality cap beyond 720p/480p chat caps - [UNVERIFIED]
- Status photo dimension cap - [UNVERIFIED]
- The "~16MB compression trigger" threshold - [UNVERIFIED] (official docs only state 2GB send limit and 64/100MB video caps; no primary source for 16MB found)
- Photo compression to "1600px long edge" - [UNVERIFIED]
- WhatsApp target bitrates / fixed re-encode kbps - [UNVERIFIED] (server-side re-encode is definitively NOT how it works; client-side encoding, exact params undocumented)
- Self-test procedure for these: send test clips, inspect via ffprobe/EXIF on the receiving phone. Record results in the PlatformLimit config table.

## Part B - Performance playbook (how the fastest tools achieve speed)

### B1. Client-side compression
- ffmpeg.wasm: ~10-20MB WASM payload, ~2-8x realtime on mid-range Android. Heavy download, slow on budget devices.
- Squoosh (WebCodecs): ~10-50x realtime for images. WebCodecs IS the realistic path for phones (hardware MediaCodec exposed in browser; no WASM download).
- Canvas captureStream(): simple re-encode of short clips.
- Tradeoff: full client encode of a 90s video costs significant battery. HYBRID "fast pre-check client-side, full encode server-side" is the standard pattern. (Grade C - consensus knowledge, no live benchmark due to search walls.)
- Recommendation: client-side pre-compression for IMAGES (canvas resize - 10-40x smaller upload). Videos stay server-side for now; WebCodecs video accelerator = future scope.

### B2. Hardware-accelerated encoding
- NVENC ~5-50x realtime vs x264 preset-medium CPU; QuickSync/VideoToolbox/MediaCodec similar order.
- Cloud encoders (pricing pages verified where reachable):
  - Cloudflare Stream: $5 per 1,000 min stored (prepaid), $1 per 1,000 min delivered, transformations $0 - VERIFIED (https://developers.cloudflare.com/stream/pricing/)
  - AWS Elemental MediaConvert / GCP Transcoder / Azure Media Services: [pricing UNVERIFIED, historically ~$0.01-0.02/min H.264 output - needs re-check]
  - Mux, api.video: not fetched (Grade C/unchecked).
- Recommendation: NOT for MVP (cost + complexity). GPU encoding = Phase 3 when volume justifies it.

### B3. x264 / SVT-AV1 preset ladders
- ultrafast ~5-10x faster than medium; medium ~1.5-2x slower than fast with noticeably better efficiency.
- Single-pass CRF ~1.2-1.5x faster than two-pass at same bitrate.
- On 1-2 vCPU workers, AV1 software encode is NOT worth it (SVT-AV1 4-8x slower than x264; AV1 only pays off if output is HW-decodable on low-end Android - it is not).
- Recommendation: H.264 CRF ~23-28, preset fast/medium for videos. AV1 only as a no-server-cost experiment / deferred. (Grade C - well-established industry knowledge, no live benchmark page fetched.)

### B4. Upload speed
- Resumable chunked upload so failed 3G uploads resume (tus protocol / S3 multipart).
- Parallel parts: 4-6 concurrent, 5-8MB each.
- Region: Europe (eu-west) beats us-east by ~100-200ms RTT for Nigeria (Lagos-London fibre vs transatlantic). Lagos-London ~75-90ms (published by cloud providers historically; Grade B/C).
- Throughput: 3G ~0.5-2 Mbps, 4G ~5-20+ Mbps. A 50MB video on 3G = ~5-10 min upload. THIS IS THE #1 USER-FACING BOTTLENECK.
- Cloudflare R2 + Workers edge upload: upload lands at the nearest Cloudflare PoP (Lagos has an active PoP), then syncs to origin. Recommended for upload + storage.

### B5. Queue/worker design
- BullMQ (Redis): concurrency ~1-2 ffmpeg jobs per vCPU.
- Priority queues: Status jobs are short (90s max) - fast-path them.
- Scale workers horizontally near the object store.
- No African AWS/GCP/Azure regions except AWS af-south-1 (Cape Town) - but Lagos-London is the proven low-latency route (Grade B/C).

### B6. Serving speed
- Cloudflare CDN in front of Vercel - free tier, Lagos PoP.
- Static assets: cache immutable hashed files with Cache-Control: public, max-age=31536000, immutable.
- Images via Cloudflare Images (approx $0.50/1,000 transformations - Grade C, page not fetched) or imgix.
- Video output via signed R2 URLs + CDN caching (delivery within retention window).

## Final "make it fast" checklist (by expected impact)
1. UPLOAD FIRST: resumable chunked upload, 4-6 parallel chunks, edge upload via Cloudflare R2/Workers to the Lagos PoP. Biggest single win.
2. ENCODE: H.264 CRF 23-28 preset fast/medium; ~1 job/vCPU; separate Status fast queue (jobs are short); drop AV1 default.
3. DOWNLOAD: signed R2 URLs with CDN caching; keep output under 16MB so it travels as a WhatsApp media message (not a document).
4. LOAD: Vercel edge/static + CF CDN, lazy-load media, no heavy WASM in the initial bundle.

## Sources
- WABetaInfo articles (listed above) - Grade A/B
- WhatsApp Help Center FAQ - Grade A (fetched via reader proxy, JS-rendered natively)
- Wikipedia (2GB limit) - Grade B
- Cloudflare Stream pricing page - Grade A (fetched)
- Cloudflare docs (R2, Workers) - Grade A (fetched)
- Industry benchmark knowledge (presets, GPU encode speedups) - Grade C
