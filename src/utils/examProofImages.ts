/**
 * examProofImages.ts
 * Exam proof screenshots live in IndexedDB as Blobs; the persisted exam store keeps only
 * `ScreenshotProof.imageRef` + metadata so a handful of proofs can no longer exhaust the
 * ~5MB localStorage quota.
 *
 * Safety rules:
 * - Inline Base64 is only ever replaced by a ref AFTER the IndexedDB write has resolved.
 * - If IndexedDB is unavailable or a write fails, the inline Base64 is kept (never lose evidence).
 * - Exports (report markdown / HTML) resolve refs back to inline data URLs.
 */

import type { ExamBox, ExamTargetProof, ScreenshotProof } from './examComplianceUtils';
import {
  deleteProofImageBlobs,
  isProofImageStorageAvailable,
  loadProofImageBlob,
  saveProofImageBlob,
} from './indexedDbDeepStorage';

export type ProofFlagType = 'user' | 'root';

/** Deterministic ref, so a retried write after a crash overwrites instead of orphaning a blob. */
export function proofImageRefFor(boxId: string, flagType: ProofFlagType, screenshotId: string): string {
  return `proofimg_${boxId}_${flagType}_${screenshotId}`;
}

/** Decodes a `data:image/...` URL into a Blob. Returns null for anything that is not a decodable image data URL. */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = /^data:(image\/[a-z0-9.+-]+)((?:;[^;,]*)*),(.*)$/is.exec(dataUrl || '');
  if (!match) return null;
  const [, mime, params, payload] = match;
  try {
    if (/;base64/i.test(params)) {
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    }
    return new Blob([decodeURIComponent(payload)], { type: mime });
  } catch {
    return null;
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read proof image'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

/** Writes the image to IndexedDB. Returns the ref only if the write completed, otherwise null. */
export async function persistProofImage(ref: string, dataUrl: string): Promise<string | null> {
  if (!isProofImageStorageAvailable()) return null;
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return null;
  return (await saveProofImageBlob(ref, blob)) ? ref : null;
}

/** Resolves a ref to an inline data URL (for exports). Null when the blob is missing. */
export async function resolveProofImage(imageRef: string): Promise<string | null> {
  try {
    const blob = await loadProofImageBlob(imageRef);
    return blob ? await blobToDataUrl(blob) : null;
  } catch {
    return null;
  }
}

export function deleteProofImages(refs: string[]): Promise<void> {
  return deleteProofImageBlobs(refs).catch(() => {});
}

/**
 * Builds the screenshot record for a newly captured image: image bytes go to IndexedDB and the
 * record carries only `imageRef`. Falls back to inline Base64 if IndexedDB cannot take the write.
 */
export async function createScreenshotProof(
  boxId: string,
  flagType: ProofFlagType,
  proof: ScreenshotProof & { dataUrl: string }
): Promise<ScreenshotProof> {
  const imageRef = await persistProofImage(proofImageRefFor(boxId, flagType, proof.id), proof.dataUrl);
  if (!imageRef) return proof;
  const { dataUrl: _inline, ...meta } = proof;
  return { ...meta, imageRef };
}

function proofsOf(box: ExamBox): ExamTargetProof[] {
  return [box.userProof, box.rootProof].filter(Boolean);
}

/** All imageRefs referenced by the given boxes. */
export function collectProofImageRefs(boxes: ExamBox[]): string[] {
  const refs: string[] = [];
  boxes.forEach((b) =>
    proofsOf(b).forEach((p) =>
      (p.screenshots || []).forEach((sc) => {
        if (sc.imageRef) refs.push(sc.imageRef);
      })
    )
  );
  return refs;
}

/** Deletes blobs whose refs were referenced by `before` but are no longer present in `after`. */
export function purgeRemovedProofImages(before: ExamBox[], after: ExamBox[]): void {
  const keep = new Set(collectProofImageRefs(after));
  const stale = collectProofImageRefs(before).filter((ref) => !keep.has(ref));
  if (stale.length > 0) void deleteProofImages(stale);
}

const needsResolution = (sc: ScreenshotProof): boolean => Boolean(sc.imageRef && !sc.dataUrl);

/** True when at least one screenshot only exists as an IndexedDB ref (no inline data URL). */
export function boxesHaveUnresolvedProofImages(boxes: ExamBox[]): boolean {
  return boxes.some((b) => proofsOf(b).some((p) => (p.screenshots || []).some(needsResolution)));
}

/**
 * Returns boxes whose ref-only screenshots have an inline `dataUrl` again, for report export.
 * Refs that cannot be resolved are left as-is (the report generators then omit that image).
 */
export async function hydrateBoxesWithProofImages(boxes: ExamBox[]): Promise<ExamBox[]> {
  if (!boxesHaveUnresolvedProofImages(boxes)) return boxes;

  const hydrateProof = async (proof: ExamTargetProof): Promise<ExamTargetProof> => {
    if (!proof?.screenshots?.some(needsResolution)) return proof;
    const screenshots = await Promise.all(
      proof.screenshots.map(async (sc) => {
        if (!needsResolution(sc)) return sc;
        const dataUrl = await resolveProofImage(sc.imageRef as string);
        return dataUrl ? { ...sc, dataUrl } : sc;
      })
    );
    return { ...proof, screenshots };
  };

  return Promise.all(
    boxes.map(async (b) => ({
      ...b,
      userProof: await hydrateProof(b.userProof),
      rootProof: await hydrateProof(b.rootProof),
    }))
  );
}

/**
 * Moves legacy inline Base64 screenshots into IndexedDB. `getBoxes`/`applyBoxes` let the caller
 * (the exam store) own state access. Each inline image is replaced by its ref only after its own
 * IndexedDB write resolved; failures keep the Base64. Idempotent; returns the migrated count.
 */
export async function migrateLegacyProofImages(
  getBoxes: () => ExamBox[],
  applyBoxes: (update: (boxes: ExamBox[]) => ExamBox[]) => void
): Promise<number> {
  if (!isProofImageStorageAvailable()) return 0;

  const legacy: Array<{ key: string; ref: string; dataUrl: string }> = [];
  getBoxes().forEach((b) =>
    (['user', 'root'] as ProofFlagType[]).forEach((flagType) => {
      const proof = flagType === 'user' ? b.userProof : b.rootProof;
      (proof?.screenshots || []).forEach((sc) => {
        if (sc.dataUrl && !sc.imageRef) {
          legacy.push({
            key: `${b.id}|${flagType}|${sc.id}`,
            ref: proofImageRefFor(b.id, flagType, sc.id),
            dataUrl: sc.dataUrl,
          });
        }
      });
    })
  );
  if (legacy.length === 0) return 0;

  const written = new Map<string, { ref: string; dataUrl: string }>();
  for (const item of legacy) {
    // Sequential on purpose: one IndexedDB connection at a time, deterministic order.
    const ref = await persistProofImage(item.ref, item.dataUrl);
    if (ref) written.set(item.key, { ref, dataUrl: item.dataUrl });
  }
  if (written.size === 0) return 0;

  const applied = new Set<string>();
  applyBoxes((boxes) =>
    boxes.map((b) => {
      const swap = (proof: ExamTargetProof, flagType: ProofFlagType): ExamTargetProof => {
        if (!proof?.screenshots) return proof;
        return {
          ...proof,
          screenshots: proof.screenshots.map((sc) => {
            const key = `${b.id}|${flagType}|${sc.id}`;
            const hit = written.get(key);
            // Only swap if the inline image is still the one that was written.
            if (!hit || sc.imageRef || sc.dataUrl !== hit.dataUrl) return sc;
            applied.add(key);
            const { dataUrl: _inline, ...meta } = sc;
            return { ...meta, imageRef: hit.ref };
          }),
        };
      };
      return { ...b, userProof: swap(b.userProof, 'user'), rootProof: swap(b.rootProof, 'root') };
    })
  );

  // Blobs written for screenshots that were deleted while the migration was running are orphans.
  const orphanRefs: string[] = [];
  const stillPresent = new Set<string>();
  getBoxes().forEach((b) =>
    (['user', 'root'] as ProofFlagType[]).forEach((flagType) =>
      ((flagType === 'user' ? b.userProof : b.rootProof)?.screenshots || []).forEach((sc) =>
        stillPresent.add(`${b.id}|${flagType}|${sc.id}`)
      )
    )
  );
  written.forEach((hit, key) => {
    if (!applied.has(key) && !stillPresent.has(key)) orphanRefs.push(hit.ref);
  });
  if (orphanRefs.length > 0) void deleteProofImages(orphanRefs);

  return applied.size;
}
