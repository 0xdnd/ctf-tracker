import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  BacklinksPanel,
  backlinkRoute,
  buildBacklinkDocs,
  getBacklinks,
} from '../../components/writeup/BacklinksPanel';
import type { Machine } from '../../types';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';

const machine = (over: Partial<Machine>): Machine =>
  ({ id: 'm', name: 'M', ip: '10.0.0.1', os: 'Linux', platform: 'HTB', tags: [], ...over }) as Machine;

const note = (over: Partial<CptsNoteEntry>): CptsNoteEntry =>
  ({ id: 'n', title: 'N', summary: '', rawMarkdown: '', ...over }) as CptsNoteEntry;

describe('backlinks over notes, writeups and lab notes', () => {
  const machines = [
    machine({ id: 'lame', name: 'Lame', writeupMarkdown: '# Lame' }),
    machine({ id: 'legacy', name: 'Legacy', writeupMarkdown: 'Same Samba bug as [[Lame]].', quickNotes: 'see [[lame|that box]]' }),
    machine({ id: 'self', name: 'Self', writeupMarkdown: 'links to [[Self]]' }),
    machine({ id: 'active', name: 'Hot', isActive: true, writeupMarkdown: 'see [[Lame]]', quickNotes: '[[Lame]]' }),
  ];
  const notes = [note({ id: 'smb-note', title: 'SMB tricks', rawMarkdown: 'Example: [[Lame]] usermap' })];
  const docs = buildBacklinkDocs(notes, machines);

  it('finds notes, writeups and lab notes that link to the machine, case-insensitively', () => {
    const refs = getBacklinks(docs, 'Lame');
    expect(refs.map((r) => `${r.kind}:${r.id}`).sort()).toEqual(['lab:legacy', 'note:smb-note', 'writeup:legacy']);
  });

  it('excludes self-links and active machines', () => {
    expect(getBacklinks(docs, 'Self')).toEqual([]);
    expect(docs.some((d) => d.id === 'active')).toBe(false);
  });

  it('maps each kind to its route', () => {
    expect(backlinkRoute({ id: 'smb-note', title: 'x', kind: 'note' })).toBe('/field-manual?note=smb-note');
    expect(backlinkRoute({ id: 'legacy', title: 'x', kind: 'writeup' })).toBe('/writeup/legacy');
    expect(backlinkRoute({ id: 'legacy', title: 'x', kind: 'lab' })).toBe('/target/legacy');
  });
});

describe('BacklinksPanel', () => {
  const renderPanel = (props: React.ComponentProps<typeof BacklinksPanel>) =>
    render(
      <MemoryRouter>
        <BacklinksPanel {...props} />
      </MemoryRouter>
    );

  it('lists each backlink as a link to its route', () => {
    renderPanel({
      title: 'Lame',
      backlinks: [
        { id: 'smb-note', title: 'SMB tricks', kind: 'note' },
        { id: 'legacy', title: 'Legacy', kind: 'writeup' },
        { id: 'legacy', title: 'Legacy', kind: 'lab' },
      ],
    });
    expect(screen.getByTestId('writeup-backlinks')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /SMB tricks/ })).toHaveAttribute('href', '/field-manual?note=smb-note');
    const legacy = screen.getAllByRole('link', { name: /Legacy/ });
    expect(legacy.map((a) => a.getAttribute('href'))).toEqual(['/writeup/legacy', '/target/legacy']);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows an empty state when nothing links to the entry', () => {
    renderPanel({ title: 'Lame', backlinks: [] });
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.getByText(/Nothing links to/)).toBeInTheDocument();
  });
});
