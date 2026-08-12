---
name: adaptive-engine-builder
description: Guide for maintaining and building the SVT-AV1, OpenCV, and VMAF media pipeline.
---

# Adaptive Engine Builder Skill

Use this skill when modifying the video analysis, policy configuration, or re-encoding rules of the self-hosted media engine.

---

## 1. Architecture & File Registry

The system operates as a self-hosted media optimization pipeline:

```
Upload ➔ ffprobe + OpenCV analysis ➔ Policy engine ➔ AV1/H.264 encode ➔ VMAF+SSIM verify ➔ Done
```

### Key Files:
- `lib/analysis.ts` — Frame extraction (1fps), face/text/motion scoring wrapper.
- `lib/opencv_analyze.py` — OpenCV Haar Cascade face detection + Canny/Sobel text edge detection.
- `lib/policy-engine.ts` — Evaluates scene scores and dynamically selects encoding profiles.
- `lib/vmaf.ts` — VMAF keyframe-sampled quality gate with fallback re-encode logic.
- `lib/pipeline.ts` — FFmpeg encoding execution + SSIM verification.
- `config/encoding-profiles.json` — Pre-defined default encoding profiles.
- `config/platform-limits.json` — Bounded limits for WhatsApp sharing compatibility.
- `models/vmaf_v0.6.1.json` — Bundled VMAF model.

---

## 2. Ingestion & Analysis Pipeline

### Step 1: Ingest & Probe
1. Accept image or video upload. Validate file type headers, integrity, and size.
2. Read metadata via `ffprobe`: extract frame rate, bitrates, rotation tag, container details, and aspect ratio.

### Step 2: Scene Intelligence (1fps Sampling)
- All analysis processes run in an isolated Python/C++ subprocess to prevent Node.js event-loop blockages.
- Never analyze full-frame rates. Limit frame sampling to **1 fps maximum**. Release OpenCV memory references immediately after scoring.

#### Face Detection (`lib/opencv_analyze.py`)
- Haar Cascade classifier: `haarcascade_frontalface_default.xml`
- Call: `detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30,30))`
- Score calculation: `totalFaceArea / frameArea` (range: 0-1)
- Threshold: `hasFaces = avgFaceScore > 0.05`

#### Text Edge Detection (`lib/opencv_analyze.py`)
- Apply Canny edge detection (thresholds: 50, 150).
- Apply Morphological close filter with `15x3` kernel to connect adjacent characters.
- Filter contours: `width > 3 * height`, `area > 100px`, `aspect ratio < 20:1`.
- Score calculation: `textContours / totalContours` (range: 0-1)
- Threshold: `hasText = avgTextEdgeScore > 0.3`

#### Motion Estimation (`lib/analysis.ts` `computeMotionScore`)
- Computed between consecutive 1fps sampled frames via the FFmpeg SSIM filter:
  ```bash
  ffmpeg -i frameA.jpg -i frameB.jpg \
    -lavfi "[0:v][1:v]ssim=stats_file=ssim_<id>.log" \
    -f null -
  ```
- Score: `motion = 1 - SSIM` (range: 0-1). SSIM 1.0 (identical frames) → motion 0; SSIM 0.0 → motion 1.
- Threshold: `isHighMotion = avgMotionScore > 0.6`
- Brightness/contrast come from the Python analyzer (`np.mean`/`np.std` of the grayscale frame); `isLowLight = avgBrightness < 40`.

---

## 3. Policy Engine & Encoding Profiles

