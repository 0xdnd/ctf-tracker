import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserMenu } from '../../components/auth/UserMenu';
import { SettingsDropdown } from '../../components/layout/SettingsDropdown';
import { useCtfStore } from '../../store/useCtfStore';
import { MAX_JSON_IMPORT_BYTES } from '../../utils/importLimits';
import { toast } from '../../store/useToastStore';

const hugeFile = () => {
  const file = new File(['{}'], 'backup.json', { type: 'application/json' });
  Object.defineProperty(file, 'size', { value: MAX_JSON_IMPORT_BYTES + 1 });
  return file;
};

afterEach(() => vi.restoreAllMocks());

describe('JSON imports refuse files over the size limit before reading them', () => {
  it('UserMenu "Import backup"', () => {
    useCtfStore.setState({ machines: [] });
    const read = vi.spyOn(FileReader.prototype, 'readAsText');
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => undefined as never);
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);

    render(<UserMenu />);
    fireEvent.click(screen.getByTitle(/Operator|Local Mode/i));
    fireEvent.click(screen.getByRole('button', { name: /Import backup/i }));
    const picker = click.mock.contexts[0] as HTMLInputElement;
    expect(picker).toBeDefined();
    Object.defineProperty(picker, 'files', { value: [hugeFile()] });
    picker.onchange?.({ target: picker } as unknown as Event);

    expect(read).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalled();
  });

  it('SettingsDropdown workspace import', () => {
    const read = vi.spyOn(FileReader.prototype, 'readAsText');
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => undefined as never);
    render(
      <MemoryRouter>
        <SettingsDropdown />
      </MemoryRouter>
    );
    const input = screen.getByLabelText('Choose workspace JSON file to import');
    fireEvent.change(input, { target: { files: [hugeFile()] } });

    expect(read).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalled();
  });
});
