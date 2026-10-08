/**
 * examProofImageStorage.test.tsx
 * Exam proof screenshots live in IndexedDB; the persisted exam store keeps only `imageRef`.
 *
 * Verifies:
 * - (a) a new proof persists a ref (not Base64) in the localStorage JSON, with an inline fallback
 * - (b) hydrate migration moves legacy Base64 to IndexedDB, only after the write resolved,
 *       keeps Base64 when the write fails, and is idempotent
 * - (c) report exports (markdown / HTML / modal) still embed the image data
 * - (d) removing a proof, resetting, restarting or shuffling deletes the blob
 * - useProofImage: object URL lifecycle + legacy passthrough
 *
 * Backups: exportBackup/importBackup/workspaceStorage do not include exam state today, so there
 * is nothing to inline or restore there.
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { ExamEvidenceDropzone } from '../../components/exam/ExamEvidenceDropzone';
import { ExamReportModal } from '../../components/exam/ExamReportModal';
import { useProofImage } from '../../hooks/useProofImage';
import { EXAM_STORAGE_KEY, migrateExamProofImages, useExamStore } from '../../store/examStore';
import {
  deleteProofImageBlobs,
  loadProofImageBlob,
  saveProofImageBlob,
} from '../../utils/indexedDbDeepStorage';
import {
  blobToDataUrl,
  createScreenshotProof,
  dataUrlToBlob,
  hydrateBoxesWithProofImages,
  proofImageRefFor,
  resolveProofImage,
} from '../../utils/examProofImages';
import { generateExamReportHtml, generateExamReportMarkdown } from '../../utils/examReportGenerator';
import { ExamSessionState, ScreenshotProof } from '../../utils/examComplianceUtils';
import { FakeIndexedDb, installFakeIndexedDb } from './fakeIndexedDb';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const IMAGE_KEY_PREFIX = 'exam_proof_image:';

let idb: FakeIndexedDb;

const firstBoxId = () => useExamStore.getState().boxes[0].id;
const screenshotsOf = (boxId: string, flag: 'user' | 'root' = 'user') => {
  const box = useExamStore.getState().boxes.find((b) => b.id === boxId)!;
  return (flag === 'user' ? box.userProof : box.rootProof).screenshots || [];
};
const persistedJson = () => localStorage.getItem(EXAM_STORAGE_KEY) || '';
const blobKeys = () => [...idb.records.keys()].filter((k) => k.startsWith(IMAGE_KEY_PREFIX));

function inlineShot(id: string): ScreenshotProof & { dataUrl: string } {
  return {
    id,
    dataUrl: PNG_DATA_URL,
    caption: `caption ${id}`,
    timestamp: '2026-01-01T00:00:00.000Z',
    sizeBytes: 70,
  };
}

/** Adds a screenshot the way the dropzone does: bytes to IndexedDB, ref into the store. */
async function addRefShot(id: string, boxId = firstBoxId(), flag: 'user' | 'root' = 'user') {
  const shot = await createScreenshotProof(boxId, flag, inlineShot(id));
  useExamStore.getState().addScreenshot(boxId, flag, shot);
  return shot;
}

/** Writes a pre-IndexedDB (version 0, inline Base64) persisted payload and rehydrates the store from it. */
async function rehydrateFromLegacyState(shots: Array<{ boxIndex: number; shot: ScreenshotProof }>) {
  const state = useExamStore.getState();
  shots.forEach(({ boxIndex, shot }) => state.addScreenshot(state.boxes[boxIndex].id, 'user', shot));
  const raw = JSON.parse(persistedJson());
  raw.version = 0;
  const legacyJson = JSON.stringify(raw);

  useExamStore.getState().resetExam('OSCP');
  localStorage.setItem(EXAM_STORAGE_KEY, legacyJson);
  await act(async () => {
    await useExamStore.persist.rehydrate();
  });
}

beforeEach(() => {
  idb = installFakeIndexedDb();
  localStorage.clear();
  useExamStore.getState().resetExam('OSCP');
});

