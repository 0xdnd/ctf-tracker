import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LazyMotion, domAnimation } from 'framer-motion';
import { UpdateAvailableModal } from '../../components/common/UpdateAvailableModal';
import { WhatsNewModal } from '../../components/common/WhatsNewModal';
import { useUpdateUiStore } from '../../store/useUpdateUiStore';
import { useCtfStore } from '../../store/useCtfStore';
import { useExamStore } from '../../store/examStore';
import { usePostUpdateWhatsNew } from '../../hooks/usePostUpdateWhatsNew';
import { buildCatalogSnapshot, writeSeenRelease } from '../../utils/whatsNewDiff';
import type { Machine } from '../../types';

const desktopUpdaterMock = vi.hoisted(() => ({
  value: {
    isElectron: false,
    isDesktop: false,
    status: 'idle',
    version: '2.5.6',
    latestVersion: null,
    releaseNotes: null,
    progressPercent: 0,
    errorMessage: null,
    retryTimeoutSeconds: null,
    checkForUpdates: vi.fn(),
    quitAndInstall: vi.fn(),
  } as Record<string, unknown>,
}));

vi.mock('../../hooks/DesktopUpdateContext', () => ({
  useDesktopUpdate: () => desktopUpdaterMock.value,
}));

const sampleMachine: Machine = {
  id: 'htb-redeye',
  name: 'RedEye',
  ip: '10.10.11.1',
  os: 'Windows',
  platform: 'HTB',
  difficulty: 'Hard',
  status: 'backlog',
  tags: [],
  certifications: [],
  isActive: true,
  timeSpentSeconds: 0,
  createdAt: '2026-11-14T00:00:00.000Z',
  updatedAt: '2026-11-14T00:00:00.000Z',
};

const wrap = (node: React.ReactNode) => (
  <LazyMotion features={domAnimation}>
    <MemoryRouter>{node}</MemoryRouter>
  </LazyMotion>
);

