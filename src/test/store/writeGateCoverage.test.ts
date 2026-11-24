import { describe, it, expect, beforeEach, vi } from 'vitest';

// The write gate is process-wide and sticky, so each test boots fresh modules.
const engageGate = async () => {
  const gate = await import('../../utils/schemaWriteGate');
  gate.engageSchemaWriteGate('newer-schema');
};

describe('exam store honours the schema write gate', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it('leaves the persisted exam payload byte-identical while gated', async () => {
    const { EXAM_STORAGE_KEY, useExamStore } = await import('../../store/examStore');
    const stored = JSON.stringify({ state: { scratchNotes: 'from a newer build' }, version: 99 });
    localStorage.setItem(EXAM_STORAGE_KEY, stored);
    await engageGate();

    useExamStore.getState().setScratchNotes('overwrite attempt');
    useExamStore.getState().startExam('OSCP');

    expect(localStorage.getItem(EXAM_STORAGE_KEY)).toBe(stored);
  });

  it('still writes while the gate is open', async () => {
    const { EXAM_STORAGE_KEY, useExamStore } = await import('../../store/examStore');
    useExamStore.getState().setScratchNotes('hello');
    expect(localStorage.getItem(EXAM_STORAGE_KEY)).toContain('hello');
  });
});

describe('image store honours the schema write gate', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('does not open the database for put, delete or profile wipe while gated', async () => {
    const openStoreDb = vi.fn(() => Promise.reject(new Error('should not be opened')));
    vi.doMock('../../utils/idbUtils', () => ({ openStoreDb }));
    const images = await import('../../utils/imageStore');
    await engageGate();

    await images.putImage('p1', 'img', new Blob(['x']));
    await images.deleteImage('p1', 'img');
    await images.deleteProfileImages('p1');

    expect(openStoreDb).not.toHaveBeenCalled();
    vi.doUnmock('../../utils/idbUtils');
  });
});

describe('pre-migration backup coverage', () => {
  it('includes the exam session key', async () => {
    const { isBackedUpStorageKey } = await import('../../store/preMigrationBackup');
    const { EXAM_STORAGE_KEY } = await import('../../store/examStore');
    expect(isBackedUpStorageKey(EXAM_STORAGE_KEY)).toBe(true);
  });
});
