/**
 * Generate the marketing landing imagery with the Gemini API and write it to
 * public/images/landing/. Run: npm run generate:landing-images
 *
 * Requires GEMINI_API_KEY in the environment (loaded via --env-file=.env).
 * The script is idempotent: it skips files that already exist unless --force
 * is passed, so a partial rerun fills in missing images only.
 */

import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../public/images/landing');
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
const API_KEY = process.env.GEMINI_API_KEY;
const FORCE = process.argv.includes('--force');

const IMAGES = [
  {
    file: 'status.webp',
    prompt:
      'Vertical smartphone held in hand, screen showing a WhatsApp Status story playing a sharp video clip. The screen is the only bright element, photo-real, ambient light. Background is a clean warm neutral surface, soft and out of focus. WhatsApp green accent #25D366 only. No text, no logo, no watermark. Photorealistic product-shot style, 9:16.',
  },
  {
    file: 'chat.webp',
    prompt:
      'Smartphone screen close-up of a WhatsApp chat conversation with a crisp high-detail photo shared in the message. Modern flat minimal UI, WhatsApp green accents #25D366 and #075E54 only. Clean light background, soft shadows, photorealistic. No other saturated colors, no watermark, 9:16.',
  },
  {
    file: 'product.webp',
    prompt:
      'Smartphone showing a WhatsApp Business product catalog grid of an African fashion seller: sharp bag and clothing product photos arranged cleanly. Flat, minimal, premium presentation, generous white space. Green accent #25D366 only. Photorealistic, no text, no watermark, 9:16.',
  },
  {
    file: 'avatar-1.webp',
    prompt:
      'Close-up portrait photo of a smiling young Nigerian woman in her twenties, natural light, clean studio background in muted neutral tones, sharp focus on face, square crop, photorealistic, modest, warm and authentic. No text.',
  },
  {
    file: 'avatar-2.webp',
    prompt:
      'Close-up portrait photo of a smiling Nigerian man in his thirties, natural light, clean studio background in muted neutral tones, sharp focus on face, square crop, photorealistic, warm and authentic. No text.',
  },
  {
    file: 'avatar-3.webp',
    prompt:
      'Close-up portrait photo of a confident young Nigerian woman market seller in her twenties, natural light, clean studio background in muted neutral tones, sharp focus on face, square crop, photorealistic, warm and authentic. No text.',
  },
];

if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY. Add it to .env and run with --env-file=.env.');
  process.exit(1);
}

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function generateImage(prompt) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    throw new Error(`${MODEL} responded ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const image = parts.find((part) => part.inlineData?.data);
  if (!image) {
    throw new Error(`No image returned by ${MODEL}. Response: ${JSON.stringify(data).slice(0, 500)}`);
  }
  return Buffer.from(image.inlineData.data, 'base64');
}

await mkdir(OUT_DIR, { recursive: true });

let generated = 0;
let skipped = 0;

for (const { file, prompt } of IMAGES) {
  const outPath = resolve(OUT_DIR, file);
  if (!FORCE && (await fileExists(outPath))) {
    skipped += 1;
    console.log(`skip   ${file} (exists, use --force to regenerate)`);
    continue;
  }
  console.log(`generate ${file} ...`);
  try {
    const bytes = await generateImage(prompt);
    await writeFile(outPath, bytes);
    generated += 1;
    console.log(`wrote  ${outPath} (${(bytes.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    console.error(`failed ${file}: ${err instanceof Error ? err.message : err}`);
  }
}

console.log(`done. generated=${generated} skipped=${skipped}`);