describe('UpdateAvailableModal & WhatsNewModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    desktopUpdaterMock.value = {
      isElectron: false,
      isDesktop: false,
      status: 'idle',
      version: '2.5.6',
      latestVersion: null,
      releaseNotes: null,
      progressPercent: 0,
      errorMessage: null,
      retryTimeoutSeconds: null,
      checkForUpdates: vi.fn(),
      quitAndInstall: vi.fn(),
    };
    useUpdateUiStore.setState({
      updateAvailableOpen: false,
      webUpdateWaiting: false,
      webReloadAction: null,
      whatsNewOpen: false,
      whatsNewPayload: null,
    });
    useExamStore.setState({ status: 'idle' });
    useCtfStore.setState({
      machines: [sampleMachine],
      isCatalogLoaded: true,
      selectedMachineId: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders desktop update notes and triggers quitAndInstall on primary CTA', () => {
    const quitAndInstall = vi.fn();
    desktopUpdaterMock.value = {
      ...desktopUpdaterMock.value,
      isDesktop: true,
      status: 'downloaded',
      version: '2.5.6',
      latestVersion: '2.6.0',
      releaseNotes: '- Added Exam Pivot Graph\n- Faster offline catalog startup',
      quitAndInstall,
    };
    useUpdateUiStore.getState().openUpdateAvailable();

    render(wrap(<UpdateAvailableModal />));

    expect(screen.getByRole('dialog', { name: /ZeroBox v2\.6\.0 is ready/i })).toBeDefined();
    expect(screen.getByText('Added Exam Pivot Graph')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Update and restart/i }));
    expect(quitAndInstall).toHaveBeenCalledTimes(1);
  });

  it('renders web SW update modal and triggers reload callback on Reload to update', () => {
    const reloadSpy = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        version: '2.5.7',
        highlights: ['Fresh HTB active boxes synced.'],
        machines: { added: [], active: [], retired: [] },
      }),
    } as Response);

    useUpdateUiStore.getState().setWebUpdateReady(reloadSpy, true);
    render(wrap(<UpdateAvailableModal />));

    expect(screen.getByRole('dialog', { name: /A new ZeroBox update is ready/i })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Reload to update/i }));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('renders WhatsNewModal highlights and Added/Now Active/Retired tabs, and opens clicked target', () => {
    useUpdateUiStore.getState().openWhatsNew({
      version: '2.5.6',
      previousVersion: '2.5.5',
      releasedAt: '2026-11-23',
      catalogAsOf: '2026-11-17',
      activePoolCount: 20,
      highlights: ['New Target & AD credentials HUD in Session popover.'],
      added: [{ id: 'pg-alpha', name: 'AlphaPG', platform: 'PG', difficulty: 'Easy' }],
      active: [{ id: 'htb-redeye', name: 'RedEye', platform: 'HTB', difficulty: 'Hard' }],
      retired: [{ id: 'htb-old', name: 'OldBox', platform: 'HTB', difficulty: 'Medium' }],
      source: 'auto',
    });

    render(wrap(<WhatsNewModal />));

    expect(screen.getByRole('dialog', { name: /What's new in ZeroBox/i })).toBeDefined();
    expect(screen.getByText('New Target & AD credentials HUD in Session popover.')).toBeDefined();
    expect(screen.getByText('AlphaPG')).toBeDefined();

    fireEvent.click(screen.getByRole('tab', { name: /Now Active/i }));
    const activeChip = screen.getByRole('button', { name: /RedEye/i });
    fireEvent.click(activeChip);

    expect(useUpdateUiStore.getState().whatsNewOpen).toBe(false);
    expect(useCtfStore.getState().selectedMachineId).toBe('htb-redeye');
  });

  it('defers automatic What’s New popup while an Exam Simulator session is running', async () => {
    const prev = buildCatalogSnapshot([sampleMachine], '2.5.0');
    writeSeenRelease(prev);
    useExamStore.setState({ status: 'running' });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        version: '2.5.6',
        highlights: ['Exam safe'],
        machines: { added: [], active: [], retired: [] },
      }),
    } as Response);

    const Harness: React.FC = () => {
      usePostUpdateWhatsNew(true);
      return null;
    };

    const { rerender } = render(wrap(<Harness />));
    expect(useUpdateUiStore.getState().whatsNewOpen).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();

    // Once the exam pauses/ends, What's New opens automatically
    act(() => {
      useExamStore.setState({ status: 'paused' });
    });
    rerender(wrap(<Harness />));

    await waitFor(() => expect(useUpdateUiStore.getState().whatsNewOpen).toBe(true));
  });

  it('still opens automatic What’s New under React.StrictMode and mid-fetch re-renders without swallowing the popup', async () => {
    const prev = buildCatalogSnapshot([sampleMachine], '2.5.0');
    writeSeenRelease(prev);

    let resolveFetch!: (res: Response) => void;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const Harness: React.FC<{ tick: number }> = ({ tick }) => {
      usePostUpdateWhatsNew(tick >= 0);
      return null;
    };

    const { rerender } = render(
      <React.StrictMode>
        {wrap(<Harness tick={0} />)}
      </React.StrictMode>,
    );

    // Mid-fetch re-render while manifest request is still in flight
    rerender(
      <React.StrictMode>
        {wrap(<Harness tick={1} />)}
      </React.StrictMode>,
    );

    expect(fetchSpy).toHaveBeenCalled();
    expect(useUpdateUiStore.getState().whatsNewOpen).toBe(false);

    await act(async () => {
      resolveFetch({
        ok: true,
        json: async () => ({
          version: '2.5.6',
          highlights: ['StrictMode safe release notes'],
          machines: { added: [], active: [], retired: [] },
        }),
      } as Response);
    });

    await waitFor(() => expect(useUpdateUiStore.getState().whatsNewOpen).toBe(true));
    expect(useUpdateUiStore.getState().whatsNewPayload?.highlights).toEqual(['StrictMode safe release notes']);
  });
});
