import { getImage, IMAGE_URL_SCHEME } from './imageStore';

/**
 * Converts a Blob to a base64 Data URL (data:image/webp;base64,...).
 * Supports both browser environments (FileReader) and Node/testing environments (arrayBuffer/Buffer).
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('FileReader result is not a string'));
        }
      };
      reader.onerror = () => reject(reader.error || new Error('Failed to read blob'));
      reader.readAsDataURL(blob);
    });
  }

  // Node / test environment fallback
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mime = blob.type || 'image/webp';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

/**
 * Regex matching zerobox-img://<id> references in Markdown or HTML.
 */
export const ZEROBOX_IMG_REGEX = /zerobox-img:\/\/([a-zA-Z0-9_-]+)/g;

/** DoS guard: at most this many distinct images are inlined into one export. */
export const MAX_INLINE_IMAGES = 20;
/** DoS guard: stop inlining once the estimated total of inlined bytes exceeds this. */
export const MAX_INLINE_TOTAL_BYTES = 8 * 1024 * 1024;

/**
 * Replaces `zerobox-img://<id>` references in markdown with inlined
 * base64 Data URLs retrieved from the IndexedDB image store.
 * If an image is not found in the store, the original reference is retained.
 *
 * DoS guards (graceful degradation, never throws on oversize):
 * - only the first MAX_INLINE_IMAGES unique IDs are considered;
 * - inlining stops once the estimated total exceeds MAX_INLINE_TOTAL_BYTES,
 *   leaving the remaining references intact.
 */
export async function inlineIndexedDbImages(
  markdown: string,
  profileId: string
): Promise<string> {
  if (!markdown || !markdown.includes(IMAGE_URL_SCHEME)) {
    return markdown;
  }

  // Find all unique image IDs referenced in the markdown
  const matches = [...markdown.matchAll(ZEROBOX_IMG_REGEX)];
  const uniqueIds = Array.from(new Set(matches.map((m) => m[1])));

  if (uniqueIds.length === 0) {
    return markdown;
  }

  const cappedIds = uniqueIds.slice(0, MAX_INLINE_IMAGES);
  if (uniqueIds.length > cappedIds.length) {
    console.warn(
      `[imageExportInliner] Capping inlined images to ${MAX_INLINE_IMAGES} of ${uniqueIds.length} referenced.`
    );
  }

  // Resolve sequentially so the running byte total can stop further inlining.
  const replacements = new Map<string, string>();
  let totalBytes = 0;
  for (const id of cappedIds) {
    try {
      const blob = await getImage(profileId, id);
      if (!blob) continue;
      const dataUrl = await blobToDataUrl(blob);
      // base64 is ~4/3 of the raw bytes; dataUrl.length * 0.75 approximates them.
      const estimatedBytes = dataUrl.length * 0.75;
      if (totalBytes + estimatedBytes > MAX_INLINE_TOTAL_BYTES) {
        console.warn(
          `[imageExportInliner] Inline budget exceeded (${MAX_INLINE_TOTAL_BYTES} bytes); leaving remaining references intact.`
        );
        break;
      }
      totalBytes += estimatedBytes;
      replacements.set(id, dataUrl);
    } catch (err) {
      // Leave intact if reading fails
      console.warn(`[imageExportInliner] Failed to inline image ${id}:`, err);
    }
  }

  // Substitute each resolved image ID
  return markdown.replace(ZEROBOX_IMG_REGEX, (match, id) => {
    const dataUrl = replacements.get(id);
    return dataUrl || match;
  });
}
