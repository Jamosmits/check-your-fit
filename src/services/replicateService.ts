import {
  readAsStringAsync,
  writeAsStringAsync,
  cacheDirectory,
} from 'expo-file-system/legacy';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40; // ~2 minute timeout

type GhostCategory = 0 | 1 | 2; // 0=upper body, 1=lower body, 2=dress

/**
 * Uploads a local image file to Replicate's file storage.
 * Returns the hosted URL, or null on failure.
 */
async function uploadToReplicate(imageUri: string, apiKey: string): Promise<string | null> {
  const base64 = await readAsStringAsync(imageUri, { encoding: 'base64' });

  // Decode base64 → Uint8Array for binary upload
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const res = await fetch('https://api.replicate.com/v1/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'image/jpeg',
      'Content-Disposition': 'attachment; filename="clothing.jpg"',
    },
    body: bytes.buffer as ArrayBuffer,
  });

  if (!res.ok) {
    console.warn('Replicate file upload failed', res.status, await res.text().catch(() => ''));
    return null;
  }

  const data = (await res.json()) as { urls?: { get?: string } };
  return data.urls?.get ?? null;
}

/** Polls a Replicate prediction until it succeeds, fails, or times out. */
async function pollPrediction(predictionId: string, apiKey: string): Promise<string | null> {
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise<void>((r) => setTimeout(r, POLL_INTERVAL_MS));

    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) return null;

    const pred = (await res.json()) as { status: string; output?: unknown };

    if (pred.status === 'succeeded') {
      const out = pred.output;
      if (Array.isArray(out) && out.length > 0) return out[0] as string;
      if (typeof out === 'string') return out;
      return null;
    }

    if (pred.status === 'failed' || pred.status === 'canceled') return null;
  }

  return null; // timed out
}

/** Downloads an image from a URL and saves it to the local cache. */
async function downloadToCache(url: string): Promise<string | null> {
  const res = await fetch(url);
  if (!res.ok) return null;

  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  const base64 = btoa(binary);

  const dest = `${cacheDirectory}gmk-${Date.now()}.jpg`;
  await writeAsStringAsync(dest, base64, { encoding: 'base64' });
  return dest;
}

/**
 * Generates a ghost mannequin / virtual try-on version of a clothing item
 * using OOTDiffusion on Replicate (levihsu/ootdiffusion).
 *
 * Flow:
 *   1. Upload the bg-removed clothing image to Replicate's file storage
 *   2. Submit a prediction to OOTDiffusion
 *   3. Poll until done (up to ~2 minutes)
 *   4. Download the output to local cache
 *
 * Falls back to the original imageUri on any error or if no API key.
 *
 * @param imageUri   Local file URI of the bg-removed clothing photo
 * @param apiKey     Replicate API token
 * @param category   0=upper body, 1=lower body, 2=dress
 */
export async function applyGhostMannequin(
  imageUri: string,
  apiKey: string,
  category: GhostCategory = 0,
): Promise<string> {
  if (!apiKey) return imageUri;

  try {
    // 1. Upload the image so Replicate can fetch it
    const fileUrl = await uploadToReplicate(imageUri, apiKey);
    if (!fileUrl) return imageUri;

    // 2. Create OOTDiffusion prediction
    const res = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Ask Replicate to wait up to 5 s before switching to async polling
        Prefer: 'wait=5',
      },
      body: JSON.stringify({
        model: 'levihsu/ootdiffusion',
        input: {
          model_type: 'dc',
          category,
          cloth_image: fileUrl,
        },
      }),
    });

    if (!res.ok) {
      console.warn('Replicate prediction error', res.status, await res.text().catch(() => ''));
      return imageUri;
    }

    const pred = (await res.json()) as { id: string; status: string; output?: unknown };

    // 3. Resolve output URL (may already be ready if Replicate responded synchronously)
    let outputUrl: string | null = null;

    if (pred.status === 'succeeded') {
      const out = pred.output;
      outputUrl = Array.isArray(out)
        ? (out[0] as string)
        : typeof out === 'string'
          ? out
          : null;
    } else if (pred.id && pred.status !== 'failed' && pred.status !== 'canceled') {
      outputUrl = await pollPrediction(pred.id, apiKey);
    }

    if (!outputUrl) return imageUri;

    // 4. Download the result to local cache for persistence
    const localUri = await downloadToCache(outputUrl);
    return localUri ?? imageUri;
  } catch (e) {
    console.warn('Ghost mannequin exception', e);
    return imageUri;
  }
}
