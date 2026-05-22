import { readAsStringAsync, writeAsStringAsync, cacheDirectory } from 'expo-file-system/legacy';

const OPENAI_CHAT   = 'https://api.openai.com/v1/chat/completions';
const OPENAI_EDITS  = 'https://api.openai.com/v1/images/edits';
const ANTHROPIC_CHAT = 'https://api.anthropic.com/v1/messages';

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

// ─── Vision description (Claude Haiku → GPT-4o fallback) ─────────────────────

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
 * Photographic description of the clothing item for wardrobe metadata.
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

// ─── gpt-image-1 image edit (image-to-image) ─────────────────────────────────

const EDIT_PROMPT =
  'Transform this clothing item into a professional ghost mannequin product photo. ' +
  'The garment should appear naturally shaped as if worn by an invisible body. ' +
  'Pure white background (#FFFFFF), soft even studio lighting, sharp focus, centered composition, ' +
  'full garment visible from front. ' +
  'Exact same product: keep identical colors, fabric texture, stitching, logos, patterns and all details from the original photo. ' +
  'No model, no mannequin visible, no hanger, no flat lay. ' +
  'Ghost mannequin / invisible mannequin effect only. ' +
  'Commercial e-commerce quality identical to Zalando, ASOS, H&M.';

const SHOE_EDIT_PROMPT =
  'Transform this shoe into a professional e-commerce product photo. ' +
  'Pure white background (#FFFFFF), soft even studio lighting, sharp focus, ' +
  '3/4 side angle showing silhouette and sole edge. ' +
  'Exact same product: keep identical colors, material, stitching, logos and all details from the original photo. ' +
  'No model, no foot, no flat lay. ' +
  'Commercial e-commerce quality identical to Zalando, ASOS, H&M.';

/**
 * Generates an e-commerce product photo by editing the original image via
 * the gpt-image-1 image edit endpoint (true image-to-image).
 */
export async function generateDalle3Photo(
  imageUri: string,
  openaiKey: string,
  category?: string,
): Promise<string> {
  const prompt = category === 'shoes' ? SHOE_EDIT_PROMPT : EDIT_PROMPT;

  const formData = new FormData();
  formData.append('model', 'gpt-image-1');
  formData.append('image', { uri: imageUri, type: 'image/jpeg', name: 'photo.jpg' } as unknown as Blob);
  formData.append('prompt', prompt);
  formData.append('size', '1024x1024');
  formData.append('quality', 'high');

  console.log('[gptImageEdit] prompt:', prompt);
  console.log('[gptImageEdit] imageUri:', imageUri);

  const res = await fetch(OPENAI_EDITS, {
    method:  'POST',
    headers: { Authorization: `Bearer ${openaiKey}` },
    body:    formData,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '<unreadable>');
    console.error('[gptImageEdit] error response:', res.status, errText);
    throw new Error(`gpt-image-1 edit ${res.status}: ${errText.slice(0, 300)}`);
  }

  const json = (await res.json()) as { data: { b64_json?: string }[] };
  console.log('[gptImageEdit] response keys:', Object.keys(json));

  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error('No b64_json in gpt-image-1 edit response');

  return saveToCache(b64, 'gpt-edit');
}
