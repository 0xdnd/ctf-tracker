import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ImportPanels } from './ImportPanels';
import { useCtfStore } from '../../store/useCtfStore';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

beforeEach(() => {
  useCtfStore.setState({ machines: [], isCatalogLoaded: true, loadCatalog: vi.fn(), soundEnabled: false } as never);
});
afterEach(cleanup);

describe('ImportPanels', () => {
  it('keeps the paste importer and opens the CSV importer on request', async () => {
    render(<ImportPanels />);
    expect(screen.getByTestId('paste-import-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('csv-import-panel')).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'Have a spreadsheet? Import a CSV file' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(await screen.findByTestId('csv-import-panel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide CSV import' })).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Hide CSV import' }));
    expect(screen.queryByTestId('csv-import-panel')).not.toBeInTheDocument();
  });

  it('opens the CSV importer straight away and focuses its file chooser when asked', async () => {
    render(<ImportPanels csvRequested focusOnMount />);
    expect(await screen.findByTestId('csv-import-panel')).toBeInTheDocument();
    expect(screen.getByLabelText(/^CSV file/)).toHaveFocus();
    expect(screen.getByLabelText(/Box names/)).not.toHaveFocus();
  });
});
