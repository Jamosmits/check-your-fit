import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Smart-crops a garment image after background removal.
 *
 * Two operations:
 *   1. Top trim (5 % of image height) — removes residual hanger hooks that
 *      remove.bg may leave behind; hangers sit in this narrow top band.
 *   2. Resize to max 800 px wide — keeps file size sane for Replicate upload.
 *
 * Falls back to the original URI on any error.
 */
export async function smartCropGarment(imageUri: string): Promise<string> {
  try {
    // Step 1: probe dimensions with a no-op pass
    const info = await ImageManipulator.manipulateAsync(imageUri, []);
    const { width, height } = info;

    // Trim at least 4 px but no more than 5 % of height
    const topTrim = Math.max(4, Math.round(height * 0.05));

    // Keep within a sane output width (≤ 800 px, ≥ 300 px)
    const outWidth = Math.min(Math.max(width, 300), 800);

    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          crop: {
            originX: 0,
            originY: topTrim,
            width,
            height: height - topTrim,
          },
        },
        { resize: { width: outWidth } },
      ],
      { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG },
    );

    return result.uri;
  } catch (e) {
    console.warn('smartCropGarment error:', e);
    return imageUri;
  }
}