`lib/policy-engine.ts` translates visual scores into an encoding plan:
1. **Bitrate-to-CRF Lookup**: Estimates initial base CRF from file duration and target size via the `CRF_BITRATE_MAP` lookup table (720p baseline) with linear interpolation (`bitrateToCRF`).
2. **Destination routing (hard constraint)**: `WHATSAPP_NORMAL` → only `whatsapp_normal_*` profiles; `WHATSAPP_HD` → only `whatsapp_hd_*` profiles; `WHATSAPP_DOCUMENT`/`PREVIEW_WEB` → `av1_document_*` profiles (AV1). A profile whose face/text/motion thresholds fail the scene scores returns score -1 and is excluded.
3. **Soft scoring**: +3 if `hasFaces` and the profile has a `minFaceScore`; +3 if `hasText` and the profile has a `minTextScore`; +2 if `isHighMotion` and the profile has a `minMotionScore`; +1 for AV1 profiles. Highest score wins; H.264 fallback if no profile matches.
4. **CRF modifiers**:
   - `hasFaces` is true: Reduce CRF by `min(4, round(avgFaceScore * 6))` (boost skin tone quality).
   - `hasText` is true: Reduce CRF by `2` (protect edge sharpness).
   - `isHighMotion` is true: Increase CRF by `2` (stay within size budget).
   - Clamp result to `20..40`.
5. **Codec Selection**: Destination-driven (step 2) — AV1 (`libsvtav1`) is the primary codec for document/preview targets; H.264 (`libx264`) for WhatsApp chat targets, with an H.264 fallback whenever no profile matches the scene.

### Encoding Profiles (`config/encoding-profiles.json`):
- **whatsapp_normal family** (H.264 Main @ L3.1, no B-frames, 1200 kbps cap, `-preset medium`): `whatsapp_normal_face` (CRF 22), `whatsapp_normal_text` (CRF 23), `whatsapp_normal_balanced` (CRF 24).
- **whatsapp_hd family** (H.264 High @ L3.1, B-frames, 3000 kbps cap, `-preset slow`/`medium`): `whatsapp_hd_face` (CRF 19), `whatsapp_hd_text` (CRF 20), `whatsapp_hd_balanced` (CRF 21).
- **av1_document family** (AV1 `libsvtav1`, no bitrate cap, `-preset 6`): `av1_document_face` (CRF 24, `sharpness=2`), `av1_document_text` (CRF 26, `sharpness=1`), `av1_document_balanced` (CRF 28).

---

## 4. FFmpeg Command Templates

Pass command arguments as arrays via `execFileSync` to avoid shell interpolation vulnerability.

### Standard AV1 Encode (`libsvtav1`)
```bash
ffmpeg -y -threads 0 -i input.mp4 \
  -c:v libsvtav1 -preset 6 -crf 28 \
  -svtav1-params tune=0:sharpness=1 \
  -c:a aac -b:a 96k \
  -pix_fmt yuv420p -movflags +faststart \
  output.mp4
```

### Face-Detail Boost AV1 Encode
```bash
ffmpeg -y -threads 0 -i input.mp4 \
  -c:v libsvtav1 -preset 6 -crf 24 \
  -svtav1-params tune=0:sharpness=2 \
  -c:a aac -b:a 96k \
  -pix_fmt yuv420p -movflags +faststart \
  output.mp4
```

### H.264 Fallback
```bash
ffmpeg -y -threads 0 -i input.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -c:a aac -b:a 96k \
  -pix_fmt yuv420p -movflags +faststart \
  output.mp4
```

---

## 5. VMAF Quality Gate

1. **VMAF Measurement**:
   - Model Path: `models/vmaf_v0.6.1.json` (bundled; if missing, VMAF check fails open — pass with sampleCount 0 rather than blocking the job).
   - **Middle-segment sampling**: Seek both inputs to the middle of the clip (`startOffset = max(0, floor(durationSec/2) - 2.5)`) and evaluate only a 5-second segment (`-t 5`), cutting CPU footprint ~90% on long files. Within the segment, sample **1 frame per 2 seconds** when parsing the JSON log.
   - Dimension Matching: Use `scale2ref=flags=bicubic` to normalize dimensions.
   ```bash
   ffmpeg -y -threads 0 \
     -ss <startOffset> -t 5 -i output.mp4 \
     -ss <startOffset> -t 5 -i source.mp4 \
     -lavfi "[1:v][0:v]scale2ref=flags=bicubic[ref][main]; \
              [main][ref]vmaf=model_path='models/vmaf_v0.6.1.json': \
              log_path='vmaf_<id>.json':log_fmt=json" \
     -f null - -loglevel error
   ```
   (Relative `log_path` avoids Windows colon/backslash escaping bugs; the log is unlinked after parsing.)
