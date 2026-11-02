import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SECTION_GUIDES, guideSteps, resolveStep } from './content';
import { guideAvailability, guideTipAvailability } from './guideRegistry';
import { OnboardingLayer } from './OnboardingLayer';
import { useOnboardingStore } from './useOnboardingStore';
import { useCtfStore } from '../store/useCtfStore';
import { useExamStore } from '../store/examStore';
import type { Machine } from '../types';
import examPageSource from '../pages/ExamSimulatorPage.tsx?raw';
import backupModalSource from '../components/backup/BackupModal.tsx?raw';

const machine = (over: Partial<Machine>): Machine => ({ id: 'abc', name: 'Abc', isActive: false, ...over }) as Machine;

const reset = () => {
  window.localStorage.clear();
  useOnboardingStore.getState().cancelLaunch();
  useOnboardingStore.setState({
    tourDone: true,
    dismissedHints: [],
    completedGuides: [],
    tipsOff: false,
    tourActive: false,
    guide: null,
    finishedGuide: null,
    guideCenterOpen: false,
    launchPending: null,
    handsOn: null,
  });
  useExamStore.setState({ status: 'idle' });
  useCtfStore.setState({
    viewMode: 'kanban',
    selectedMachineId: null,
    activeTargetId: null,
    machines: [machine({})],
    isCatalogLoaded: true,
  });
};

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <OnboardingLayer />
    </MemoryRouter>,
  );

const anchors: HTMLElement[] = [];
const addAnchor = (name: string) => {
  const el = document.createElement('div');
  el.setAttribute('data-tour', name);
  el.getBoundingClientRect = () =>
    ({ top: 50, left: 20, width: 80, height: 40, right: 100, bottom: 90, x: 20, y: 50, toJSON: () => ({}) }) as DOMRect;
  document.body.appendChild(el);
  anchors.push(el);
};

beforeEach(reset);
afterEach(() => {
  anchors.splice(0).forEach((el) => el.remove());
});

describe('exam guide availability', () => {
  it('is only available on the setup view, and the reason names the real button', () => {
    expect(guideAvailability('exam').available).toBe(true);
    useExamStore.setState({ status: 'completed' });
    const status = guideAvailability('exam');
    expect(status.available).toBe(false);
    const reason = status.available === false ? status.reason : '';
    expect(reason).toContain('Start new simulation');
    // The button the reason names is the one on the completion view.
    expect(examPageSource).toContain('Start new simulation');
  });

  it('the page tip is not offered after an exam is completed, and comes back on the setup view', () => {
    useExamStore.setState({ status: 'completed' });
    renderAt('/exam');
    expect(screen.queryByTestId('page-hint')).not.toBeInTheDocument();
    act(() => useExamStore.setState({ status: 'idle' }));
    expect(screen.getByRole('region', { name: SECTION_GUIDES.exam.title })).toBeInTheDocument();
  });

  it('page tips honour availability for other guides too', () => {
    // Focus mode is not offered on machines that are still active.
    useCtfStore.setState({ machines: [machine({ isActive: true })] });
    expect(guideTipAvailability('focus', '/target/abc/focus').available).toBe(false);
    renderAt('/target/abc/focus');
    expect(screen.queryByTestId('page-hint')).not.toBeInTheDocument();
  });
});

describe('graph guide restores the view', () => {
  const launchGraph = async () => {
    renderAt('/tracker');
    const first = resolveStep(guideSteps('graph')[0], false);
    addAnchor(first.anchor as string);
    await act(async () => {
      await expect(useOnboardingStore.getState().launchGuide('graph')).resolves.toBe(true);
    });
    expect(useCtfStore.getState().viewMode).toBe('graph');
  };

  it('puts the previous view back when the guide is closed', async () => {
    useCtfStore.setState({ viewMode: 'table' });
    await launchGraph();
    act(() => useOnboardingStore.getState().closeGuide());
    expect(useCtfStore.getState().viewMode).toBe('table');
  });

  it('puts the previous view back when the guide is finished', async () => {
    useCtfStore.setState({ viewMode: 'grid' });
    await launchGraph();
    act(() => useOnboardingStore.getState().completeGuide());
    expect(useCtfStore.getState().viewMode).toBe('grid');
  });

  it('keeps a view the visitor picked during the guide', async () => {
    useCtfStore.setState({ viewMode: 'table' });
    await launchGraph();
    act(() => useCtfStore.getState().setViewMode('kanban'));
    act(() => useOnboardingStore.getState().closeGuide());
    expect(useCtfStore.getState().viewMode).toBe('kanban');
  });

  it('restores a leftover view at the start of the next launch', async () => {
    useCtfStore.setState({ viewMode: 'table' });
    await launchGraph();
    // The guide ended some way that never reached closeGuide: it is simply replaced by another launch.
    await act(async () => {
      await useOnboardingStore.getState().launchGuide('settings');
    });
    expect(useCtfStore.getState().viewMode).toBe('table');
  });

  it('leaves a graph view the visitor already had alone', async () => {
    useCtfStore.setState({ viewMode: 'graph' });
    await launchGraph();
    act(() => useOnboardingStore.getState().closeGuide());
    expect(useCtfStore.getState().viewMode).toBe('graph');
  });
});

describe('reset copy', () => {
  it('says what the reset really clears', () => {
    const step = guideSteps('backup').find((s) => s.id === 'backup-reset');
    expect(step?.body).toMatch(/flags and notes/i);
    expect(step?.body).toMatch(/catalog default/i);
    expect(step?.body).not.toMatch(/clears the progress/i);
    expect(step?.phoneBody).toBeUndefined();
    expect(backupModalSource).toContain('Clears flags and notes and resets every machine to its catalog default.');
  });
});

describe('machine tips need a real machine', () => {
  it('offers no tip over Target not found, including focus mode', () => {
    const a = renderAt('/target/not-a-real-id');
    expect(screen.queryByTestId('page-hint')).not.toBeInTheDocument();
    a.unmount();
    renderAt('/target/not-a-real-id/focus');
    expect(screen.queryByTestId('page-hint')).not.toBeInTheDocument();
  });

  it('still offers the tip for a real machine, by id or by name', () => {
    const a = renderAt('/target/abc');
    expect(screen.getByRole('region', { name: SECTION_GUIDES.machine.title })).toBeInTheDocument();
    a.unmount();
    renderAt('/targets/ABC');
    expect(screen.getByRole('region', { name: SECTION_GUIDES.machine.title })).toBeInTheDocument();
  });

  it('waits for the catalog to load before judging', () => {
    useCtfStore.setState({ isCatalogLoaded: false, machines: [] });
    renderAt('/target/abc');
    expect(screen.queryByTestId('page-hint')).not.toBeInTheDocument();
    act(() => useCtfStore.setState({ isCatalogLoaded: true, machines: [machine({})] }));
    expect(screen.getByRole('region', { name: SECTION_GUIDES.machine.title })).toBeInTheDocument();
  });
});
