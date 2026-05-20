import {
  readAsStringAsync,
  writeAsStringAsync,
  cacheDirectory,
} from 'expo-file-system/legacy';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40; // ~2-minute timeout

export type GhostCategory = 0 | 1 | 2; // 0=upper body, 1=lower body, 2=dress

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Polls a Replicate prediction until succeeded / failed / timed out. */
async function pollPrediction(predictionId: string, apiKey: string): Promise<string | null> {
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise<void>((r) => setTimeout(r, POLL_INTERVAL_MS));

    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Token ${apiKey}` },
    });
    if (!res.ok) return null;

    const pred = (await res.json()) as { status: string; output?: unknown; error?: string };

    if (pred.status === 'succeeded') {
      const out = pred.output;
      if (Array.isArray(out) && out.length > 0) return out[0] as string;
      if (typeof out === 'string') return out;
      return null;
    }
    if (pred.status === 'failed' || pred.status === 'canceled') {
      console.warn('Replicate prediction failed:', pred.error);
      return null;
    }
  }
  console.warn('Replicate prediction timed out');
  return null;
}

/** Resolves a prediction response to the final output URL, polling if needed. */
async function resolveOutput(pred: {
  id: string;
  status: string;
  output?: unknown;
}, apiKey: string): Promise<string | null> {
  if (pred.status === 'succeeded') {
    const out = pred.output;
    if (Array.isArray(out) && out.length > 0) return out[0] as string;
    if (typeof out === 'string') return out;
    return null;
  }
  if (pred.id && pred.status !== 'failed' && pred.status !== 'canceled') {
    return pollPrediction(pred.id, apiKey);
  }
  return null;
}

/** Fetches a remote image URL and saves it to the local cache. Returns null on error. */
async function downloadToCache(url: string, prefix: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    const base64 = btoa(binary);

    const dest = `${cacheDirectory}${prefix}-${Date.now()}.jpg`;
    await writeAsStringAsync(dest, base64, { encoding: 'base64' });
    return dest;
  } catch {
    return null;
  }
}

// ─── Primary model: OOTDiffusion ─────────────────────────────────────────────

/**
 * Attempts ghost mannequin via levihsu/OOTDiffusion.
 *
 * Sends the bg-removed clothing photo as a base64 data URI.
 * OOTDiffusion's `category` param: 0=upper, 1=lower, 2=dress.
 * Returns the Replicate output URL, or null if the call fails.
 */
async function tryOOTDiffusion(
  imageBase64: string,
  apiKey: string,
  category: GhostCategory,
): Promise<string | null> {
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=5',
    },
    body: JSON.stringify({
      model: 'levihsu/ootdiffusion',
      input: {
        model_type: 'dc',
        category,
        cloth_image: `data:image/jpeg;base64,${imageBase64}`,
      },
    }),
  });

  if (!res.ok) {
    console.warn('OOTDiffusion error:', res.status, await res.text().catch(() => ''));
    return null;
  }

  const pred = (await res.json()) as { id: string; status: string; output?: unknown };
  return resolveOutput(pred, apiKey);
}

// ─── Fallback model: garment-to-product-image ────────────────────────────────

/**
 * Fallback: viktorfa/garment-to-product-image.
 * Converts a garment photo to a clean product-style image.
 */
async function tryGarmentToProduct(
  imageBase64: string,
  apiKey: string,
): Promise<string | null> {
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=5',
    },
    body: JSON.stringify({
      model: 'viktorfa/garment-to-product-image',
      input: {
        garment_image: `data:image/jpeg;base64,${imageBase64}`,
      },
    }),
  });

  if (!res.ok) {
    console.warn('garment-to-product error:', res.status, await res.text().catch(() => ''));
    return null;
  }

  const pred = (await res.json()) as { id: string; status: string; output?: unknown };
  return resolveOutput(pred, apiKey);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generates a ghost mannequin / product photo from a bg-removed clothing image.
 *
 * Flow:
 *   1. Read the local file as base64
 *   2. Try OOTDiffusion (levihsu/ootdiffusion)
 *   3. On failure, try garment-to-product-image (viktorfa)
 *   4. Download the result to local cache for persistence
 *   5. Fall back to the input imageUri if both models fail
 *
 * @param imageUri  Local file URI of the bg-removed clothing photo
 * @param apiKey    Replicate API token (r8_...)
 * @param category  0=upper body, 1=lower body, 2=dress
 */
export async function applyGhostMannequin(
  imageUri: string,
  apiKey: string,
  category: GhostCategory = 0,
): Promise<string> {
  if (!apiKey) return imageUri;

  try {
    // Download remote URLs to local cache before reading as base64
    let localUri = imageUri;
    if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
      const cached = await downloadToCache(imageUri, 'input');
      if (!cached) return imageUri;
      localUri = cached;
    }
    const imageBase64 = await readAsStringAsync(localUri, { encoding: 'base64' });

    // Try primary model first
    let outputUrl = await tryOOTDiffusion(imageBase64, apiKey, category);

    // Fall back to secondary model
    if (!outputUrl) {
      console.warn('OOTDiffusion failed or returned nothing — trying fallback model');
      outputUrl = await tryGarmentToProduct(imageBase64, apiKey);
    }

    if (!outputUrl) {
      console.warn('All ghost mannequin models failed — using bg-removed image');
      return imageUri;
    }

    // Download to local cache so the URL stays valid after Replicate's expiry window
    const localUri = await downloadToCache(outputUrl, 'gmk');
    return localUri ?? imageUri;
  } catch (e) {
    console.warn('applyGhostMannequin exception:', e);
    return imageUri;
  }
}
