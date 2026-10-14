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

/**
 * Replaces every `zerobox-img://<id>` reference in markdown with an inlined
 * base64 Data URL retrieved from the IndexedDB image store.
 * If an image is not found in the store, the original reference is retained.
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

  // Fetch blobs and build substitution map
  const replacements = new Map<string, string>();
  await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const blob = await getImage(profileId, id);
        if (blob) {
          const dataUrl = await blobToDataUrl(blob);
          replacements.set(id, dataUrl);
        }
      } catch (err) {
        // Leave intact if reading fails
        console.warn(`[imageExportInliner] Failed to inline image ${id}:`, err);
      }
    })
  );

  // Substitute each resolved image ID
  return markdown.replace(ZEROBOX_IMG_REGEX, (match, id) => {
    const dataUrl = replacements.get(id);
    return dataUrl || match;
  });
}
