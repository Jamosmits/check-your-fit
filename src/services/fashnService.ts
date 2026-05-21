import {
  readAsStringAsync,
  writeAsStringAsync,
  cacheDirectory,
} from 'expo-file-system/legacy';
import { Alert } from 'react-native';

const FASHN_RUN    = 'https://api.fashn.ai/v1/run';
const FASHN_STATUS = 'https://api.fashn.ai/v1/status';

const POLL_INTERVAL = 3000;
const MAX_POLLS     = 40; // ~2 min

export type FashnCategory = 'tops' | 'bottoms' | 'full-body';

function categoryFromItem(itemCategory: string): FashnCategory {
  if (itemCategory === 'bottoms') return 'bottoms';
  if (itemCategory === 'dresses') return 'full-body';
  return 'tops'; // tops, outerwear, accessories
}

async function toBase64(uri: string): Promise<string> {
  if (uri.startsWith('file://') || uri.startsWith('/')) {
    return readAsStringAsync(uri, { encoding: 'base64' });
  }
  if (uri.startsWith('data:')) {
    return uri.split(',')[1] ?? '';
  }
  // http/https
  const res = await fetch(uri);
  if (!res.ok) throw new Error(`Image download failed: ${res.status}`);
  const buf   = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

async function pollStatus(predictionId: string, apiKey: string): Promise<string> {
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise<void>((r) => setTimeout(r, POLL_INTERVAL));
    const res = await fetch(`${FASHN_STATUS}/${predictionId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Status check failed: ${res.status}`);
    const data = (await res.json()) as {
      status: string;
      output?: string[] | string;
      error?: string;
    };
    console.log('[fashn] poll status:', data.status);
    if (data.status === 'completed') {
      const out = data.output;
      const url = Array.isArray(out) ? out[0] : typeof out === 'string' ? out : null;
      if (!url) throw new Error('Fashn.ai: no output URL in completed response');
      return url;
    }
    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(`Fashn.ai prediction ${data.status}: ${data.error ?? ''}`);
    }
  }
  throw new Error('Fashn.ai prediction timed out');
}

async function downloadToFile(url: string, prefix: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Output download failed: ${res.status}`);
  const buf   = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  const b64  = btoa(bin);
  const path = `${cacheDirectory}${prefix}-${Date.now()}.jpg`;
  await writeAsStringAsync(path, b64, { encoding: 'base64' });
  return path;
}

/**
 * Applies a single garment to the model image using Fashn.ai.
 * Returns a local file URI of the resulting photo.
 */
async function applyGarment(
  modelImageUri: string,
  garmentImageUri: string,
  category: FashnCategory,
  apiKey: string,
): Promise<string> {
  const [modelB64, garmentB64] = await Promise.all([
    toBase64(modelImageUri),
    toBase64(garmentImageUri),
  ]);

  const body = {
    model_image:   `data:image/jpeg;base64,${modelB64}`,
    garment_image: `data:image/jpeg;base64,${garmentB64}`,
    category,
  };

  console.log('[fashn] POST /run, category:', category);
  const res = await fetch(FASHN_RUN, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '<unreadable>');
    throw new Error(`Fashn.ai run ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = (await res.json()) as { id?: string; output?: string[] | string; status?: string; error?: string };
  console.log('[fashn] run response:', JSON.stringify(data).slice(0, 200));

  // Handle synchronous response (status=completed immediately)
  if (data.status === 'completed') {
    const out = data.output;
    const url = Array.isArray(out) ? out[0] : typeof out === 'string' ? out : null;
    if (url) return downloadToFile(url, 'fashn');
  }

  if (data.status === 'failed' || data.status === 'canceled') {
    throw new Error(`Fashn.ai failed immediately: ${data.error ?? ''}`);
  }

  if (!data.id) {
    const dump = JSON.stringify(data).slice(0, 300);
    Alert.alert('Fashn.ai Error', `No prediction ID in response:\n${dump}`);
    throw new Error(`No prediction ID from Fashn.ai: ${dump}`);
  }

  const outputUrl = await pollStatus(data.id, apiKey);
  return downloadToFile(outputUrl, 'fashn');
}

/**
 * Applies all selected outfit items onto the model photo sequentially.
 * Priority: dress (full-body) → top/outerwear → bottom.
 * Returns a local file URI of the final result.
 */
export async function generateFashnTryOn(
  modelPhotoUri: string,
  garments: { imageUri: string; category: string }[],
  apiKey: string,
): Promise<string> {
  if (garments.length === 0) throw new Error('No garments provided');

  // Sort: dress first (full-body covers everything), then tops, then bottoms
  const ORDER: Record<string, number> = { dresses: 0, outerwear: 1, tops: 2, bottoms: 3, shoes: 4, accessories: 5 };
  const sorted = [...garments].sort((a, b) => (ORDER[a.category] ?? 99) - (ORDER[b.category] ?? 99));

  // Only process the meaningful categories (skip shoes/accessories for now)
  const toProcess = sorted.filter((g) => ['tops', 'bottoms', 'outerwear', 'dresses'].includes(g.category));
  if (toProcess.length === 0) throw new Error('No processable garments (tops/bottoms/dresses)');

  // If a dress is selected, only use that (full-body)
  const hasDress = toProcess.some((g) => g.category === 'dresses');
  const items    = hasDress ? toProcess.filter((g) => g.category === 'dresses').slice(0, 1) : toProcess.slice(0, 2);

  let currentModelUri = modelPhotoUri;
  for (const garment of items) {
    console.log('[fashn] applying garment category:', garment.category);
    currentModelUri = await applyGarment(
      currentModelUri,
      garment.imageUri,
      categoryFromItem(garment.category),
      apiKey,
    );
  }

  return currentModelUri;
}