2. **Quality Gate Decision Loop**:
   - **Baseline Threshold**: Target VMAF score $\ge 80$.
   - **Quality Failure**: If score falls below `80`, trigger a fallback pass with CRF reduced by `3` (max 1 retry, combined retry limit capped at `2`).
   - **Log Warning**: VMAF score `< 60` logs a warning but allows the job to proceed.
   - **Fail Safe**: If VMAF filter execution fails, log the error and bypass to prevent job pipeline crashes.

---

## 6. Delivery & Database Schema

### Database Changes (Prisma)
- **`EncodingProfile` Model**: Stores profiles with fields: `name`, `codec`, `crf`, `speedPreset`, `videoBitrateMax`, `minFaceScore`, `minTextScore`, `minMotionScore`.
- **`Job` Model Extensions**:
  - `analysisResult`: JSON scene scores.
  - `profileId`: Foreign key to `EncodingProfile`.
  - `vmafScore`: Float quality score.
  - `reencodeCount`: Integer tracking VMAF-triggered fallback passes.

### Delivery
- Retain optimized files temporarily for sharing or download.
- Return compression logs, warning flags, and the verified quality level metrics.

---

## 7. NoBlur Quality & Processing Standards

The engine must strictly adhere to the following delivery and optimization standards:

### 7.1 Operating Principles
1. **Preserve What Humans Notice First**: Protect faces, text, logos, screen content, sharp edges, and moving subjects.
2. **Intelligent Bit Allocation**: Distribute bits dynamically based on scene complexity, face density, and motion intensity rather than using a static bitrate layout.
3. **Keep it Lightweight**: Rely on self-hosted open-source tools (FFmpeg, OpenCV, VMAF) with zero third-party cloud AI or paid API dependencies.
4. **Codec Intelligence**: Target AV1 as the primary modern codec path. Keep H.264 as the general compatibility fallback.
5. **Practical Over Sharpening**: Avoid generative hallucinations, interpolation artifacts, or aggressive sharpening. The final goal is stable perceptual quality after platform-level compression.
6. **Execution Efficiency**: Limit CPU logical core and memory footprints through 1fps sampling and immediate memory deallocation.

### 7.2 Ingestion & Processing Pipeline Steps
- **Step 1: Ingest**: Validate uploads, verify magic-byte headers, assign UUID, store temporary original source.
- **Step 2: Probe**: Analyze container metadata, color spaces, audio channels, and rotation parameters.
- **Step 3: Scene Intelligence**: Sub-sample frames to calculate face density, text contours, and motion vectors.
- **Step 4: Policy Decision**: Map scene scores to optimized target resolution, CRF parameters, and preset scales.
- **Step 5: Encode**: Transcode to AV1 (or fallback H.264) using multi-threaded CPU acceleration.
- **Step 6: Quality Gate**: Validate output frames against original frames using VMAF, re-encoding if target falls below VMAF 80.
- **Step 7: Export**: Deliver a compact, WhatsApp-optimized file supporting balanced and high-preservation options.

### 7.3 Decision Rules
- **Face-heavy content**: CRF `-min(4, round(avgFaceScore * 6))`. Protect facial textures.
- **Text & Screenshots**: CRF -2, `tune=0:sharpness=1` or 2. Protect sharp edge contrast.
- **Fast motion**: CRF +2. Prevent blocking and pixelation.
- **Destination routing**: WhatsApp document/preview targets route to AV1 (`av1_document_*`); WhatsApp chat targets route to H.264 (`whatsapp_normal_*` / `whatsapp_hd_*`). H.264 is the compatibility fallback whenever no profile matches.

### 7.4 Quality & Codec Policies
- **Primary**: AV1 for best storage savings.
- **Fallback**: H.264 for maximum browser and device compatibility.
- **Perceptual Clarity**: Preserve details and color spaces, keep text readable, avoid overprocessing.
- **Performance**: Use batch queues, cache repeated operations, and prioritize deterministic rules over large ML models.
- **Output Standards**: Processed media must be smaller than the source, visually stable, fast to upload, and resilient to WhatsApp-style recompression.

