import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useExamStore, EXAM_STORAGE_KEY, EXAM_STORAGE_FULL_MESSAGE } from '../../store/examStore';
import { engageSchemaWriteGate, releaseRestoreWriteGate } from '../../utils/schemaWriteGate';

const quotaError = () => Object.assign(new Error('quota'), { name: 'QuotaExceededError' });

describe('exam store persistence', () => {
  beforeEach(() => {
    useExamStore.getState().resetExam('OSCP');
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('raises the sticky storage-full banner event once when an exam write hits the quota', () => {
    const events: any[] = [];
    const onStorage = (e: Event) => events.push((e as CustomEvent).detail);
    window.addEventListener('zerobox:storage', onStorage);
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === EXAM_STORAGE_KEY) throw quotaError();
      return original.call(this, key, value);
    });
    useExamStore.setState({ scratchNotes: 'first' });
    useExamStore.setState({ scratchNotes: 'second' });
    window.removeEventListener('zerobox:storage', onStorage);
    expect(events).toEqual([{ kind: 'quota', message: EXAM_STORAGE_FULL_MESSAGE, sticky: true }]);
    vi.restoreAllMocks();
    useExamStore.setState({ scratchNotes: 'recovered' });
    expect(JSON.parse(localStorage.getItem(EXAM_STORAGE_KEY)!).state.scratchNotes).toBe('recovered');
  });

  it("rehydrates from another tab's exam write instead of overwriting it", async () => {
    useExamStore.setState({ scratchNotes: 'stale tab' });
    const stored = JSON.parse(localStorage.getItem(EXAM_STORAGE_KEY)!);
    stored.state.scratchNotes = 'other tab notes';
    stored.state.candidateName = 'Other Tab';
    const newValue = JSON.stringify(stored);
    localStorage.setItem(EXAM_STORAGE_KEY, newValue);
    window.dispatchEvent(new StorageEvent('storage', { key: EXAM_STORAGE_KEY, newValue }));
    await vi.waitFor(() => expect(useExamStore.getState().scratchNotes).toBe('other tab notes'));
    expect(useExamStore.getState().candidateName).toBe('Other Tab');
    // A later edit here builds on the other tab's state rather than clobbering it.
    useExamStore.setState({ includeBonusPoints: true });
    const after = JSON.parse(localStorage.getItem(EXAM_STORAGE_KEY)!).state;
    expect(after.scratchNotes).toBe('other tab notes');
    expect(after.includeBonusPoints).toBe(true);
  });

  it('does not write the exam session while the schema write gate is engaged', () => {
    useExamStore.setState({ scratchNotes: 'before gate' });
    engageSchemaWriteGate('restoring');
    try {
      useExamStore.setState({ scratchNotes: 'while gated' });
      expect(JSON.parse(localStorage.getItem(EXAM_STORAGE_KEY)!).state.scratchNotes).toBe('before gate');
    } finally {
      releaseRestoreWriteGate();
    }
  });
});
