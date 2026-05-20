import * as ImageManipulator from 'expo-image-manipulator';
import { writeAsStringAsync, cacheDirectory } from 'expo-file-system/legacy';

const DALLE_SIZE = 1024;

const PROMPT =
  'Professional e-commerce product photo of this clothing item displayed on a ghost mannequin, ' +
  'pure white background, studio lighting, no visible person or hanger';

/**
 * Sends a clothing photo to DALL-E 2 image edits to generate a ghost mannequin
 * product photo. Returns a local cache URI of the result, or the original URI
 * if the key is missing or the request fails.
 */
export async function generateProductPhoto(
  imageUri: string,
  openaiKey: string,
): Promise<string> {
  if (!openaiKey) return imageUri;

  try {
    // DALL-E 2 edits requires a square PNG ≤ 4 MB
    const { uri: pngUri } = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: DALLE_SIZE, height: DALLE_SIZE } }],
      { format: ImageManipulator.SaveFormat.PNG, compress: 1 },
    );

    const formData = new FormData();
    formData.append('image', {
      uri: pngUri,
      type: 'image/png',
      name: 'garment.png',
    } as unknown as Blob);
    formData.append('prompt', PROMPT);
    formData.append('model', 'dall-e-2');
    formData.append('n', '1');
    formData.append('size', '1024x1024');
    formData.append('response_format', 'b64_json');

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: formData,
    });

    if (!res.ok) {
      console.warn('DALL-E edit error:', res.status, await res.text().catch(() => ''));
      return imageUri;
    }

    const json = (await res.json()) as { data: { b64_json: string }[] };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) return imageUri;

    const dest = `${cacheDirectory}dalle-${Date.now()}.png`;
    await writeAsStringAsync(dest, b64, { encoding: 'base64' });
    return dest;
  } catch (e) {
    console.warn('generateProductPhoto error:', e);
    return imageUri;
  }
}
