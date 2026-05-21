import { readAsStringAsync } from 'expo-file-system/legacy';
import { Alert } from 'react-native';

const OPENAI_EDITS = 'https://api.openai.com/v1/images/edits';

async function uriToBlob(uri: string): Promise<{ base64: string; mimeType: string }> {
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    const res = await fetch(uri);
    if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return { base64: btoa(bin), mimeType: 'image/jpeg' };
  }
  const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
  return { base64, mimeType: 'image/jpeg' };
}

export async function generateTryOn(
  bodyPhotoUri: string,
  outfitDescription: string,
  openaiKey: string,
): Promise<string> {
  console.log('[tryOn] generateTryOn: preparing body photo...');

  const { base64, mimeType } = await uriToBlob(bodyPhotoUri);
  console.log('[tryOn] Body photo encoded, length:', base64.length);

  const prompt =
    `Show this person wearing the following outfit: ${outfitDescription}. ` +
    `Keep the person's face, hair and body exactly the same. ` +
    `Only change the clothing. Professional photo, natural lighting.`;

  console.log('[tryOn] Prompt:', prompt.slice(0, 200));

  const formData = new FormData();
  formData.append('model', 'gpt-image-1');
  formData.append('image', {
    uri: bodyPhotoUri.startsWith('data:') ? bodyPhotoUri : `data:${mimeType};base64,${base64}`,
    type: mimeType,
    name: 'body.jpg',
  } as unknown as Blob);
  formData.append('prompt', prompt);
  formData.append('n', '1');
  formData.append('size', '1024x1024');

  const res = await fetch(OPENAI_EDITS, {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: formData,
  });

  console.log('[tryOn] gpt-image-1 edits status:', res.status);

  if (!res.ok) {
    const errText = await res.text().catch(() => '<unreadable>');
    console.error('[tryOn] gpt-image-1 edits error:', errText);
    Alert.alert('Try-On Error', `Status: ${res.status}\n\n${errText.slice(0, 300)}`);
    throw new Error(`gpt-image-1 edits ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as { data: { b64_json?: string; url?: string }[] };
  console.log('[tryOn] response keys:', Object.keys(json));

  const b64 = json.data?.[0]?.b64_json;
  if (!b64) {
    const dump = JSON.stringify(json).slice(0, 300);
    Alert.alert('Try-On Parse Error', `b64_json missing.\n\nResponse: ${dump}`);
    throw new Error(`No b64_json in gpt-image-1 edits response: ${dump}`);
  }

  console.log('[tryOn] b64 length:', b64.length);
  return `data:image/png;base64,${b64}`;
}
