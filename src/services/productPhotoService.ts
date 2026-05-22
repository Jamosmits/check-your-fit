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

// ─── Flux-specific vision description ────────────────────────────────────────

const FLUX_DESCRIPTION_PROMPT =
  'Analyze this clothing item in extreme detail. Describe:\n' +
  '- Exact product type (e.g. "slide sandal", "zip-up bomber jacket")\n' +
  '- Exact primary color and secondary colors with hex if possible\n' +
  '- Material and texture (e.g. "smooth rubber", "knitted wool")\n' +
  '- All visible logos, text, patterns, stripes, prints\n' +
  '- Unique design details (zippers, buttons, stitching, holes)\n' +
  '- Condition (new/used/worn)\n' +
  '- Camera angle of the original photo\n' +
  'Return ONLY a comma-separated list of descriptive terms, no sentences.';

async function describeForFlux(
  imageUri: string,
  anthropicKey: string,
  openaiKey: string,
  fallback: string,
): Promise<string> {
  const base64 = await toBase64(imageUri);

  if (anthropicKey) {
    try {
      const res = await fetch(ANTHROPIC_CHAT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
              { type: 'text',  text: FLUX_DESCRIPTION_PROMPT },
            ],
          }],
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { content: Array<{ text: string }> };
        const text = json.content[0]?.text?.trim();
        if (text) return text;
      }
    } catch (e) {
      console.warn('[fluxPro] Haiku description failed:', e);
    }
  }

  if (openaiKey) {
    try {
      const res = await fetch(OPENAI_CHAT, {
        method:  'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o', max_tokens: 300,
          messages: [{ role: 'user', content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'high' } },
            { type: 'text', text: FLUX_DESCRIPTION_PROMPT },
          ] }],
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { choices: { message: { content: string } }[] };
        const text = json.choices[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch (e) {
      console.warn('[fluxPro] GPT-4o description fallback failed:', e);
    }
  }

  return fallback;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms),
    ),
  ]);
}

// ─── Flux 1.1 Pro via Replicate (primary) ────────────────────────────────────

async function generateFluxProPhoto(
  imageUri: string,
  description: string,
  replicateKey: string,
  anthropicKey: string,
  openaiKey: string,
  category?: string,
): Promise<string> {
  const fluxTerms = await describeForFlux(imageUri, anthropicKey, openaiKey, description);
  const isShoe    = category === 'shoes';
  const angleTag  = isShoe
    ? '3/4 angle view from front-side showing sole edge'
    : '3/4 angle view from front-left, ghost mannequin effect for clothing';

  const prompt =
    'Professional e-commerce product photography, pure white background, ' +
    'soft diffused studio lighting, sharp crisp focus, ' +
    `${fluxTerms}, centered composition, ${angleTag}, ` +
    'no shadows, no mannequin, no model, ' +
    'commercial catalog quality identical to Zalando or ASOS, ' +
    'photorealistic, 4k resolution';

  console.log('[fluxPro] Haiku terms:', fluxTerms);
  console.log('[fluxPro] full prompt:', prompt);

  const run = async (): Promise<string> => {
    const res = await fetch(REPLICATE_API, {
      method:  'POST',
      headers: { Authorization: `Token ${replicateKey}`, 'Content-Type': 'application/json', Prefer: 'wait=5' },
      body: JSON.stringify({
        model: 'black-forest-labs/flux-1.1-pro',
        input: {
          prompt,
          width:             768,
          height:            1024,
          prompt_upsampling: true,
          safety_tolerance:  5,
          output_format:     'jpeg',
          output_quality:    95,
        },
      }),
    });

    if (!res.ok) throw new Error(`Flux 1.1 Pro ${res.status}: ${(await res.text()).slice(0, 200)}`);

    const pred = (await res.json()) as { id: string; status: string; output?: unknown; error?: string };
    console.log('[fluxPro] initial response:', JSON.stringify({ id: pred.id, status: pred.status, output: pred.output, error: pred.error }));

    let outputUrl: string;
    if (pred.status === 'succeeded') {
      outputUrl = Array.isArray(pred.output) ? pred.output[0] as string : pred.output as string;
    } else {
      outputUrl = await pollReplicate(pred.id, replicateKey);
    }

    console.log('[fluxPro] output URL:', outputUrl);
    return downloadToCache(outputUrl, 'flux');
  };

  return withTimeout(run(), 30_000);
}

// ─── gpt-image-1 (fallback) ──────────────────────────────────────────────────

async function generateGptImagePhoto(description: string, openaiKey: string, category?: string): Promise<string> {
  const isShoe = category === 'shoes';
  const angle  = isShoe
    ? '3/4 angle view from front-side showing sole edge,'
    : 'centered garment laid flat or on invisible mannequin,';
  const prompt =
    'Professional e-commerce product photo, pure white background, ' +
    `soft diffused studio lighting, sharp crisp focus, ${angle} ` +
    `no shadows, no wrinkles, commercial catalog quality, Zalando/ASOS style. The item is: ${description}`;

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
 * Generates a product photo using a 2-step workflow:
 * 1. Claude Haiku analyses the original photo → comma-separated terms
 * 2. Flux 1.1 Pro generates an e-commerce shot from those terms
 * Falls back to gpt-image-1 on timeout (>30s) or Flux failure.
 */
export async function generateDalle3Photo(
  imageUri: string,
  description: string,
  openaiKey: string,
  anthropicKey: string,
  replicateKey = '',
  category?: string,
): Promise<string> {
  if (replicateKey) {
    try {
      console.log('[productPhoto] Trying Flux 1.1 Pro...');
      return await generateFluxProPhoto(imageUri, description, replicateKey, anthropicKey, openaiKey, category);
    } catch (e) {
      console.warn('[productPhoto] Flux 1.1 Pro failed/timed out, falling back to gpt-image-1:', e);
    }
  }
  return generateGptImagePhoto(description, openaiKey, category);
}
