import { readAsStringAsync, writeAsStringAsync, cacheDirectory } from 'expo-file-system/legacy';
import { Alert } from 'react-native';

const OPENAI_CHAT    = 'https://api.openai.com/v1/chat/completions';
const OPENAI_IMAGES  = 'https://api.openai.com/v1/images/generations';
const REPLICATE_API  = 'https://api.replicate.com/v1/predictions';
const ANTHROPIC_CHAT = 'https://api.anthropic.com/v1/messages';

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

// ─── Vision description ───────────────────────────────────────────────────────

const EXACT_DESCRIPTION_PROMPT =
  'Describe this clothing item with photographic precision so it can be exactly reproduced. ' +
  'Include: exact garment type and silhouette; precise colors (name and approximate hex); ' +
  'material and texture appearance (matte/shiny/knit/woven/leather etc.); ' +
  'every visible construction detail (buttons, zippers, stitching, pockets, collar type, sleeve length); ' +
  'any brand name, logo, graphic print or text visible; ' +
  'the condition including any fading, distressing, or wear; ' +
  'and the angle/orientation shown in the photo. ' +
  'Write 4-6 precise sentences. Do NOT use subjective words like "stylish" or "elegant".';

async function describeWithClaude(base64: string, anthropicKey: string): Promise<string> {
  const res = await fetch(ANTHROPIC_CHAT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text',  text: EXACT_DESCRIPTION_PROMPT },
        ],
      }],
    }),
  });
  if (!res.ok) throw new Error(`Claude Haiku vision ${res.status}`);
  const json = (await res.json()) as { content: Array<{ text: string }> };
  return json.content[0]?.text?.trim() ?? '';
}

async function describeWithGPT4o(base64: string, openaiKey: string): Promise<string> {
  const res = await fetch(OPENAI_CHAT, {
    method:  'POST',
    headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o', max_tokens: 400,
      messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'high' } },
        { type: 'text', text: EXACT_DESCRIPTION_PROMPT },
      ] }],
    }),
  });
  if (!res.ok) throw new Error(`GPT-4o Vision ${res.status}`);
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  return json.choices[0]?.message?.content?.trim() ?? '';
}

/**
 * Generates a photographic description of the exact clothing item for faithful reproduction.
 * Tries Claude Haiku first (cheaper), falls back to GPT-4o.
 */
export async function describeClothingItem(
  imageUri: string,
  openaiKey: string,
  anthropicKey = '',
): Promise<string> {
  const base64 = await toBase64(imageUri);

  if (anthropicKey) {
    try {
      const desc = await describeWithClaude(base64, anthropicKey);
      if (desc) return desc;
    } catch (e) {
      console.warn('[productPhoto] Claude Haiku description failed, trying GPT-4o:', e);
    }
  }

  if (openaiKey) {
    const desc = await describeWithGPT4o(base64, openaiKey);
    if (desc) return desc;
  }

  throw new Error('No vision API key available for item description');
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildProductPrompt(description: string, category?: string): string {
  const isShoe  = category === 'shoes';
  const angle   = isShoe
    ? 'three-quarter side angle (slightly from the front-side, showing silhouette and sole edge), '
    : 'front view, centered, ';
  return (
    'Professional e-commerce product photography, pure white background (#FFFFFF), ' +
    'soft studio lighting, sharp focus, high resolution, ' +
    angle +
    'no model, no mannequin, no shadows, commercial quality, similar to Zalando or ASOS product photos. ' +
    `Product: ${description}. ` +
    'Do NOT idealize or improve the product. Reproduce exactly as described including any wear, fading, or imperfections.'
  );
}

// ─── Flux Pro via Replicate (primary, higher quality) ────────────────────────

async function generateFluxProPhoto(description: string, replicateKey: string, category?: string): Promise<string> {
  const prompt = buildProductPrompt(description, category);

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

async function generateGptImagePhoto(description: string, openaiKey: string, category?: string): Promise<string> {
  const prompt = buildProductPrompt(description, category);

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
 * Generates a faithful product photo from a description.
 * Priority: Flux Pro (Replicate) → gpt-image-1 (OpenAI fallback)
 */
export async function generateDalle3Photo(
  description: string,
  openaiKey: string,
  replicateKey = '',
  category?: string,
): Promise<string> {
  if (replicateKey) {
    try {
      console.log('[productPhoto] Trying Flux Pro...');
      return await generateFluxProPhoto(description, replicateKey, category);
    } catch (e) {
      console.warn('[productPhoto] Flux Pro failed, falling back to gpt-image-1:', e);
    }
  }
  return generateGptImagePhoto(description, openaiKey, category);
}
