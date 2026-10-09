import { useEffect, useMemo, useState } from 'react';
import type { ExamBox } from '../utils/examComplianceUtils';
import { loadProofImageBlob } from '../utils/indexedDbDeepStorage';
import {
  blobToDataUrl,
  boxesHaveUnresolvedProofImages,
  hydrateBoxesWithProofImages,
} from '../utils/examProofImages';

export interface ProofImageSource {
  /** Displayable URL (object URL, or data URL when object URLs are unavailable); null if unavailable. */
  src: string | null;
  loading: boolean;
}

/**
 * Resolves an exam proof image for display. Legacy inline data URLs are returned as-is; refs are
 * loaded from IndexedDB into an object URL that is revoked on unmount / ref change.
 */
export function useProofImage(imageRef?: string, legacyDataUrl?: string): ProofImageSource {
  const [loaded, setLoaded] = useState<{ ref: string; src: string | null } | null>(null);
  const needsLoad = Boolean(imageRef) && !legacyDataUrl;

  useEffect(() => {
    if (!needsLoad || !imageRef) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      let src: string | null = null;
      try {
        const blob = await loadProofImageBlob(imageRef);
        if (blob && !cancelled) {
          if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
            try {
              objectUrl = URL.createObjectURL(blob);
              src = objectUrl;
            } catch {
              objectUrl = null;
            }
          }
          if (!src) src = await blobToDataUrl(blob);
        }
      } catch {
        src = null;
      }
      if (!cancelled) setLoaded({ ref: imageRef, src });
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [needsLoad, imageRef]);

  if (!needsLoad) return { src: legacyDataUrl || null, loading: false };
  if (loaded && loaded.ref === imageRef) return { src: loaded.src, loading: false };
  return { src: null, loading: true };
}

/**
 * Returns `boxes` with ref-only screenshots re-inlined as data URLs, for report generation.
 * `resolving` stays true until the async hydration for the current `boxes` has finished.
 */
export function useBoxesWithProofImages(
  boxes: ExamBox[],
  enabled: boolean = true
): { boxes: ExamBox[]; resolving: boolean } {
  const needs = useMemo(() => enabled && boxesHaveUnresolvedProofImages(boxes), [boxes, enabled]);
  const [hydrated, setHydrated] = useState<{ source: ExamBox[]; boxes: ExamBox[] } | null>(null);

  useEffect(() => {
    if (!needs) return;
    let cancelled = false;
    hydrateBoxesWithProofImages(boxes).then((result) => {
      if (!cancelled) setHydrated({ source: boxes, boxes: result });
    });
    return () => {
      cancelled = true;
    };
  }, [boxes, needs]);

  if (!needs) return { boxes, resolving: false };
  if (hydrated && hydrated.source === boxes) return { boxes: hydrated.boxes, resolving: false };
  return { boxes, resolving: true };
}
