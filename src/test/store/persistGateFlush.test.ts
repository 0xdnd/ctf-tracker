import { describe, it, expect } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import { engageSchemaWriteGate, releaseRestoreWriteGate } from '../../utils/schemaWriteGate';

const STORE_KEY = 'zerobox-tactical-store';
const storedSound = () => JSON.parse(localStorage.getItem(STORE_KEY) as string).state.soundEnabled;

describe('tactical persist blob and the restore write gate', () => {
  it('does not record a gated change as persisted and re-flushes it when the gate releases', () => {
    useCtfStore.setState({ soundEnabled: false });
    expect(storedSound()).toBe(false);

    engageSchemaWriteGate('restoring');
    useCtfStore.setState({ soundEnabled: true });
    expect(storedSound()).toBe(false);

    // Released (aborted restore): the held-back change lands without any further edit.
    releaseRestoreWriteGate();
    expect(storedSound()).toBe(true);
  });
});
