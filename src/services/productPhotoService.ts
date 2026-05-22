import { readAsStringAsync, writeAsStringAsync, cacheDirectory } from 'expo-file-system/legacy';
import { Alert } from 'react-native';

const OPENAI_CHAT   = 'https://api.openai.com/v1/chat/completions';
const OPENAI_IMAGES = 'https://api.openai.com/v1/images/generations';
const REPLICATE_API = 'https://api.replicate.com/v1/predictions';

const POLL_INTERVAL = 3000;
const MAX_POLLS     = 40;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function toBase64(uri: string): Promise<string> {
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    const res = await fetch(uri);
    if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = ''; bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  return readAsStringAsync(uri, { encoding: 'base64' });
}

async function saveToCache(b64: string, prefix: string): Promise<string> {
  const path = `${cacheDirectory}${prefix}-${Date.now()}.png`;
  await writeAsStringAsync(path, b64, { encoding: 'base64' });
  return path;
}

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
      throw new Error('Replicate: no output in succeeded response');
    }
    if (pred.status === 'failed' || pred.status === 'canceled') {
      throw new Error(`Replicate ${pred.status}: ${pred.error ?? ''}`);
    }
  }
  throw new Error('Replicate prediction timed out');
}

async function downloadToCache(url: string, prefix: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = ''; bytes.forEach((b) => { bin += String.fromCharCode(b); });
  const path = `${cacheDirectory}${prefix}-${Date.now()}.jpg`;
  await writeAsStringAsync(path, btoa(bin), { encoding: 'base64' });
  return path;
}

// ─── GPT-4o Vision description ────────────────────────────────────────────────

export async function describeClothingItem(imageUri: string, openaiKey: string): Promise<string> {
  const base64 = await toBase64(imageUri);
  const res = await fetch(OPENAI_CHAT, {
    method:  'POST',
    headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o', max_tokens: 200,
      messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'low' } },
        { type: 'text', text: 'Describe this clothing item in precise detail for a fashion product photo. Include: exact garment type, colour(s), material/texture, visible brand or logo, style details, fit, and any distinctive design elements. Be specific and concise (2-3 sentences).' },
      ] }],
    }),
  });
  if (!res.ok) throw new Error(`GPT-4o Vision ${res.status}`);
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  return json.choices[0]?.message?.content?.trim() ?? 'a clothing item';
}

// ─── Flux Pro via Replicate (primary, higher quality) ────────────────────────

async function generateFluxProPhoto(description: string, replicateKey: string): Promise<string> {
  const prompt =
    `Professional fashion e-commerce product photo. ${description}. ` +
    `Pure white background, studio lighting, centered, no model, no mannequin.`;

  const res = await fetch(REPLICATE_API, {
    method:  'POST',
    headers: { Authorization: `Token ${replicateKey}`, 'Content-Type': 'application/json', Prefer: 'wait=5' },
    body: JSON.stringify({
      model: 'black-forest-labs/flux-pro',
      input: { prompt, aspect_ratio: '1:1', output_format: 'webp' },
    }),
  });

  if (!res.ok) throw new Error(`Flux Pro ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const pred = (await res.json()) as { id: string; status: string; output?: unknown };

  const outputUrl = pred.status === 'succeeded'
    ? (Array.isArray(pred.output) ? pred.output[0] as string : pred.output as string)
    : await pollReplicate(pred.id, replicateKey);

  return downloadToCache(outputUrl, 'flux');
}

// ─── gpt-image-1 (fallback) ──────────────────────────────────────────────────

async function generateGptImagePhoto(description: string, openaiKey: string): Promise<string> {
  const prompt = `Professional fashion e-commerce product photo. ${description}. White background, studio lighting, centered.`;

  const res = await fetch(OPENAI_IMAGES, {
    method:  'POST',
    headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: '1024x1024' }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '<unreadable>');
    Alert.alert('Image Generation Error', `Status: ${res.status}\n\n${errText}`);
    throw new Error(`gpt-image-1 ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as { data: { b64_json?: string }[] };
  const b64  = json.data?.[0]?.b64_json;
  if (!b64) throw new Error('No b64_json in gpt-image-1 response');
  return saveToCache(b64, 'gpt-img');
}

// ─── Public: generate HD product photo ───────────────────────────────────────

/**
 * Generates a product photo.
 * Priority: Flux Pro (Replicate) → gpt-image-1 (OpenAI fallback)
 */
export async function generateDalle3Photo(
  description: string,
  openaiKey: string,
  replicateKey = '',
): Promise<string> {
  if (replicateKey) {
    try {
      console.log('[productPhoto] Trying Flux Pro...');
      return await generateFluxProPhoto(description, replicateKey);
    } catch (e) {
      console.warn('[productPhoto] Flux Pro failed, falling back to gpt-image-1:', e);
    }
  }
  return generateGptImagePhoto(description, openaiKey);
}
