import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OperatorFlexCardModal } from './OperatorFlexCardModal';
import { useCtfStore } from '../../store/useCtfStore';
import { useExamStore } from '../../store/examStore';

const machines = [
  { id: 'm1', name: 'Lame', status: 'root', timeSpentSeconds: 7200, rootPwnedAt: '2026-11-03T10:00:00.000Z' },
  { id: 'm2', name: 'Legacy', status: 'completed', timeSpentSeconds: 3600 },
  { id: 'm3', name: 'Blue', status: 'recon' },
];

const summaryBox = () => screen.getByLabelText('Summary text') as HTMLTextAreaElement;

let writeText: ReturnType<typeof vi.fn>;
let openSpy: ReturnType<typeof vi.spyOn>;
let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  useExamStore.setState({ track: 'CPTS' });
  useCtfStore.setState({
    machines: machines as never,
    activitySessions: [],
    soundEnabled: false,
    flexCardModalOpen: false,
    flexCardMode: 'achievement',
  });
  // jsdom has no 2D canvas; the panel must cope with a null context.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AAAA');
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  fetchSpy = vi.fn(() => Promise.reject(new Error('no network')));
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  useCtfStore.setState({ flexCardModalOpen: false, flexCardMode: 'achievement' });
});

const openPassed = () => {
  act(() => useCtfStore.getState().setFlexCardModalOpen(true, 'passed'));
  return render(<OperatorFlexCardModal />);
};

describe('store wiring', () => {
  it('opens in the requested mode and defaults to the achievement card', () => {
    useCtfStore.getState().setFlexCardModalOpen(true, 'passed');
    expect(useCtfStore.getState()).toMatchObject({ flexCardModalOpen: true, flexCardMode: 'passed' });
    useCtfStore.getState().setFlexCardModalOpen(false);
    expect(useCtfStore.getState()).toMatchObject({ flexCardModalOpen: false, flexCardMode: 'passed' });
    useCtfStore.getState().setFlexCardModalOpen(true);
    expect(useCtfStore.getState().flexCardMode).toBe('achievement');
  });
});

describe('"I passed" share panel', () => {
  it('opens as a labelled dialog with the exam from the simulator preselected', () => {
    openPassed();
    expect(screen.getByRole('dialog', { name: 'Share that I passed' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'I passed' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('radio', { name: 'CPTS' })).toBeChecked();
    expect(screen.getByLabelText('Pass date (optional)')).toHaveValue('');
    expect(screen.getByRole('group', { name: 'Stats on the card' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /I passed CPTS/ })).toBeInTheDocument();
  });

  it('updates the summary as the options change', () => {
    openPassed();
    expect(summaryBox().value).toBe(
      'I passed CPTS (Certified Penetration Testing Specialist).\n' +
        'Prep: machines completed: 2 machines, longest streak: 1 day.\n' +
        'Tracked with ZeroBox (ctftracker.com).',
    );
    fireEvent.click(screen.getByRole('radio', { name: 'OSWE' }));
    fireEvent.change(screen.getByLabelText('Pass date (optional)'), { target: { value: '2026-11-04' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Machines completed/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Hours tracked/ }));
    expect(summaryBox().value).toBe(
      'I passed OSWE (OffSec Web Expert) on November 4, 2026.\n' +
        'Prep: longest streak: 1 day, hours tracked: 3 hours.\n' +
        'Tracked with ZeroBox (ctftracker.com).',
    );
    expect(screen.getByRole('img', { name: /passed November 4, 2026/ })).toBeInTheDocument();
  });

  it('copies the exact summary text and announces it', async () => {
    openPassed();
    fireEvent.click(screen.getByRole('button', { name: 'Copy text' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Summary copied'));
    expect(writeText).toHaveBeenCalledWith(summaryBox().value);
  });

  it('shows a visible error when the clipboard refuses', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'));
    openPassed();
    fireEvent.click(screen.getByRole('button', { name: 'Copy text' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Could not copy/));
  });

  it('downloads a local PNG named after the exam', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    openPassed();
    fireEvent.change(screen.getByLabelText('Pass date (optional)'), { target: { value: '2026-11-04' } });
    fireEvent.click(screen.getByRole('button', { name: 'Download PNG' }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    const clicked = clickSpy.mock.contexts[0] as HTMLAnchorElement;
    expect(clicked.download).toBe('ZeroBox-CPTS-passed-2026-11-04.png');
    expect(clicked.href).toMatch(/^data:image\/png/);
  });

  it('has no social share buttons and makes no outbound requests', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    openPassed();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('button', { name: /LinkedIn|Share on X/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Download PNG' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy text' }));
    expect(openSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('switches card type with the arrow keys and keeps focus on the tab', () => {
    openPassed();
    const passedTab = screen.getByRole('tab', { name: 'I passed' });
    passedTab.focus();
    fireEvent.keyDown(passedTab, { key: 'ArrowLeft' });
    const progressTab = screen.getByRole('tab', { name: 'Progress card' });
    expect(progressTab).toHaveAttribute('aria-selected', 'true');
    expect(progressTab).toHaveFocus();
    expect(screen.getByRole('dialog', { name: 'Achievement card' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Summary text')).toBeNull();
  });
});
