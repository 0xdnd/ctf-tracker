import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { installFakeIndexedDb, type FakeIndexedDb } from '../exam/fakeIndexedDb';
import { useCtfStore } from '../../store/useCtfStore';
import { saveVaultToIndexedDb } from '../../utils/indexedDbVault';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import {
  buildTemplateEdits,
  defaultPlanSelections,
  hashContent,
  listUndoBatches,
  planNotesTemplating,
  planUndo,
  saveUndoBatch,
  templatizeParsedNotes,
  deleteUndoBatch,
  MAX_UNDO_BATCHES,
} from '../../utils/noteIpTemplating';
import { TemplatizeNotesModal } from '../../components/cheatsheet/TemplatizeNotesModal';

const note = (id: string, rawMarkdown: string, extra: Partial<CptsNoteEntry> = {}): CptsNoteEntry => ({
  id,
  title: `Note ${id}`,
  titleEn: `Note ${id}`,
  category: 'Test',
  rawCategory: 'Test',
  subCategory: 'Test',
  tags: [],
  difficulty: 'Easy',
  summary: '',
  commands: [],
  relPath: `${id}.md`,
  rawMarkdown,
  ...extra,
});

const SCAN_MD = '# Scan\n\n```bash\nnmap -sV 10.129.5.5\ncurl http://10.129.5.5:8080/\n```\nCallback LHOST=10.10.14.9';
const OTHER_MD = '# Other\n\nSee 172.16.9.9 in the diagram.';

let fake: FakeIndexedDb;
beforeEach(() => {
  fake = installFakeIndexedDb();
  vi.mocked(saveVaultToIndexedDb).mockClear();
});
afterEach(() => fake.uninstall());

describe('noteIpTemplating — planning', () => {
  it('plans only notes with IPs and rebuilds commands from the new markdown', () => {
    const notes = [note('a', SCAN_MD, { commands: ['stale'] }), note('b', '# none'), note('c', OTHER_MD)];
    const plans = planNotesTemplating(notes);
    expect(plans.map((p) => p.noteId)).toEqual(['a', 'c']);

    const selections = defaultPlanSelections(plans);
    const edits = buildTemplateEdits(plans, selections);
    // 'c' only has a prose IP, which is off by default -> no edit.
    expect(edits.map((e) => e.noteId)).toEqual(['a']);
    expect(edits[0].rawMarkdown).toContain('nmap -sV {TARGET}');
    expect(edits[0].rawMarkdown).toContain('curl http://{TARGET}:8080/');
    expect(edits[0].rawMarkdown).toContain('LHOST={LHOST}');
    expect(edits[0].rawMarkdown.startsWith('---\noriginal_ips_target: 10.129.5.5\noriginal_ips_lhost: 10.10.14.9\n---\n')).toBe(true);

    const out = templatizeParsedNotes(notes, plans, selections);
    expect(out[0].commands).toEqual(['nmap -sV {TARGET}', 'curl http://{TARGET}:8080/']);
    expect(out[1]).toBe(notes[1]);
    expect(out[2]).toBe(notes[2]);
  });

  it('refuses to undo a note edited after the batch and reports it', () => {
    const batch = {
      id: 'b1',
      createdAt: new Date().toISOString(),
      entries: [
        { noteId: 'a', title: 'A', before: 'old a', afterHash: hashContent('new a') },
        { noteId: 'b', title: 'B', before: 'old b', afterHash: hashContent('new b') },
        { noteId: 'gone', title: 'Gone', before: 'x', afterHash: hashContent('y') },
      ],
    };
    const plan = planUndo(batch, [note('a', 'new a'), note('b', 'new b + my edit')]);
    expect(plan.restore).toEqual([{ noteId: 'a', rawMarkdown: 'old a' }]);
    expect(plan.skipped).toEqual([
      { noteId: 'b', title: 'B', reason: 'edited' },
      { noteId: 'gone', title: 'Gone', reason: 'missing' },
    ]);
  });

  it('stores undo batches newest first, capped, and deletes by id', async () => {
    for (let i = 0; i < MAX_UNDO_BATCHES + 2; i++) {
      await saveUndoBatch([{ noteId: 'a', rawMarkdown: `v${i}` }], { a: { title: 'A', rawMarkdown: `v${i - 1}` } });
    }
    const batches = await listUndoBatches();
    expect(batches).toHaveLength(MAX_UNDO_BATCHES);
    expect(batches[0].entries[0].afterHash).toBe(hashContent(`v${MAX_UNDO_BATCHES + 1}`));
    await deleteUndoBatch(batches[0].id);
    expect((await listUndoBatches())[0].id).toBe(batches[1].id);
  });
});

