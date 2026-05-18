import fs from 'fs';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';
import FormData from 'form-data';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_KEY'];
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be configured');
  return createClient(url, key);
}

function getBucket(): string {
  return process.env['SUPABASE_STORAGE_BUCKET'] ?? 'checkyourfit-media';
}

interface ProcessedImage {
  imageUrl: string;
  thumbnailUrl: string;
  bgRemovedUrl: string | null;
}

// ── removeBackground ──────────────────────────────────────────────────────────

export async function removeBackground(imagePath: string): Promise<Buffer> {
  const apiKey = process.env['REMOVE_BG_API_KEY'];
  if (!apiKey) throw new Error('REMOVE_BG_API_KEY is not configured');

  const formData = new FormData();
  formData.append('image_file', fs.createReadStream(imagePath));
  formData.append('size', 'auto');

  const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
    headers: {
      'X-Api-Key': apiKey,
      ...formData.getHeaders(),
    },
    responseType: 'arraybuffer',
    timeout: 30000,
  });

  return Buffer.from(response.data as ArrayBuffer);
}

// ── uploadFileToStorage ───────────────────────────────────────────────────────

export async function uploadFileToStorage(
  filePath: string,
  userId: string,
  folder: string
): Promise<string> {
  const supabase = getSupabaseClient();
  const bucket = getBucket();

  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase() || '.jpg';
  const fileName = `${folder}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
  };

  const contentType = mimeTypes[ext] ?? 'application/octet-stream';

  const { error } = await supabase.storage.from(bucket).upload(fileName, fileBuffer, {
    contentType,
    upsert: false,
  });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}

export async function uploadBufferToStorage(
  buffer: Buffer,
  userId: string,
  folder: string,
  ext: string,
  contentType: string
): Promise<string> {
  const supabase = getSupabaseClient();
  const bucket = getBucket();

  const fileName = `${folder}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(fileName, buffer, {
    contentType,
    upsert: false,
  });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}

// ── processAndUploadImage ─────────────────────────────────────────────────────

export async function processAndUploadImage(
  localPath: string,
  userId: string
): Promise<ProcessedImage> {
  // Resize / optimise main image to max 1200px
  const mainBuffer = await sharp(localPath)
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  // Create thumbnail 200x200
  const thumbBuffer = await sharp(localPath)
    .resize({ width: 200, height: 200, fit: 'cover' })
    .webp({ quality: 75 })
    .toBuffer();

  const [imageUrl, thumbnailUrl] = await Promise.all([
    uploadBufferToStorage(mainBuffer, userId, 'clothing', 'webp', 'image/webp'),
    uploadBufferToStorage(thumbBuffer, userId, 'thumbnails', 'webp', 'image/webp'),
  ]);

  // Attempt background removal (non-fatal)
  let bgRemovedUrl: string | null = null;
  try {
    const bgRemovedBuffer = await removeBackground(localPath);
    bgRemovedUrl = await uploadBufferToStorage(
      bgRemovedBuffer,
      userId,
      'clothing-nobg',
      'png',
      'image/png'
    );
  } catch (err) {
    console.warn('[imageService] Background removal skipped:', (err as Error).message);
  }

  // Cleanup temp file
  try {
    fs.unlinkSync(localPath);
  } catch {
    // ignore cleanup errors
  }

  return { imageUrl, thumbnailUrl, bgRemovedUrl };
}
