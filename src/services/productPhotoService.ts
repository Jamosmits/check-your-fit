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

/**
 * Tries DALL-E 3 first, then falls back to DALL-E 2 on content policy errors.
 * Returns a local cache URI of the generated product photo.
 */
export async function generateDalle3Photo(description: string, openaiKey: string): Promise<string> {
  const prompt =
    `Professional fashion product photography. ${description}. ` +
    `Floating display, pure white background, soft studio lighting, sharp focus, ` +
    `centered composition, e-commerce style.`;

  console.log('[productPhoto] generateDalle3Photo prompt:', prompt);

  // ── Try DALL-E 3 ────────────────────────────────────────────────────────────
  const res3 = await fetch(OPENAI_IMAGES, {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      size: '1024x1024',
      quality: 'hd',
      response_format: 'b64_json',
      n: 1,
    }),
  });

  console.log('[productPhoto] DALL-E 3 status:', res3.status);

  if (res3.ok) {
    const json3 = (await res3.json()) as { data: { b64_json: string }[] };
    const b64_3 = json3.data?.[0]?.b64_json;
    if (b64_3) {
      const dest3 = `${cacheDirectory}product-${Date.now()}.png`;
      await writeAsStringAsync(dest3, b64_3, { encoding: 'base64' });
      console.log('[productPhoto] DALL-E 3 saved:', dest3);
      return dest3;
    }
  }

  // ── DALL-E 3 failed — show error and try DALL-E 2 ──────────────────────────
  const errText3 = await res3.text().catch(() => '<unreadable>');
  console.error('[productPhoto] DALL-E 3 error:', errText3);
  Alert.alert('DALL-E 3 Error (proberen met DALL-E 2)', `Status: ${res3.status}\n\n${errText3}`);

  const res2 = await fetch(OPENAI_IMAGES, {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'dall-e-2',
      prompt,
      size: '1024x1024',
      response_format: 'b64_json',
      n: 1,
    }),
  });

  console.log('[productPhoto] DALL-E 2 status:', res2.status);

  if (!res2.ok) {
    const errText2 = await res2.text().catch(() => '<unreadable>');
    console.error('[productPhoto] DALL-E 2 error:', errText2);
    Alert.alert('DALL-E 2 Error', `Status: ${res2.status}\n\n${errText2}`);
    throw new Error(`DALL-E 2 ${res2.status}: ${errText2.slice(0, 300)}`);
  }

  const json2 = (await res2.json()) as { data: { b64_json: string }[] };
  const b64_2 = json2.data?.[0]?.b64_json;
  if (!b64_2) throw new Error('No image data from DALL-E 2');

  const dest2 = `${cacheDirectory}product-${Date.now()}.png`;
  await writeAsStringAsync(dest2, b64_2, { encoding: 'base64' });
  console.log('[productPhoto] DALL-E 2 saved:', dest2);
  return dest2;
}
