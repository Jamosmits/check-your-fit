import { readAsStringAsync, writeAsStringAsync, cacheDirectory } from 'expo-file-system/legacy';
import { Alert } from 'react-native';

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

/**
 * Sends the photo to GPT-4o Vision and returns a detailed clothing description
 * suitable for use as a DALL-E 3 prompt (type, colour, material, brand, style).
 */
export async function describeClothingItem(imageUri: string, openaiKey: string): Promise<string> {
  console.log('[productPhoto] describeClothingItem: calling GPT-4o Vision...');
  const base64 = await toBase64(imageUri);
  console.log('[productPhoto] Image encoded, length:', base64.length);

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
            text: 'Describe this clothing item in precise detail for a fashion product photo. Include: exact garment type, colour(s), material/texture, visible brand or logo, style details, fit, and any distinctive design elements. Be specific and concise (2-3 sentences).',
          },
        ],
      }],
    }),
  });

  console.log('[productPhoto] GPT-4o Vision status:', res.status);
  const rawText = await res.text();
  console.log('[productPhoto] GPT-4o Vision response:', rawText.slice(0, 400));

  if (!res.ok) throw new Error(`GPT-4o Vision error ${res.status}: ${rawText.slice(0, 200)}`);

  const json = JSON.parse(rawText) as { choices: { message: { content: string } }[] };
  const description = json.choices[0]?.message?.content?.trim() ?? 'a clothing item';
  console.log('[productPhoto] Description:', description);
  return description;
}

export async function generateDalle3Photo(description: string, openaiKey: string): Promise<string> {
  const prompt =
    `Professional fashion e-commerce product photo. ${description}. ` +
    `White background, studio lighting, centered.`;

  console.log('[productPhoto] generateDalle3Photo prompt:', prompt);

  const res = await fetch(OPENAI_IMAGES, {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1024x1024',
    }),
  });

  console.log('[productPhoto] gpt-image-1 status:', res.status);

  if (!res.ok) {
    const errText = await res.text().catch(() => '<unreadable>');
    console.error('[productPhoto] gpt-image-1 error:', errText);
    Alert.alert('Image Generation Error', `Status: ${res.status}\n\n${errText}`);
    throw new Error(`gpt-image-1 ${res.status}: ${errText.slice(0, 300)}`);
  }

  const json = (await res.json()) as { data: { b64_json?: string; url?: string }[] };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error(`No image data from gpt-image-1. Response: ${JSON.stringify(json).slice(0, 200)}`);

  const dest = `${cacheDirectory}product-${Date.now()}.png`;
  await writeAsStringAsync(dest, b64, { encoding: 'base64' });
  console.log('[productPhoto] Saved to cache:', dest);
  return dest;
}