afterEach(() => {
  idb.uninstall();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('proof image blob storage (indexedDbDeepStorage)', () => {
  it('round-trips a blob and deletes it', async () => {
    const blob = dataUrlToBlob(PNG_DATA_URL)!;
    expect(await saveProofImageBlob('p1', blob)).toBe(true);

    const loaded = await loadProofImageBlob('p1');
    expect(loaded).not.toBeNull();
    expect(loaded!.type).toBe('image/png');
    expect(await blobToDataUrl(loaded!)).toBe(PNG_DATA_URL);

    await deleteProofImageBlobs(['p1']);
    expect(await loadProofImageBlob('p1')).toBeNull();
  });

  it('resolves false when the write transaction aborts (quota)', async () => {
    idb.failWrites = true;
    expect(await saveProofImageBlob('p1', dataUrlToBlob(PNG_DATA_URL)!)).toBe(false);
    expect(blobKeys()).toHaveLength(0);
  });

  it('degrades without throwing when IndexedDB is unavailable', async () => {
    idb.uninstall();
    expect(await saveProofImageBlob('p1', dataUrlToBlob(PNG_DATA_URL)!)).toBe(false);
    expect(await loadProofImageBlob('p1')).toBeNull();
    await expect(deleteProofImageBlobs(['p1'])).resolves.toBeUndefined();
  });

  it('only converts decodable image data URLs', () => {
    expect(dataUrlToBlob(PNG_DATA_URL)?.size).toBeGreaterThan(0);
    expect(dataUrlToBlob('javascript:alert(1)')).toBeNull();
    expect(dataUrlToBlob('data:text/html;base64,PGgxPng8L2gxPg==')).toBeNull();
    expect(dataUrlToBlob('data:image/png;base64,@@not-base64@@')).toBeNull();
  });
});

describe('(a) new proofs persist a ref, not Base64', () => {
  it('stores imageRef + metadata in localStorage and the bytes in IndexedDB', async () => {
    const shot = await addRefShot('sc_new_1');

    expect(shot.imageRef).toBe(proofImageRefFor(firstBoxId(), 'user', 'sc_new_1'));
    expect(shot.dataUrl).toBeUndefined();

    const persistedShot = JSON.parse(persistedJson()).state.boxes[0].userProof.screenshots[0];
    expect(persistedShot.imageRef).toBe(shot.imageRef);
    expect(persistedShot.caption).toBe('caption sc_new_1');
    expect(persistedShot.sizeBytes).toBe(70);
    expect(persistedShot.dataUrl).toBeUndefined();
    expect(persistedJson()).not.toContain('base64');

    expect(await resolveProofImage(shot.imageRef!)).toBe(PNG_DATA_URL);
  });

  it('falls back to inline Base64 when the IndexedDB write fails (evidence is never dropped)', async () => {
    idb.failWrites = true;
    const shot = await addRefShot('sc_fallback');

    expect(shot.imageRef).toBeUndefined();
    expect(shot.dataUrl).toBe(PNG_DATA_URL);
    expect(persistedJson()).toContain(PNG_DATA_URL);
    expect(blobKeys()).toHaveLength(0);
  });

  it('dropzone ingest stores a ref and the thumbnail resolves from IndexedDB', async () => {
    useExamStore.getState().startExam('OSCP');
    const box = useExamStore.getState().boxes[3];
    render(<ExamEvidenceDropzone box={box} flagType="user" />);

    const file = new File(['mock-image-binary-data'], 'terminal_proof.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.change(screen.getByTestId('evidence-file-input'), { target: { files: [file] } });
    });

    await waitFor(() => expect(screenshotsOf(box.id)).toHaveLength(1));
    const [sc] = screenshotsOf(box.id);
    expect(sc.imageRef).toBeTruthy();
    expect(sc.dataUrl).toBeUndefined();
    expect(persistedJson()).not.toContain('data:image');
    expect(idb.records.has(IMAGE_KEY_PREFIX + sc.imageRef)).toBe(true);

    const img = (await screen.findByAltText(sc.caption)) as HTMLImageElement;
    expect(img.src).toMatch(/^(data:image\/png|blob:)/);
  });
});

describe('(b) hydrate migration of legacy Base64', () => {
  it('moves legacy Base64 into IndexedDB and persists only the ref', async () => {
    await rehydrateFromLegacyState([{ boxIndex: 0, shot: inlineShot('sc_legacy_1') }]);
    expect(persistedJson()).toContain(PNG_DATA_URL); // sanity: legacy payload really was inline

    await waitFor(() => expect(screenshotsOf(firstBoxId())[0].imageRef).toBeTruthy());
    const [sc] = screenshotsOf(firstBoxId());
    expect(sc.dataUrl).toBeUndefined();
    expect(sc.caption).toBe('caption sc_legacy_1');
    expect(sc.imageRef).toBe(proofImageRefFor(firstBoxId(), 'user', 'sc_legacy_1'));

    expect(persistedJson()).not.toContain('base64');
    expect(JSON.parse(persistedJson()).version).toBe(1);
    expect(await resolveProofImage(sc.imageRef!)).toBe(PNG_DATA_URL);
  });

  it('keeps the Base64 when the IndexedDB write rejects, then migrates on a later retry', async () => {
    idb.failWrites = true;
    await rehydrateFromLegacyState([{ boxIndex: 0, shot: inlineShot('sc_legacy_fail') }]);

    expect(await migrateExamProofImages()).toBe(0);
    let [sc] = screenshotsOf(firstBoxId());
    expect(sc.dataUrl).toBe(PNG_DATA_URL);
    expect(sc.imageRef).toBeUndefined();
    expect(persistedJson()).toContain(PNG_DATA_URL);
    expect(blobKeys()).toHaveLength(0);

    idb.failWrites = false;
    expect(await migrateExamProofImages()).toBe(1);
    [sc] = screenshotsOf(firstBoxId());
    expect(sc.imageRef).toBeTruthy();
    expect(sc.dataUrl).toBeUndefined();
    expect(persistedJson()).not.toContain('base64');
  });

  it('keeps the Base64 when IndexedDB is unavailable', async () => {
    idb.uninstall();
    await rehydrateFromLegacyState([{ boxIndex: 0, shot: inlineShot('sc_no_idb') }]);

    expect(await migrateExamProofImages()).toBe(0);
    expect(screenshotsOf(firstBoxId())[0].dataUrl).toBe(PNG_DATA_URL);
  });

  it('replaces Base64 with the ref only after the IndexedDB write has resolved', async () => {
    let release!: () => void;
    idb.gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await rehydrateFromLegacyState([{ boxIndex: 0, shot: inlineShot('sc_ordered') }]);

    // Write is in flight (transaction not committed): state must still hold the Base64.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(idb.records.size).toBe(0);
    expect(screenshotsOf(firstBoxId())[0].dataUrl).toBe(PNG_DATA_URL);
    expect(screenshotsOf(firstBoxId())[0].imageRef).toBeUndefined();

    release();
    await waitFor(() => expect(screenshotsOf(firstBoxId())[0].imageRef).toBeTruthy());
    expect(idb.records.size).toBe(1);
    expect(screenshotsOf(firstBoxId())[0].dataUrl).toBeUndefined();
  });

  it('is idempotent and migrates each screenshot independently', async () => {
    await rehydrateFromLegacyState([
      { boxIndex: 0, shot: inlineShot('sc_a') },
      { boxIndex: 1, shot: inlineShot('sc_b') },
    ]);
    await waitFor(() => {
      expect(screenshotsOf(useExamStore.getState().boxes[0].id)[0].imageRef).toBeTruthy();
      expect(screenshotsOf(useExamStore.getState().boxes[1].id)[0].imageRef).toBeTruthy();
    });

    const writesAfterFirstRun = idb.writeCount;
    const snapshot = persistedJson();
    expect(await migrateExamProofImages()).toBe(0);
    expect(idb.writeCount).toBe(writesAfterFirstRun);
    expect(persistedJson()).toBe(snapshot);
    expect(blobKeys()).toHaveLength(2);
  });
});

describe('(c) exports still embed the image data', () => {
  const sessionFromStore = (): ExamSessionState => {
    const s = useExamStore.getState();
    return {
      id: s.id,
      track: s.track,
      candidateName: 'Test Operator',
      candidateCallsign: 'tester',
      osid: 'OS-1',
      examStartedAt: Date.now(),
      examDurationSeconds: s.totalDurationSeconds,
      examExpiresAt: s.examExpiresAt,
      isTimerRunning: false,
      timerPausedRemainingSeconds: null,
      boxes: s.boxes,
      scratchNotes: '',
      includeBonusPoints: false,
    };
  };

  it('hydrateBoxesWithProofImages re-inlines refs so markdown and HTML reports embed the image', async () => {
    await addRefShot('sc_report');
    const session = sessionFromStore();

    // Ref-only boxes cannot embed anything...
    expect(generateExamReportMarkdown(session)).not.toContain('base64');

    // ...hydrated boxes embed the exact original data URL again.
    const hydratedSession = { ...session, boxes: await hydrateBoxesWithProofImages(session.boxes) };
    expect(generateExamReportMarkdown(hydratedSession)).toContain(`](${PNG_DATA_URL})`);
    expect(generateExamReportHtml(hydratedSession)).toContain(PNG_DATA_URL);
  });

  it('leaves unresolvable refs untouched (report simply omits that image)', async () => {
    const shot = await addRefShot('sc_missing');
    await deleteProofImageBlobs([shot.imageRef!]);

    const session = sessionFromStore();
    const hydrated = await hydrateBoxesWithProofImages(session.boxes);
    expect(hydrated[0].userProof.screenshots![0].dataUrl).toBeUndefined();
    expect(generateExamReportMarkdown({ ...session, boxes: hydrated })).not.toContain('base64');
  });

  it('ExamReportModal resolves refs asynchronously and embeds them in the report', async () => {
    await addRefShot('sc_modal');

    render(<ExamReportModal isOpen onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('report-tab-raw'));

    await waitFor(() => {
      expect(screen.getByTestId('report-raw-markdown').textContent).toContain(PNG_DATA_URL);
    });
    expect(screen.getByTestId('report-download-md-btn')).not.toBeDisabled();

    fireEvent.click(screen.getByTestId('report-opt-screenshots'));
    expect(screen.getByTestId('report-raw-markdown').textContent).not.toContain('base64');
  });

  it('ExamReportModal blocks exports while proof images are still resolving', async () => {
    const shot = await addRefShot('sc_gated');
    expect(shot.imageRef).toBeTruthy();

    // Hold IndexedDB reads open so the modal is mid-resolution.
    let release!: () => void;
    idb.gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    render(<ExamReportModal isOpen onClose={() => {}} />);
    expect(screen.getByTestId('report-download-md-btn')).toBeDisabled();
    expect(screen.getByTestId('report-export-html-btn')).toBeDisabled();
    expect(screen.getByTestId('report-copy-markdown-btn')).toBeDisabled();

    release();
    await waitFor(() => expect(screen.getByTestId('report-download-md-btn')).not.toBeDisabled());
  });
});

describe('(d) deleting proofs removes the IndexedDB blob', () => {
  it('removeScreenshot deletes only that screenshot blob', async () => {
    const keep = await addRefShot('sc_keep');
    const drop = await addRefShot('sc_drop');
    expect(blobKeys()).toHaveLength(2);

    useExamStore.getState().removeScreenshot(firstBoxId(), 'user', 'sc_drop');

    await waitFor(() => expect(blobKeys()).toEqual([IMAGE_KEY_PREFIX + keep.imageRef]));
    expect(idb.records.has(IMAGE_KEY_PREFIX + drop.imageRef)).toBe(false);
    expect(screenshotsOf(firstBoxId()).map((s) => s.id)).toEqual(['sc_keep']);
  });

  it('updateProof that drops a screenshot from the list deletes its blob', async () => {
    const keep = await addRefShot('sc_keep');
    await addRefShot('sc_drop');

    useExamStore.getState().updateProof(firstBoxId(), 'user', {
      screenshots: screenshotsOf(firstBoxId()).filter((s) => s.id === 'sc_keep'),
    });

    await waitFor(() => expect(blobKeys()).toEqual([IMAGE_KEY_PREFIX + keep.imageRef]));
  });

  it('updateProof caption edits keep the blob', async () => {
    const shot = await addRefShot('sc_caption');
    useExamStore.getState().updateProof(firstBoxId(), 'user', {
      screenshots: screenshotsOf(firstBoxId()).map((s) => ({ ...s, caption: 'edited' })),
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(blobKeys()).toEqual([IMAGE_KEY_PREFIX + shot.imageRef]);
  });

  it('resetExam deletes every proof blob (user and root, all boxes)', async () => {
    const boxes = useExamStore.getState().boxes;
    await addRefShot('sc_1', boxes[0].id, 'user');
    await addRefShot('sc_2', boxes[0].id, 'root');
    await addRefShot('sc_3', boxes[1].id, 'user');
    expect(blobKeys()).toHaveLength(3);

    useExamStore.getState().resetExam('OSCP');

    await waitFor(() => expect(blobKeys()).toHaveLength(0));
  });

  it('startExam, shuffleTargets and setTrack discard the previous boxes blobs', async () => {
    await addRefShot('sc_start');
    useExamStore.getState().startExam('OSCP');
    await waitFor(() => expect(blobKeys()).toHaveLength(0));

    await addRefShot('sc_shuffle');
    expect(blobKeys()).toHaveLength(1);
    useExamStore.getState().shuffleTargets();
    await waitFor(() => expect(blobKeys()).toHaveLength(0));

    useExamStore.getState().resetExam('OSCP'); // back to idle so the track can change
    await addRefShot('sc_track');
    expect(blobKeys()).toHaveLength(1);
    useExamStore.getState().setTrack('CPTS');
    await waitFor(() => expect(blobKeys()).toHaveLength(0));
  });

  it('a blob written for a screenshot deleted mid-migration is cleaned up', async () => {
    let release!: () => void;
    idb.gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await rehydrateFromLegacyState([{ boxIndex: 0, shot: inlineShot('sc_vanish') }]);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    useExamStore.getState().removeScreenshot(firstBoxId(), 'user', 'sc_vanish'); // inline: nothing to purge yet
    release();

    await waitFor(() => expect(blobKeys()).toHaveLength(0));
    expect(screenshotsOf(firstBoxId())).toHaveLength(0);
  });
});

describe('useProofImage', () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  afterEach(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it('creates an object URL for a ref and revokes it on unmount', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:proof-1');
    URL.revokeObjectURL = vi.fn();
    await saveProofImageBlob('ref-1', dataUrlToBlob(PNG_DATA_URL)!);

    const { result, unmount } = renderHook(() => useProofImage('ref-1'));
    expect(result.current).toEqual({ src: null, loading: true });

    await waitFor(() => expect(result.current.src).toBe('blob:proof-1'));
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:proof-1');
  });

  it('revokes the previous object URL when the ref changes', async () => {
    let n = 0;
    URL.createObjectURL = vi.fn(() => `blob:proof-${++n}`);
    URL.revokeObjectURL = vi.fn();
    await saveProofImageBlob('ref-a', dataUrlToBlob(PNG_DATA_URL)!);
    await saveProofImageBlob('ref-b', dataUrlToBlob(PNG_DATA_URL)!);

    const { result, rerender } = renderHook(({ ref }) => useProofImage(ref), { initialProps: { ref: 'ref-a' } });
    await waitFor(() => expect(result.current.src).toBe('blob:proof-1'));

    rerender({ ref: 'ref-b' });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:proof-1');
    await waitFor(() => expect(result.current.src).toBe('blob:proof-2'));
  });

  it('falls back to a data URL when object URLs are unavailable', async () => {
    (URL as unknown as { createObjectURL?: unknown }).createObjectURL = undefined;
    await saveProofImageBlob('ref-2', dataUrlToBlob(PNG_DATA_URL)!);

    const { result } = renderHook(() => useProofImage('ref-2'));
    await waitFor(() => expect(result.current.src).toBe(PNG_DATA_URL));
  });

  it('reports a missing blob as unavailable (not loading)', async () => {
    const { result } = renderHook(() => useProofImage('ref-missing'));
    await waitFor(() => expect(result.current).toEqual({ src: null, loading: false }));
  });

  it('returns a legacy inline data URL as-is without touching IndexedDB', () => {
    const { result } = renderHook(() => useProofImage(undefined, PNG_DATA_URL));
    expect(result.current).toEqual({ src: PNG_DATA_URL, loading: false });
  });
});
