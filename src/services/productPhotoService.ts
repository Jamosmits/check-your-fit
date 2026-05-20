import { readAsStringAsync, writeAsStringAsync, cacheDirectory } from 'expo-file-system/legacy';

const OPENAI_CHAT   = 'https://api.openai.com/v1/chat/completions';
const OPENAI_IMAGES = 'https://api.openai.com/v1/images/generations';

async function toBase64(uri: string): Promise<string> {
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    console.log('[productPhoto] Downloading remote image:', uri.slice(0, 80));
    const res = await fetch(uri);
    if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  console.log('[productPhoto] Reading local image:', uri.slice(0, 80));
  return readAsStringAsync(uri, { encoding: 'base64' });
}

/** Sends the photo to GPT-4o Vision and returns a detailed clothing description. */
async function describeItem(imageUri: string, openaiKey: string): Promise<string> {
  console.log('[productPhoto] Step 1: calling GPT-4o Vision...');
  const base64 = await toBase64(imageUri);
  console.log('[productPhoto] Image encoded, base64 length:', base64.length);

  const res = await fetch(OPENAI_CHAT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'low' },
          },
          {
            type: 'text',
            text: 'Describe this clothing item in precise detail for a product photo prompt. Include: garment type, color(s), material or texture, style details, visible patterns or branding. Be specific and concise (2-3 sentences max).',
          },
        ],
      }],
    }),
  });

  console.log('[productPhoto] GPT-4o Vision response status:', res.status);
  const rawText = await res.text();
  console.log('[productPhoto] GPT-4o Vision raw response:', rawText.slice(0, 400));

  if (!res.ok) throw new Error(`GPT-4o Vision error ${res.status}: ${rawText.slice(0, 200)}`);

  const json = JSON.parse(rawText) as { choices: { message: { content: string } }[] };
  const description = json.choices[0]?.message?.content?.trim() ?? 'a clothing item';
  console.log('[productPhoto] Item description:', description);
  return description;
}

/** Calls DALL-E 3 with the given description and returns a local cache URI. */
async function generateWithDalle3(description: string, openaiKey: string): Promise<string> {
  const prompt =
    `Professional e-commerce product photo of: ${description}. ` +
    'Ghost mannequin display, pure white background (#FFFFFF), professional studio lighting, ' +
    'sharp focus, high resolution, no shadows, centered.';

  console.log('[productPhoto] Step 2: calling DALL-E 3 with prompt:', prompt.slice(0, 120), '...');

  const res = await fetch(OPENAI_IMAGES, {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json',
      n: 1,
    }),
  });

  console.log('[productPhoto] DALL-E 3 response status:', res.status);

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[productPhoto] DALL-E 3 error body:', errText.slice(0, 400));
    throw new Error(`DALL-E 3 error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as { data: { b64_json: string }[] };
  const b64 = json.data?.[0]?.b64_json;
  console.log('[productPhoto] DALL-E 3 returned b64 length:', b64?.length ?? 0);
  if (!b64) throw new Error('No image data from DALL-E 3');

  const dest = `${cacheDirectory}product-${Date.now()}.png`;
  await writeAsStringAsync(dest, b64, { encoding: 'base64' });
  console.log('[productPhoto] Saved to cache:', dest);
  return dest;
}

/**
 * Full pipeline: GPT-4o Vision describes the item → DALL-E 3 generates a
 * professional ghost mannequin product photo. Throws on failure so the caller
 * can show a user-visible error.
 */
export async function generateProductPhoto(
  imageUri: string,
  openaiKey: string,
): Promise<string> {
  console.log('[productPhoto] generateProductPhoto called, key present:', !!openaiKey);
  if (!openaiKey) throw new Error('Geen OpenAI API-sleutel ingesteld. Ga naar Instellingen.');

  const description = await describeItem(imageUri, openaiKey);
  return generateWithDalle3(description, openaiKey);
}
