import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';

// Try to use @imgly/background-removal (works on Expo Web; falls back on native)
let imglyRemoveBackground: ((input: string | Blob) => Promise<Blob>) | null = null;
try {
  // Dynamic require — bundling/runtime failures won't break the module
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@imgly/background-removal') as { removeBackground: (src: string | Blob) => Promise<Blob> };
  imglyRemoveBackground = mod.removeBackground;
  console.log('[removeBg] @imgly/background-removal loaded');
} catch {
  console.log('[removeBg] @imgly/background-removal not available — will use remove.bg API');
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Removes background from an image.
 * • Primary:   @imgly/background-removal (free, local, Expo Web builds)
 * • Fallback:  remove.bg API (requires apiKey, 50 free/month)
 * • Last resort: original URI unchanged
 */
export async function removeBackground(imageUri: string, apiKey: string): Promise<string> {
  // ── Local library (web / Expo Web) ────────────────────────────────────────
  if (imglyRemoveBackground) {
    try {
      const resultBlob = await imglyRemoveBackground(imageUri);
      const b64        = await blobToBase64(resultBlob);
      const dest       = `${cacheDirectory}rbg-local-${Date.now()}.png`;
      await writeAsStringAsync(dest, b64, { encoding: 'base64' });
      return dest;
    } catch (e) {
      console.warn('[removeBg] @imgly failed, falling back to remove.bg API:', e);
    }
  }

  // ── remove.bg API ─────────────────────────────────────────────────────────
  if (!apiKey) return imageUri;

  try {
    const formData = new FormData();
    formData.append('image_file', { uri: imageUri, name: 'image.jpg', type: 'image/jpeg' } as unknown as Blob);
    formData.append('size',        'auto');
    formData.append('bg_color',    'ffffff');
    formData.append('format',      'jpg');
    formData.append('crop',        'true');
    formData.append('crop_margin', '5%');

    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method:  'POST',
      headers: { 'X-Api-Key': apiKey },
      body:    formData,
    });

    if (!res.ok) { console.warn('[removeBg] remove.bg error', res.status); return imageUri; }

    const arrayBuffer = await res.arrayBuffer();
    const bytes       = new Uint8Array(arrayBuffer);
    let binary = ''; bytes.forEach((b) => { binary += String.fromCharCode(b); });
    const base64 = btoa(binary);

    const dest = `${cacheDirectory}rbg-${Date.now()}.jpg`;
    await writeAsStringAsync(dest, base64, { encoding: 'base64' });
    return dest;
  } catch (e) {
    console.warn('[removeBg] remove.bg exception', e);
    return imageUri;
  }
}
