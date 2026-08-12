# Rules for Adaptive Engine Development — NoBlur

Governs the design, implementation, and code shape of the self-hosted adaptive media optimization engine.

## 1. No External Cloud API Dependencies
- Under no circumstance may the engine call an external cloud service (e.g. Google Cloud Video Intelligence, AWS Rekognition, Azure Cognitive Services) for media processing, scene boundary analysis, face detection, text extraction, or quality evaluation.
- All models must be open-source, tiny (under 10MB memory footprints), and run locally on CPU logical cores.

## 2. No Generative Enhancement
- The engine must strictly perform deterministic filtering, quantization, and scale mapping.
- No generative AI (e.g., GAN super-resolution, AI face reconstruction, frame interpolation) is allowed.

## 3. Strict Resource Constraints
- **Analysis Stage Bound**: The analysis service must run on sub-sampled frames (default: 1 frame per second). Running heavy operations like Haar cascades on full-rate 30/60fps video frames is prohibited due to CPU bottleneck limits.
- **VMAF Quality Gate Bound**: VMAF calculation must be sub-sampled: seek both inputs to the middle of the clip (`floor(durationSec/2) - 2.5`) and evaluate only a 5-second segment, then sample 1 frame per 2 seconds when parsing the log.

## 4. Codec Selection
- **Primary codec**: AV1 via libsvtav1. Used by default on the WhatsApp document/preview destinations (`av1_document_*` profiles).
- **Fallback codec**: H.264 via libx264. Used for WhatsApp chat destinations (`whatsapp_normal_*` / `whatsapp_hd_*` profiles) and whenever no AV1 profile matches the scene analysis.
- **Audio codec**: AAC at 64-128kbps for WhatsApp compatibility.
- **Container**: MP4 with `-movflags +faststart`.

## 5. Quality Verification
- **VMAF floor**: 80. Jobs scoring below this trigger a single re-encode with CRF reduced by 3.
- **SSIM floor**: 0.90. Retained as secondary verification from the existing pipeline.
- **Maximum retries**: 2 total across size-triggered, quality-triggered, and VMAF-triggered paths combined.

## 6. OpenCV Isolation
- All OpenCV work (face detection, text edge analysis) must run in an isolated Python subprocess, never in Node.js heap memory.
- OpenCV Matrix objects must be released immediately after scoring — no accumulation of raw buffers.
- Haar Cascade XML is resolved at runtime from `cv2.data.haarcascades`, standard system OpenCV paths, or `$OPENCV_DIR` (`get_haar_cascade_path` in `lib/opencv_analyze.py`) — it is not downloaded at runtime, and the analyzer must fail open to zero scores if OpenCV or the cascade is unavailable.

## 7. Analysis Output
- Scene analysis results are stored in `Job.analysisResult` as JSON.
- The policy engine reads this JSON to select the encoding profile.
- Analysis results are never exposed to the client — they are internal only.