describe('applyNoteContentBatch', () => {
  it('rewrites custom and imported notes, stamps dateModified and re-derives commands', async () => {
    act(() => {
      useCtfStore.setState({
        customNotes: [note('mine', 'x', { commands: [] })],
        userNotes: [note('imp', 'y', { commands: ['stale'] }), note('mine', 'imported copy')],
      });
    });
    const res = await useCtfStore.getState().applyNoteContentBatch([
      { noteId: 'mine', rawMarkdown: '```\nping {TARGET}\n```' },
      { noteId: 'imp', rawMarkdown: '```sh\nnmap {TARGET}\n```' },
      { noteId: 'nope', rawMarkdown: 'z' },
    ]);
    expect(res.updated.sort()).toEqual(['imp', 'mine']);
    expect(res.missing).toEqual(['nope']);
    const s = useCtfStore.getState();
    expect(s.customNotes[0]).toMatchObject({ rawMarkdown: '```\nping {TARGET}\n```', commands: ['ping {TARGET}'] });
    expect(s.customNotes[0].dateModified).toBeTruthy();
    expect(s.userNotes[0]).toMatchObject({ commands: ['nmap {TARGET}'] });
    // The authored copy wins: the imported note with the same id is untouched.
    expect(s.userNotes[1].rawMarkdown).toBe('imported copy');
    expect(saveVaultToIndexedDb).toHaveBeenCalledTimes(1);
  });
});

describe('TemplatizeNotesModal', () => {
  beforeEach(() => {
    act(() => {
      useCtfStore.setState({
        customNotes: [],
        userNotes: [note('scan', SCAN_MD), note('other', OTHER_MD)],
        globalVars: { ...useCtfStore.getState().globalVars, lhost: '', targetIp: '' },
      });
    });
  });

  const renderModal = () =>
    render(<TemplatizeNotesModal open onClose={() => {}} noteIds={['scan', 'other']} scopeLabel="vault" />);

  it('previews, applies and undoes', async () => {
    renderModal();
    expect(screen.getByTestId('ip-template-summary').textContent).toContain('3 replacements in 1 of 2 notes');
    // Prose IP is offered for review but unchecked.
    expect((screen.getByLabelText('Replace 172.16.9.9 with {TARGET}') as HTMLInputElement).checked).toBe(false);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Replace 3 IPs/ }));
    });
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Replaced IPs in 1 note'));
    const scan = useCtfStore.getState().userNotes.find((n) => n.id === 'scan')!;
    expect(scan.rawMarkdown).toContain('nmap -sV {TARGET}');
    expect(scan.commands).toContain('nmap -sV {TARGET}');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Undo last replacement/ }));
    });
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Restored 1 note'));
    expect(useCtfStore.getState().userNotes.find((n) => n.id === 'scan')!.rawMarkdown).toBe(SCAN_MD);
  });

  it('skips undo for a note edited after the replacement', async () => {
    renderModal();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Replace 3 IPs/ }));
    });
    await waitFor(() => screen.getByRole('button', { name: /Undo last replacement/ }));
    await act(async () => {
      await useCtfStore.getState().updateNoteContent('scan', '# my own edit');
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Undo last replacement/ }));
    });
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Skipped 1'));
    expect(useCtfStore.getState().userNotes.find((n) => n.id === 'scan')!.rawMarkdown).toBe('# my own edit');
  });

  it('lets the user switch a role and deselect', async () => {
    renderModal();
    fireEvent.click(screen.getByLabelText('Replace 10.129.5.5 with {TARGET}'));
    expect(screen.getByTestId('ip-template-summary').textContent).toContain('1 replacement in 1 of 2 notes');
    const row = screen.getByTestId('ip-row-172.16.9.9');
    fireEvent.click(row.querySelectorAll('button')[1]); // {LHOST}
    expect(screen.getByTestId('ip-template-summary').textContent).toContain('2 replacements in 2 of 2 notes');
  });

  it('reports an error, not success, when no note was updated', async () => {
    const realApply = useCtfStore.getState().applyNoteContentBatch;
    act(() => useCtfStore.setState({ applyNoteContentBatch: async () => ({ updated: [], missing: ['scan'] }) }));
    try {
      renderModal();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Replace 3 IPs/ }));
      });
      await waitFor(() => expect(screen.getByRole('status').textContent).toContain('No notes were changed'));
      expect(screen.queryByRole('button', { name: /Undo last replacement/ })).toBeNull();
      expect(await listUndoBatches()).toHaveLength(0);
    } finally {
      act(() => useCtfStore.setState({ applyNoteContentBatch: realApply }));
    }
  });

  it('keeps undo history per profile', async () => {
    const original = useCtfStore.getState().currentProfileId;
    try {
      act(() => useCtfStore.setState({ currentProfileId: 'profile-a' }));
      await saveUndoBatch([{ noteId: 'a', rawMarkdown: 'v1' }], { a: { title: 'A', rawMarkdown: 'v0' } });
      expect(await listUndoBatches()).toHaveLength(1);
      act(() => useCtfStore.setState({ currentProfileId: 'profile-b' }));
      expect(await listUndoBatches()).toHaveLength(0);
      act(() => useCtfStore.setState({ currentProfileId: 'profile-a' }));
      expect(await listUndoBatches()).toHaveLength(1);
    } finally {
      act(() => useCtfStore.setState({ currentProfileId: original }));
    }
  });
});
