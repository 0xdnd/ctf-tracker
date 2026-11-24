import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { BackupModal } from '../../components/backup/BackupModal';
import { useCtfStore } from '../../store/useCtfStore';
import { useToastStore } from '../../store/useToastStore';
import { MAX_JSON_IMPORT_BYTES } from '../../utils/importLimits';

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

const fileOfSize = (name: string, content: string, size: number) => {
  const file = new File([content], name, { type: 'application/json' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
  useCtfStore.setState({ backupModalOpen: true });
});

afterEach(() => {
  cleanup();
  useCtfStore.setState({ backupModalOpen: false });
  useToastStore.setState({ toasts: [] });
});

describe('BackupModal JSON file size limit', () => {
  it('shows a friendly toast and does not load a file over the limit', () => {
    render(<BackupModal />);
    const oversized = fileOfSize('huge.json', '{"machines":[]}', MAX_JSON_IMPORT_BYTES + 1);

    fireEvent.change(screen.getByLabelText('Upload JSON backup file'), { target: { files: [oversized] } });

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].message).toMatch(/over the 50 MB limit/);
    expect((screen.getByLabelText('Paste JSON backup content') as HTMLTextAreaElement).value).toBe('');
  });

  it('still loads a file inside the limit', async () => {
    render(<BackupModal />);
    const ok = fileOfSize('ok.json', '{"machines":[]}', 1024);

    fireEvent.change(screen.getByLabelText('Upload JSON backup file'), { target: { files: [ok] } });

    await waitFor(() =>
      expect((screen.getByLabelText('Paste JSON backup content') as HTMLTextAreaElement).value).toBe('{"machines":[]}')
    );
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
