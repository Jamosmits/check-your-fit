import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';

/**
 * Removes background from an image using the remove.bg API.
 * Falls back to the original URI if no API key is provided.
 * Returns a local file URI to the processed image.
 */
export async function removeBackground(
  imageUri: string,
  apiKey: string,
): Promise<string> {
  if (!apiKey) return imageUri;

  try {
    const formData = new FormData();
    formData.append('image_file', {
      uri: imageUri,
      name: 'image.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
    formData.append('size', 'auto');
    formData.append('format', 'png');

    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: formData,
    });

    if (!res.ok) return imageUri;

    // Save the returned PNG to a local cache file
    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    const base64 = btoa(binary);

    const dest = `${cacheDirectory}rbg-${Date.now()}.png`;
    await writeAsStringAsync(dest, base64, { encoding: 'base64' });
    return dest;
  } catch {
    return imageUri;
  }
}
