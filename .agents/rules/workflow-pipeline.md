---
trigger: always_on
---

# Media Processing Pipeline — COMPr

## 1. FFmpeg Execution

- All FFmpeg/ffprobe commands MUST use the argument array form (`execFile` or `execFileSync`).
- **Shell strings are strictly forbidden** (prevents command injection).
- Logging: `-loglevel error` should be used for standard encodes to keep logs clean; `-loglevel debug` for troubleshooting.

## 2. Codec & Container (Locked)

- **Video:** H.264 (`libx264`). H.265/AV1 are explicitly rejected for MVP.
- **Container:** MP4.
- **Audio:** AAC. Mono = 64kbps, Stereo = 64–128kbps depending on source channels (per PRD §14/§16; exact mapping to be validated in Milestone 2).

## 3. Resolution Rules

- **NEVER upscale** beyond the source resolution. (`chooseInitialResolution` ensures `Math.min(source, cap)`).
- The resolution ladder is fixed: 1080p ➔ 720p ➔ 480p ➔ 360p ➔ 240p.

## 4. The Dual Retry Paths (FR-7)

A single job can have **maximum 2 retries** across both paths combined.

- **Size-Triggered Retry:** If output file size is outside ±10% of the target, adjust video bitrate proportionally (`adjustBitrateForSizeRetry`) and re-encode.
- **Quality-Triggered Retry:** If SSIM falls below the floor (0.90), **drop one resolution tier** (`dropOneResolutionTier`) and recalculate bitrate.
- *Crucial:* Do NOT lower bitrate on a quality failure. Do NOT drop resolution on a size failure. These paths are distinct.

## 5. SSIM Verification (PRD §13)

- Compare source vs. output by scaling the source to the output resolution (`scale2ref`).
- Sampling: **Fixed 2-second intervals** across the full video duration.
- The SSIM score must meet the configurable floor (default: 0.90). If not, trigger the quality retry path.

## 6. WhatsApp Platform Constants

- All duration/resolution/size ceilings MUST be read from `config/platform-limits.json` (or the DB `PlatformLimit` table).
- **NEVER hardcode** values like `90` (seconds), `720` (resolution), or `16` (MB) in the pipeline code.
