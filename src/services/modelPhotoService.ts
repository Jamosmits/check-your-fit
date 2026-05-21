import {
  readAsStringAsync,
  writeAsStringAsync,
  cacheDirectory,
} from 'expo-file-system/legacy';

const OPENAI_EDITS = 'https://api.openai.com/v1/images/edits';

async function localUri(uri: string): Promise<string> {
  if (uri.startsWith('file://') || uri.startsWith('/')) return uri;

  if (uri.startsWith('data:')) {
    const b64 = uri.split(',')[1] ?? '';
    const path = `${cacheDirectory}tmp-model-${Date.now()}.jpg`;
    await writeAsStringAsync(path, b64, { encoding: 'base64' });
    return path;
  }

  // http/https — download to disk
  const res = await fetch(uri);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  const b64 = btoa(bin);
  const path = `${cacheDirectory}tmp-model-${Date.now()}.jpg`;
  await writeAsStringAsync(path, b64, { encoding: 'base64' });
  return path;
}

async function editPhoto(imageUri: string, prompt: string, openaiKey: string): Promise<string> {
  const fileUri = await localUri(imageUri);

  const formData = new FormData();
  formData.append('model', 'gpt-image-1');
  formData.append('image', { uri: fileUri, type: 'image/jpeg', name: 'photo.jpg' } as unknown as Blob);
  formData.append('prompt', prompt);
  formData.append('n', '1');
  formData.append('size', '1024x1024');

  const res = await fetch(OPENAI_EDITS, {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '<unreadable>');
    throw new Error(`modelPhoto ${res.status}: ${err.slice(0, 300)}`);
  }

  const json = (await res.json()) as { data: { b64_json?: string }[] };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error('No b64_json in model photo response');
  return b64;
}

async function saveToCache(b64: string, prefix: string): Promise<string> {
  const path = `${cacheDirectory}${prefix}-${Date.now()}.png`;
  await writeAsStringAsync(path, b64, { encoding: 'base64' });
  return path;
}

/**
 * Transforms the user's body photo into a professional fashion model photo.
 * Returns a local file URI.
 */
export async function processBodyPhoto(bodyPhotoUri: string, openaiKey: string): Promise<string> {
  console.log('[modelPhoto] processBodyPhoto start');
  const b64 = await editPhoto(
    bodyPhotoUri,
    'Transform this person photo into a professional fashion model photo. ' +
    'Full body visible, pure white background, professional studio lighting, ' +
    'neutral pose, front facing, exactly like a fashion e-commerce model photo. ' +
    'Keep the person\'s exact face and hair.',
    openaiKey,
  );
  const path = await saveToCache(b64, 'model-front');
  console.log('[modelPhoto] processBodyPhoto done:', path);
  return path;
}

/**
 * Generates side and back poses from the processed front-facing model photo.
 * Returns local file URIs for side and back views.
 */
export async function generateModelPoses(
  frontPhotoUri: string,
  openaiKey: string,
): Promise<{ side: string; back: string }> {
  console.log('[modelPhoto] generateModelPoses start');

  const [sideB64, backB64] = await Promise.all([
    editPhoto(
      frontPhotoUri,
      'Same person, side profile view, full body, pure white background, ' +
      'professional studio lighting, fashion model pose. Keep exact same person and hair.',
      openaiKey,
    ),
    editPhoto(
      frontPhotoUri,
      'Same person, back view, full body, pure white background, ' +
      'professional studio lighting, fashion model pose. Keep exact same person and hair.',
      openaiKey,
    ),
  ]);

  const sidePath = await saveToCache(sideB64, 'model-side');
  const backPath = await saveToCache(backB64, 'model-back');
  console.log('[modelPhoto] generateModelPoses done');
  return { side: sidePath, back: backPath };
}
