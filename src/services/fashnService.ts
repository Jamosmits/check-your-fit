import {
  readAsStringAsync,
  writeAsStringAsync,
  cacheDirectory,
} from 'expo-file-system/legacy';
import { Alert } from 'react-native';

const FASHN_RUN    = 'https://api.fashn.ai/v1/run';
const FASHN_STATUS = 'https://api.fashn.ai/v1/status';
const REPLICATE_API = 'https://api.replicate.com/v1/predictions';

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

// ─── IDM-VTON via Replicate (primary) ────────────────────────────────────────

async function pollReplicate(id: string, replicateKey: string): Promise<string> {
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise<void>((r) => setTimeout(r, POLL_INTERVAL));
    const res = await fetch(`${REPLICATE_API}/${id}`, {
      headers: { Authorization: `Token ${replicateKey}` },
    });
    if (!res.ok) throw new Error(`Replicate poll ${res.status}`);
    const pred = (await res.json()) as { status: string; output?: unknown; error?: string };
    if (pred.status === 'succeeded') {
      const out = pred.output;
      if (Array.isArray(out) && out.length > 0) return out[0] as string;
      if (typeof out === 'string') return out;
      throw new Error('IDM-VTON: no output in succeeded response');
    }
    if (pred.status === 'failed' || pred.status === 'canceled') {
      throw new Error(`IDM-VTON ${pred.status}: ${pred.error ?? ''}`);
    }
  }
  throw new Error('IDM-VTON prediction timed out');
}

async function applyGarmentIdmVton(
  modelImageUri: string,
  garmentImageUri: string,
  garmentDescription: string,
  replicateKey: string,
): Promise<string> {
  const [modelB64, garmentB64] = await Promise.all([
    toBase64(modelImageUri),
    toBase64(garmentImageUri),
  ]);

  const res = await fetch(REPLICATE_API, {
    method:  'POST',
    headers: { Authorization: `Token ${replicateKey}`, 'Content-Type': 'application/json', Prefer: 'wait=5' },
    body: JSON.stringify({
      model: 'cuuupid/idm-vton',
      input: {
        human_img:   `data:image/jpeg;base64,${modelB64}`,
        garm_img:    `data:image/jpeg;base64,${garmentB64}`,
        garment_des: garmentDescription || 'clothing item',
      },
    }),
  });

  if (!res.ok) throw new Error(`IDM-VTON ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const pred = (await res.json()) as { id: string; status: string; output?: unknown };

  const outputUrl = pred.status === 'succeeded'
    ? (Array.isArray(pred.output) ? pred.output[0] as string : pred.output as string)
    : await pollReplicate(pred.id, replicateKey);

  return downloadToFile(outputUrl, 'idmvton');
}

// ─── Fashn.ai (fallback) ──────────────────────────────────────────────────────

async function pollFashn(predictionId: string, apiKey: string): Promise<string> {
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

async function applyGarmentFashn(
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

  const outputUrl = await pollFashn(data.id, apiKey);
  return downloadToFile(outputUrl, 'fashn');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Applies all selected outfit items onto the model photo sequentially.
 * Priority: IDM-VTON (Replicate) → Fashn.ai fallback.
 * Dress (full-body) takes priority over separate top+bottom.
 */
export async function generateFashnTryOn(
  modelPhotoUri: string,
  garments: { imageUri: string; category: string; description?: string }[],
  fashnKey: string,
  replicateKey = '',
): Promise<string> {
  if (garments.length === 0) throw new Error('No garments provided');

  const ORDER: Record<string, number> = { dresses: 0, outerwear: 1, tops: 2, bottoms: 3, shoes: 4, accessories: 5 };
  const sorted = [...garments].sort((a, b) => (ORDER[a.category] ?? 99) - (ORDER[b.category] ?? 99));

  const toProcess = sorted.filter((g) => ['tops', 'bottoms', 'outerwear', 'dresses'].includes(g.category));
  if (toProcess.length === 0) throw new Error('No processable garments (tops/bottoms/dresses)');

  const hasDress = toProcess.some((g) => g.category === 'dresses');
  const items    = hasDress ? toProcess.filter((g) => g.category === 'dresses').slice(0, 1) : toProcess.slice(0, 2);

  let currentModelUri = modelPhotoUri;
  for (const garment of items) {
    if (replicateKey) {
      try {
        console.log('[tryOn] Trying IDM-VTON for category:', garment.category);
        currentModelUri = await applyGarmentIdmVton(
          currentModelUri,
          garment.imageUri,
          garment.description ?? garment.category,
          replicateKey,
        );
        continue;
      } catch (e) {
        console.warn('[tryOn] IDM-VTON failed, falling back to Fashn.ai:', e);
      }
    }

    if (fashnKey) {
      console.log('[tryOn] Using Fashn.ai for category:', garment.category);
      currentModelUri = await applyGarmentFashn(
        currentModelUri,
        garment.imageUri,
        categoryFromItem(garment.category),
        fashnKey,
      );
    } else {
      throw new Error('Geen try-on API key beschikbaar (Replicate of Fashn.ai)');
    }
  }

  return currentModelUri;
}
