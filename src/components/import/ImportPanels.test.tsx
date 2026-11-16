import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ImportPanels } from './ImportPanels';
import { useCtfStore } from '../../store/useCtfStore';
import { useOnboardingStore } from '../../onboarding/useOnboardingStore';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

beforeEach(() => {
  useCtfStore.setState({ machines: [], isCatalogLoaded: true, loadCatalog: vi.fn(), soundEnabled: false } as never);
});
afterEach(() => {
  cleanup();
  useOnboardingStore.setState({ tourActive: false, stepIndex: 0, tourStepIds: [] });
});

describe('ImportPanels banner', () => {
  it('starts as a one-row banner with Import and Skip, and no form', () => {
    const onSkip = vi.fn();
    render(<ImportPanels onSkip={onSkip} />);
    expect(screen.getByTestId('import-banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Import your solved boxes' })).toBeInTheDocument();
    expect(screen.queryByTestId('paste-import-panel')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Box names/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Have a spreadsheet? Import a CSV file' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Skip, I'm starting fresh/ }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('opens the form in place, with focus in the text box, when Import is pressed', () => {
    render(<ImportPanels />);
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(screen.queryByTestId('import-banner')).not.toBeInTheDocument();
    expect(screen.getByTestId('paste-import-panel')).toBeInTheDocument();
    expect(screen.getByLabelText(/Box names/)).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Have a spreadsheet? Import a CSV file' })).toBeInTheDocument();
  });

  it('starts expanded and focused when forced (?import=1 or the Import menu)', () => {
    render(<ImportPanels focusOnMount />);
    expect(screen.queryByTestId('import-banner')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Box names/)).toHaveFocus();
  });

  it('opens when the first-run tour reaches its import step, and stays open after it', () => {
    render(<ImportPanels />);
    expect(screen.getByTestId('import-banner')).toBeInTheDocument();
    act(() => useOnboardingStore.setState({ tourActive: true, tourStepIds: ['welcome', 'import', 'final'], stepIndex: 1 }));
    expect(screen.getByTestId('paste-import-panel')).toBeInTheDocument();
    act(() => useOnboardingStore.setState({ stepIndex: 2 }));
    expect(screen.getByTestId('paste-import-panel')).toBeInTheDocument();
  });
});

describe('ImportPanels', () => {
  it('keeps the paste importer and opens the CSV importer on request', async () => {
    render(<ImportPanels focusOnMount />);
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

describe('ImportPanels loading fallback', () => {
  it('shows a labelled skeleton while the CSV importer chunk loads', async () => {
    vi.resetModules();
    const { ImportPanels: Fresh } = await import('./ImportPanels');
    render(<Fresh csvRequested />);
    expect(screen.getByText('Loading CSV import…')).toBeInTheDocument();
    expect(await screen.findByTestId('csv-import-panel')).toBeInTheDocument();
    expect(screen.queryByText('Loading CSV import…')).not.toBeInTheDocument();
  });
});
