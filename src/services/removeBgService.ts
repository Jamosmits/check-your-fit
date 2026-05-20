import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';

/**
 * Removes background from an image using the remove.bg API.
 * Requests a white (#ffffff) background so the result works everywhere.
 * Falls back to the original URI if no API key is provided or on any error.
 * Returns a local file URI to the processed JPEG.
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
    // White background — result is a JPEG ready to display without compositing
    formData.append('bg_color', 'ffffff');
    formData.append('format', 'jpg');
    // Crop to the garment bounds so whitespace is already trimmed server-side
    formData.append('crop', 'true');
    formData.append('crop_margin', '5%');

    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: formData,
    });

    if (!res.ok) {
      console.warn('remove.bg error', res.status, await res.text().catch(() => ''));
      return imageUri;
    }

    // Save the returned JPEG to a local cache file
    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    const base64 = btoa(binary);

    const dest = `${cacheDirectory}rbg-${Date.now()}.jpg`;
    await writeAsStringAsync(dest, base64, { encoding: 'base64' });
    return dest;
  } catch (e) {
    console.warn('remove.bg exception', e);
    return imageUri;
  }
}
