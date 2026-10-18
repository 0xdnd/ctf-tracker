import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Machine } from '../../types';
import { useCtfStore } from '../../store/useCtfStore';

const imageStore = vi.hoisted(() => ({
  blobs: new Map<string, Blob>(),
  putImage: vi.fn(),
  getImage: vi.fn(),
  compressToWebp: vi.fn(),
}));

vi.mock('../../utils/imageStore', async () => {
  const actual = await vi.importActual<typeof import('../../utils/imageStore')>('../../utils/imageStore');
  return {
    ...actual,
    putImage: imageStore.putImage,
    getImage: imageStore.getImage,
    compressToWebp: imageStore.compressToWebp,
    newImageId: () => 'img-fixed',
  };
});

import { WriteupStudio } from '../../components/writeup/WriteupStudio';

const lame = {
  id: 'lame',
  name: 'Lame',
  ip: '10.10.10.3',
  os: 'Linux',
  platform: 'HTB',
  difficulty: 'Easy',
  status: 'rooted',
  tags: [],
  certifications: [],
  timeSpentSeconds: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  writeupMarkdown: 'Intro\n\n![screenshot](zerobox-img://img-1)\n',
  services: [{ port: 445, protocol: 'tcp', state: 'open', service: 'smb' }],
  findings: [{ id: 'f1', title: 'Samba RCE', severity: 'critical', createdAt: 1, updatedAt: 1 }],
} as unknown as Machine;

const other = {
  ...lame,
  id: 'legacy',
  name: 'Legacy',
  writeupMarkdown: 'Same bug as [[Lame]]',
  services: undefined,
  findings: undefined,
} as unknown as Machine;

const renderStudio = () =>
  render(
    <MemoryRouter initialEntries={['/writeup/lame']}>
      <Routes>
        <Route path="/writeup/:id" element={<WriteupStudio />} />
      </Routes>
    </MemoryRouter>
  );

describe('WriteupStudio: pasted images, lab summary, backlinks', () => {
  let urlCounter = 0;
  const revoke = vi.fn();

  beforeEach(() => {
    urlCounter = 0;
    revoke.mockReset();
    imageStore.putImage.mockReset().mockResolvedValue(undefined);
    imageStore.getImage.mockReset().mockImplementation(async (_p: string, id: string) =>
      id === 'img-1' ? new Blob(['img'], { type: 'image/webp' }) : null
    );
    imageStore.compressToWebp.mockReset().mockResolvedValue(new Blob(['c'], { type: 'image/webp' }));
    vi.stubGlobal('URL', Object.assign(URL, {
      createObjectURL: vi.fn(() => `blob:fake-${++urlCounter}`),
      revokeObjectURL: revoke,
    }));
    useCtfStore.setState({
      machines: [lame, other],
      writeupMachineId: 'lame',
      isDeepStorageLoaded: true,
      currentProfileId: 'prof-1',
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('resolves zerobox-img:// to an object URL in the preview and revokes it on unmount', async () => {
    const { unmount } = renderStudio();
    const img = await screen.findByAltText('screenshot');
    expect(img).toHaveAttribute('src', 'blob:fake-1');
    expect(imageStore.getImage).toHaveBeenCalledWith('prof-1', 'img-1');
    expect(revoke).not.toHaveBeenCalled();
    unmount();
    expect(revoke).toHaveBeenCalledWith('blob:fake-1');
  });

  it('revokes the object URL when the image reference is removed from the text', async () => {
    renderStudio();
    await screen.findByAltText('screenshot');
    fireEvent.change(screen.getByLabelText('Markdown report editor'), { target: { value: 'no images now' } });
    await waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:fake-1'));
    await waitFor(() => expect(screen.queryByAltText('screenshot')).toBeNull());
  });

  const pasteEvent = (items: Array<{ kind: string; type: string; file?: Blob }>) => ({
    clipboardData: {
      items: items.map((it) => ({ kind: it.kind, type: it.type, getAsFile: () => it.file ?? null })),
    },
  });

  it('stores a pasted image and inserts a zerobox-img reference at the cursor', async () => {
    renderStudio();
    const editor = screen.getByLabelText('Markdown report editor') as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: 'AB' } });
    editor.setSelectionRange(1, 1);

    const notPrevented = fireEvent.paste(
      editor,
      pasteEvent([{ kind: 'file', type: 'image/png', file: new Blob(['raw'], { type: 'image/png' }) }])
    );
    expect(notPrevented).toBe(false); // default paste suppressed
    await waitFor(() => expect(editor.value).toBe('A![screenshot](zerobox-img://img-fixed)B'));
    expect(imageStore.putImage).toHaveBeenCalledWith('prof-1', 'img-fixed', expect.any(Blob));
    expect(editor.value).not.toContain('base64');
    expect(useCtfStore.getState().machines.find((m) => m.id === 'lame')?.writeupMarkdown).toContain('zerobox-img://img-fixed');
  });

  it('leaves plain text pastes (and text + image pastes) to the browser', () => {
    renderStudio();
    const editor = screen.getByLabelText('Markdown report editor');
    const textOnly = fireEvent.paste(editor, pasteEvent([{ kind: 'string', type: 'text/plain' }]));
    expect(textOnly).toBe(true);
    const mixed = fireEvent.paste(
      editor,
      pasteEvent([
        { kind: 'string', type: 'text/plain' },
        { kind: 'file', type: 'image/png', file: new Blob(['raw']) },
      ])
    );
    expect(mixed).toBe(true);
    expect(imageStore.compressToWebp).not.toHaveBeenCalled();
  });

  it('inserts the lab summary at the cursor', async () => {
    renderStudio();
    const editor = screen.getByLabelText('Markdown report editor') as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: 'HeadTail' } });
    editor.setSelectionRange(4, 4);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Insert lab summary/ }));
    });
    expect(editor.value.startsWith('Head\n\n## Open ports and services')).toBe(true);
    expect(editor.value).toContain('### Samba RCE');
    expect(editor.value.endsWith('\n\nTail')).toBe(true);
  });

  it('shows entries that link to the current writeup in the backlinks panel', () => {
    renderStudio();
    const panel = screen.getByTestId('writeup-backlinks');
    const link = panel.querySelector('a[href="/writeup/legacy"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain('Legacy');
  });
});
