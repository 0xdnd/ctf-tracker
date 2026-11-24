import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LazyMotion, domAnimation } from 'framer-motion';
import {
  useExamStore,
  getExamBackupSnapshot,
  restoreExamBackupSnapshot,
} from '../../store/examStore';
import { useCtfStore } from '../../store/useCtfStore';
import { ExamPivotGraphPanel } from '../../components/exam/ExamPivotGraphPanel';
import { GraphView } from '../../components/tracker/GraphView';
import { ThemeProvider } from '../../hooks/useTheme';
import type { Machine } from '../../types';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const wrap = (node: React.ReactNode) => (
  <LazyMotion features={domAnimation}>
    <ThemeProvider>{node}</ThemeProvider>
  </LazyMotion>
);

const mkMachine = (over: Partial<Machine> & { id: string; name: string }): Machine => ({
  ip: '10.10.10.10',
  os: 'Linux',
  platform: 'HTB',
  difficulty: 'Medium',
  status: 'backlog',
  tags: [],
  certifications: [],
  timeSpentSeconds: 0,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...over,
});

describe('Stage 3: Exam & Personal Pivot Attack Graph', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    useExamStore.getState().resetExam('OSCP');
    useCtfStore.setState({
      machines: [],
      credentials: [],
      graphEdges: [],
      graphNodePositions: {},
      activeTargetId: null,
      globalVars: {
        lhost: '10.10.14.10',
        lport: '4444',
        targetIp: '10.10.10.10',
        interface: 'tun0',
        domain: '',
        dcIp: '',
        user: '',
        cred: '',
        customVars: {},
      },
    });
  });

  it('persists exam custom internal hosts, edges, and positions, prunes on delete, and resets on resetExam', () => {
    const store = useExamStore.getState();
    store.startExam('OSCP');
    const firstBoxId = useExamStore.getState().boxes[0].id;

    const host = useExamStore.getState().addExamCustomNode({
      name: 'DC01',
      ip: '172.16.1.10',
      os: 'Windows',
      role: 'DC01 / Domain Controller',
      domain: 'corp.local',
      username: 'svc_sql',
      secret: 'Winter2026!',
    });

    useExamStore.getState().setExamGraphNodePosition(host.id, { x: 420, y: 310 });
    const edge = useExamStore.getState().addExamGraphEdge({
      sourceId: firstBoxId,
      targetId: host.id,
      type: 'pivot-ligolo',
      status: 'compromised',
      label: 'Ligolo tun0',
    });

    expect(useExamStore.getState().examCustomNodes).toHaveLength(1);
    expect(useExamStore.getState().examGraphEdges).toHaveLength(1);
    expect(useExamStore.getState().examGraphPositions[host.id]).toEqual({ x: 420, y: 310 });

    // Backup snapshot round-trip preserves pivot graph state
    const snapshot = getExamBackupSnapshot();
    useExamStore.getState().resetExam('OSCP');
    expect(useExamStore.getState().examCustomNodes).toHaveLength(0);
    expect(useExamStore.getState().examGraphEdges).toHaveLength(0);
    expect(useExamStore.getState().examGraphPositions).toEqual({});

    expect(restoreExamBackupSnapshot(snapshot)).toBe(true);
    expect(useExamStore.getState().examCustomNodes.map((n) => n.name)).toEqual(['DC01']);
    expect(useExamStore.getState().examGraphEdges.map((e) => e.id)).toEqual([edge.id]);

    // Deleting custom host removes its attached edges and saved coordinates
    useExamStore.getState().deleteExamCustomNode(host.id);
    expect(useExamStore.getState().examCustomNodes).toHaveLength(0);
    expect(useExamStore.getState().examGraphEdges).toHaveLength(0);
    expect(useExamStore.getState().examGraphPositions[host.id]).toBeUndefined();
  });

  it('renders ExamPivotGraphPanel, adds an internal host with creds, and loads creds into Session HUD', async () => {
    useExamStore.getState().startExam('OSCP');
    render(wrap(<ExamPivotGraphPanel />));

    await waitFor(() => expect(screen.getByTestId('graph-viewport-svg')).toBeDefined());

    fireEvent.click(screen.getByTestId('exam-add-internal-host-btn'));
    fireEvent.change(screen.getByPlaceholderText('DC01 / MS01 / PIVOT-01'), { target: { value: 'INTERNAL-DC01' } });
    fireEvent.change(screen.getByPlaceholderText('172.16.1.10'), { target: { value: '172.16.1.50' } });
    fireEvent.change(screen.getByPlaceholderText('corp.local'), { target: { value: 'exam.local' } });
    fireEvent.change(screen.getByPlaceholderText('svc_sql'), { target: { value: 'svc_backup' } });
    fireEvent.change(screen.getByPlaceholderText('Optional'), { target: { value: 'S3cr3t!' } });
    fireEvent.click(screen.getByRole('button', { name: /Add to pivot graph/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Target machine INTERNAL-DC01' })).toBeDefined());

    const addedId = useExamStore.getState().examCustomNodes[0].id;
    const nodeEl = screen.getByTestId(`attack-node-${addedId}`);
    fireEvent.pointerDown(nodeEl, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(nodeEl, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });

    await waitFor(() => expect(screen.getByTestId('graph-node-creds')).toBeDefined());
    expect(screen.getByText('exam.local\\svc_backup')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Use exam\.local\\svc_backup in Session HUD/i }));
    const vars = useCtfStore.getState().globalVars;
    expect(vars.domain).toBe('exam.local');
    expect(vars.user).toBe('svc_backup');
    expect(vars.cred).toBe('S3cr3t!');
    expect(vars.targetIp).toBe('172.16.1.50');
  });

  it('filters standard Tracker Graph to custom/active/engaged targets when Personal / Engaged is toggled', () => {
    const machines: Machine[] = [
      mkMachine({ id: 'htb-catalog-1', name: 'UntouchedCatalog', status: 'backlog' }),
      mkMachine({ id: 'custom-pivot-1', name: 'PersonalPivot', platform: 'Custom', isCustom: true, status: 'backlog' }),
      mkMachine({ id: 'htb-worked-1', name: 'ActiveBox', status: 'foothold' }),
    ];
    useCtfStore.setState({ machines });

    render(wrap(<GraphView filteredMachines={machines} />));

    expect(screen.getByTestId('attack-node-htb-catalog-1')).toBeDefined();
    expect(screen.getByTestId('attack-node-custom-pivot-1')).toBeDefined();
    expect(screen.getByTestId('attack-node-htb-worked-1')).toBeDefined();

    const toggle = screen.getByTestId('graph-personal-only-btn');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByTestId('attack-node-htb-catalog-1')).toBeNull();
    expect(screen.getByTestId('attack-node-custom-pivot-1')).toBeDefined();
    expect(screen.getByTestId('attack-node-htb-worked-1')).toBeDefined();
  });
});
