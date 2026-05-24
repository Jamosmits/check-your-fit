import {
  readAsStringAsync,
  writeAsStringAsync,
  cacheDirectory,
} from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FASHN_RUN    = 'https://api.fashn.ai/v1/run';
const FASHN_STATUS = 'https://api.fashn.ai/v1/status';
const REPLICATE_API = 'https://api.replicate.com/v1/predictions';

const REPLICATE_POLL_MS   = 2000;
const REPLICATE_MAX_POLLS = 30;   // 60 s max

const FASHN_POLL_MS   = 3000;
const FASHN_MAX_POLLS = 40;       // ~2 min (face-to-model only)

type IdmCategory = 'upper_body' | 'lower_body' | 'dresses';

function idmCategoryFromItem(itemCategory: string): IdmCategory {
  if (itemCategory === 'bottoms') return 'lower_body';
  if (itemCategory === 'dresses') return 'dresses';
  return 'upper_body';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function toBase64(uri: string): Promise<string> {
  if (uri.startsWith('file://') || uri.startsWith('/')) {
    return readAsStringAsync(uri, { encoding: 'base64' });
  }
  if (uri.startsWith('data:')) {
    return uri.split(',')[1] ?? '';
  }
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

// ─── Replicate IDM-VTON ───────────────────────────────────────────────────────

async function pollReplicate(id: string, replicateKey: string): Promise<string> {
  for (let i = 0; i < REPLICATE_MAX_POLLS; i++) {
    await new Promise<void>((r) => setTimeout(r, REPLICATE_POLL_MS));
    const res = await fetch(`${REPLICATE_API}/${id}`, {
      headers: { Authorization: `Token ${replicateKey}` },
    });
    if (!res.ok) throw new Error(`Replicate poll ${res.status}`);
    const pred = (await res.json()) as { status: string; output?: unknown; error?: string };
    console.log(`[Replicate] poll ${i + 1}/${REPLICATE_MAX_POLLS} — status: ${pred.status}`);
    if (pred.status === 'succeeded') {
      const out = pred.output;
      // IDM-VTON output: [masked_image, result_image] — index 1 is the try-on result
      if (Array.isArray(out) && out.length > 1) return out[1] as string;
      if (Array.isArray(out) && out.length === 1) return out[0] as string;
      if (typeof out === 'string') return out;
      throw new Error('IDM-VTON: geen output in succeeded response');
    }
    if (pred.status === 'failed' || pred.status === 'canceled') {
      throw new Error(`IDM-VTON ${pred.status}: ${pred.error ?? ''}`);
    }
  }
  throw new Error('IDM-VTON prediction timed out na 60s');
}

async function applyGarmentIdmVton(
  modelImageUri: string,
  garmentImageUri: string,
  garmentDescription: string,
  garmentCategory: string,
  replicateKey: string,
): Promise<string> {
  console.log('[Replicate] IDM-VTON start — category:', garmentCategory);
  const [modelB64, garmentB64] = await Promise.all([
    toBase64(modelImageUri),
    toBase64(garmentImageUri),
  ]);

  const res = await fetch(REPLICATE_API, {
    method:  'POST',
    headers: {
      Authorization:  `Token ${replicateKey}`,
      'Content-Type': 'application/json',
      Prefer:         'wait=5',
    },
    body: JSON.stringify({
      model: 'cuuupid/idm-vton',
      input: {
        human_img:   `data:image/jpeg;base64,${modelB64}`,
        garm_img:    `data:image/jpeg;base64,${garmentB64}`,
        garment_des: garmentDescription || 'clothing item',
        category:    idmCategoryFromItem(garmentCategory),
        crop:        false,
        steps:       20,
      },
    }),
  });

  if (!res.ok) throw new Error(`IDM-VTON ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const pred = (await res.json()) as { id: string; status: string; output?: unknown };
  console.log('[Replicate] prediction ID:', pred.id, '| status:', pred.status);

  let outputUrl: string;
  if (pred.status === 'succeeded') {
    const out = pred.output;
    if (Array.isArray(out) && out.length > 1) outputUrl = out[1] as string;
    else if (Array.isArray(out) && out.length === 1) outputUrl = out[0] as string;
    else outputUrl = out as string;
  } else {
    outputUrl = await pollReplicate(pred.id, replicateKey);
  }

  console.log('[Replicate] IDM-VTON SUCCESS:', outputUrl.slice(0, 60));
  return downloadToFile(outputUrl, 'idmvton');
}

// ─── Fashn.ai face-to-model (profile photo generation) ───────────────────────

async function pollFashn(predictionId: string, apiKey: string): Promise<string> {
  for (let i = 0; i < FASHN_MAX_POLLS; i++) {
    await new Promise<void>((r) => setTimeout(r, FASHN_POLL_MS));
    const res = await fetch(`${FASHN_STATUS}/${predictionId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Status check failed: ${res.status}`);
    const data = (await res.json()) as { status: string; output?: string[] | string; error?: string };
    console.log('[Fashn] poll status:', data.status);
    if (data.status === 'completed') {
      const out = data.output;
      const url = Array.isArray(out) ? out[0] : typeof out === 'string' ? out : null;
      if (!url) throw new Error('Fashn.ai: geen output URL');
      return url;
    }
    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(`Fashn.ai ${data.status}: ${data.error ?? ''}`);
    }
  }
  throw new Error('Fashn.ai prediction timed out');
}

export async function generateFaceToModel(
  faceImageUri: string,
  measurements: { height?: number; weight?: number; size?: string; gender?: string },
  fashnKey: string,
): Promise<string> {
  const faceB64 = await toBase64(faceImageUri);

  const inputs: Record<string, unknown> = { face_image: `data:image/jpeg;base64,${faceB64}` };
  if (measurements.height) inputs.height = measurements.height;
  if (measurements.weight) inputs.weight = measurements.weight;
  if (measurements.size)   inputs.size   = measurements.size;
  if (measurements.gender) inputs.gender = measurements.gender;

  const res = await fetch(FASHN_RUN, {
    method:  'POST',
    headers: { Authorization: `Bearer ${fashnKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_name: 'face-to-model', inputs }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '<unreadable>');
    throw new Error(`Fashn.ai face-to-model ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = (await res.json()) as { id?: string; output?: string[] | string; status?: string; error?: string };

  if (data.status === 'completed') {
    const out = data.output;
    const url = Array.isArray(out) ? out[0] : typeof out === 'string' ? out : null;
    if (url) return downloadToFile(url, 'face2model');
  }
  if (data.status === 'failed' || data.status === 'canceled') {
    throw new Error(`Fashn.ai face-to-model ${data.status}: ${data.error ?? ''}`);
  }
  if (!data.id) throw new Error('Geen prediction ID van Fashn.ai face-to-model');

  const outputUrl = await pollFashn(data.id, fashnKey);
  return downloadToFile(outputUrl, 'face2model');
}

// ─── Virtual try-on (Replicate IDM-VTON only) ─────────────────────────────────

/**
 * Applies garments onto the model photo using Replicate IDM-VTON.
 * Loads the Replicate API key directly from AsyncStorage immediately before
 * the API call — no stale closure / no parameter passing required.
 */
export async function generateFashnTryOn(
  modelPhotoUri: string,
  garments: { imageUri: string; category: string; description?: string }[],
): Promise<string> {
  if (garments.length === 0) throw new Error('Geen kledingstukken geselecteerd');

  // Debug: dump every AsyncStorage key so we know exactly what name is used
  const replicateKey =
    await AsyncStorage.getItem('replicate_key').catch(() => null) ||
    await AsyncStorage.getItem('replicateKey').catch(() => null) ||
    await AsyncStorage.getItem('settings_replicate_key').catch(() => null);

  console.log('[DEBUG alle keys in AsyncStorage]:');
  const allKeys = await AsyncStorage.getAllKeys().catch(() => [] as readonly string[]);
  console.log(allKeys);
  for (const key of allKeys) {
    const val = await AsyncStorage.getItem(key).catch(() => null);
    console.log(key, '=', val ? val.substring(0, 12) : 'null');
  }

  console.log('[Replicate key]:', replicateKey ? replicateKey.substring(0, 8) + '…' : 'LEEG');

  if (!replicateKey) throw new Error('Voeg Replicate API key toe in Instellingen');

  const ORDER: Record<string, number> = { dresses: 0, outerwear: 1, tops: 2, bottoms: 3, shoes: 4, accessories: 5 };
  const sorted = [...garments].sort((a, b) => (ORDER[a.category] ?? 99) - (ORDER[b.category] ?? 99));

  const toProcess = sorted.filter((g) => ['tops', 'bottoms', 'outerwear', 'dresses'].includes(g.category));
  if (toProcess.length === 0) {
    throw new Error('Virtual try-on werkt alleen voor kleding (tops, broeken, jurken). Schoenen en accessoires worden niet ondersteund.');
  }

  const hasDress = toProcess.some((g) => g.category === 'dresses');
  const items    = hasDress
    ? toProcess.filter((g) => g.category === 'dresses').slice(0, 1)
    : toProcess.slice(0, 2);

  let currentModelUri = modelPhotoUri;
  for (const garment of items) {
    currentModelUri = await applyGarmentIdmVton(
      currentModelUri,
      garment.imageUri,
      garment.description ?? garment.category,
      garment.category,
      replicateKey,
    );
  }

  return currentModelUri;
}
