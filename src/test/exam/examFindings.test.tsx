/**
 * examFindings.test.tsx
 * Structured findings: store CRUD + persistence, report Findings Summary, editor UI.
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ExamFindingsEditor } from '../../components/exam/ExamFindingsEditor';
import { ExamReportModal } from '../../components/exam/ExamReportModal';
import { EXAM_STORAGE_KEY, useExamStore } from '../../store/examStore';
import { generateExamReportHtml, generateExamReportMarkdown } from '../../utils/examReportGenerator';
import type { ExamSessionState, ScreenshotProof } from '../../utils/examComplianceUtils';
import type { Finding } from '../../types/findings';
import { FakeIndexedDb, installFakeIndexedDb } from './fakeIndexedDb';
import { createScreenshotProof } from '../../utils/examProofImages';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

let idb: FakeIndexedDb;

const store = () => useExamStore.getState();
const persisted = () => JSON.parse(localStorage.getItem(EXAM_STORAGE_KEY) || '{}');

function shot(id: string): ScreenshotProof {
  return { id, dataUrl: PNG_DATA_URL, caption: `caption ${id}`, timestamp: '2026-01-01T00:00:00.000Z' };
}

function sessionWith(findings: Finding[]): ExamSessionState {
  const s = store();
  return {
    id: s.id,
    track: s.track,
    candidateName: 'Tester',
    candidateCallsign: 'tester',
    osid: 'OS-1',
    examStartedAt: Date.UTC(2026, 0, 1),
    examDurationSeconds: s.totalDurationSeconds,
    examExpiresAt: null,
    isTimerRunning: false,
    timerPausedRemainingSeconds: null,
    boxes: s.boxes,
    scratchNotes: '',
    findings,
  };
}

const finding = (over: Partial<Finding>): Finding => ({
  id: 'f',
  title: 'T',
  severity: 'info',
  affectedHosts: [],
  description: 'desc',
  evidenceRefs: [],
  ...over,
});

beforeEach(() => {
  idb = installFakeIndexedDb();
  localStorage.clear();
  store().resetExam('OSCP');
});

afterEach(() => {
  idb.uninstall();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('findings store', () => {
  it('starts empty and supports add / update / delete', () => {
    expect(store().findings).toEqual([]);

    const id = store().addFinding({ title: 'SQLi', severity: 'high', affectedHosts: ['web01'] });
    expect(store().findings).toHaveLength(1);
    expect(store().findings[0]).toMatchObject({ id, title: 'SQLi', severity: 'high', evidenceRefs: [], description: '' });

    store().updateFinding(id, { title: 'SQL injection', cvssVector: 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', cvssScore: 9.8 });
    expect(store().findings[0]).toMatchObject({ id, title: 'SQL injection', cvssScore: 9.8, severity: 'high' });

    const other = store().addFinding();
    expect(other).not.toBe(id);
    store().deleteFinding(id);
    expect(store().findings.map((f) => f.id)).toEqual([other]);
  });

  it('persists findings in the localStorage payload (version unchanged) and survives rehydrate', async () => {
    store().addFinding({ title: 'Persisted', severity: 'medium' });
    const raw = persisted();
    expect(raw.version).toBe(1);
    expect(raw.state.findings).toHaveLength(1);
    expect(raw.state.findings[0].title).toBe('Persisted');

    const payload = localStorage.getItem(EXAM_STORAGE_KEY)!;
    useExamStore.setState({ findings: [] });
    localStorage.setItem(EXAM_STORAGE_KEY, payload);
    await act(async () => {
      await useExamStore.persist.rehydrate();
    });
    expect(store().findings.map((f) => f.title)).toEqual(['Persisted']);
  });

  it('rehydrates an older payload without findings as an empty list', async () => {
    store().addFinding({ title: 'x' });
    const legacy = JSON.parse(localStorage.getItem(EXAM_STORAGE_KEY)!);
    delete legacy.state.findings;
    store().resetExam('OSCP');
    localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify(legacy));

    await act(async () => {
      await useExamStore.persist.rehydrate();
    });
    expect(store().findings).toEqual([]);
    expect(store().addFinding({ title: 'after' })).toBeTruthy();
  });

  it('resetExam starts a fresh session with no findings', () => {
    store().addFinding({ title: 'gone' });
    store().resetExam('OSCP');
    expect(store().findings).toEqual([]);
  });
});

describe('report Findings Summary', () => {
  const findings = [
    finding({ id: 'a', title: 'Low thing', severity: 'low', cvssScore: 3.1, cvssVector: 'AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N' }),
    finding({ id: 'b', title: 'Crit | pipe', severity: 'critical', cvssScore: 9.8, cvssVector: 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', affectedHosts: ['web01', 'db01'] }),
    finding({ id: 'c', title: 'Info thing', severity: 'info' }),
    finding({ id: 'd', title: 'High thing', severity: 'high', cvssScore: 7.8 }),
  ];

  it('omits the section when there are no findings', () => {
    const md = generateExamReportMarkdown(sessionWith([]));
    expect(md).not.toContain('Findings Summary');
    expect(md).not.toContain('Detailed Findings');
  });

  it('renders a severity-sorted summary table and per-finding sections', () => {
    const md = generateExamReportMarkdown(sessionWith(findings));
    const rows = md
      .split('\n')
      .filter((l) => /^\| \d+ \|/.test(l) && /(CRITICAL|HIGH|MEDIUM|LOW|INFO) \|/.test(l));
    expect(rows).toEqual([
      '| 1 | Crit / pipe | CRITICAL | 9.8 | web01, db01 |',
      '| 2 | High thing | HIGH | 7.8 | N/A |',
      '| 3 | Low thing | LOW | 3.1 | N/A |',
      '| 4 | Info thing | INFO | N/A | N/A |',
    ]);
    expect(md).toContain('| # | Finding | Severity | CVSS | Affected Hosts |');
    expect(md.indexOf('### 2B.1 Crit / pipe')).toBeGreaterThan(-1);
    expect(md.indexOf('### 2B.1')).toBeLessThan(md.indexOf('### 2B.2 High thing'));
    expect(md).toContain('`AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`');
    // sits between section 2 and section 3
    expect(md.indexOf('## 2A. Findings Summary')).toBeGreaterThan(md.indexOf('## 1. Executive Summary'));
    expect(md.indexOf('## 2A. Findings Summary')).toBeLessThan(md.indexOf('## 3. Candidate'));
  });

  it('embeds resolved evidence images and skips unknown evidence ids; HTML renders the table', async () => {
    const boxId = store().boxes[0].id;
    const created = await createScreenshotProof(boxId, 'user', { ...shot('sc_ev'), dataUrl: PNG_DATA_URL });
    store().addScreenshot(boxId, 'user', created);
    const f = finding({ id: 'e', title: 'With evidence', severity: 'high', evidenceRefs: ['sc_ev', 'sc_nope'] });

    const { hydrateBoxesWithProofImages } = await import('../../utils/examProofImages');
    const boxes = await hydrateBoxesWithProofImages(store().boxes);
    const session = { ...sessionWith([f]), boxes };

    const md = generateExamReportMarkdown(session);
    const section = md.slice(md.indexOf('## 2B. Detailed Findings'), md.indexOf('## 3. Candidate'));
    expect(section).toContain(`![caption sc_ev](${PNG_DATA_URL})`);
    expect(section).not.toContain('sc_nope');

    const noImages = generateExamReportMarkdown(session, { includeScreenshots: false });
    expect(noImages.slice(noImages.indexOf('## 2B.'), noImages.indexOf('## 3. Candidate'))).not.toContain('base64');

    const html = generateExamReportHtml(session);
    expect(html).toContain('Findings Summary');
    expect(html).toContain('<table>');
  });
});

describe('ExamFindingsEditor', () => {
  it('adds a finding, derives score + severity from the CVSS vector, picks hosts and evidence', () => {
    const boxes = store().boxes;
    store().addScreenshot(boxes[0].id, 'user', shot('sc_ui'));
    render(<ExamFindingsEditor boxes={useExamStore.getState().boxes} />);

    fireEvent.click(screen.getByTestId('finding-add-btn'));
    const form = screen.getByTestId('finding-form');

    fireEvent.change(within(form).getByLabelText('Title'), { target: { value: 'Unauth RCE' } });

    fireEvent.change(within(form).getByTestId('finding-cvss-vector'), { target: { value: 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:' } });
    expect(within(form).getByTestId('finding-cvss-vector')).toHaveAttribute('aria-invalid', 'true');
    expect(within(form).getByTestId('finding-cvss-result').textContent).toContain('Invalid vector');

    fireEvent.change(within(form).getByTestId('finding-cvss-vector'), { target: { value: 'AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H' } });
    expect(within(form).getByTestId('finding-cvss-result').textContent).toContain('Score 10.0 (critical)');
    const severity = within(form).getByTestId('finding-severity') as HTMLSelectElement;
    expect(severity.value).toBe('critical');
    expect(severity).toBeDisabled();

    // Evidence only appears once the host is selected
    expect(screen.queryByTestId('finding-evidence-sc_ui')).toBeNull();
    fireEvent.click(within(form).getByTestId(`finding-host-${boxes[0].id}`));
    fireEvent.click(screen.getByTestId('finding-evidence-sc_ui'));

    const saved = store().findings[0];
    expect(saved).toMatchObject({
      title: 'Unauth RCE',
      severity: 'critical',
      cvssScore: 10,
      cvssVector: 'AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
      affectedHosts: [boxes[0].name],
      evidenceRefs: ['sc_ui'],
    });

    // Deselecting the host drops that host's evidence
    fireEvent.click(within(form).getByTestId(`finding-host-${boxes[0].id}`));
    expect(store().findings[0].evidenceRefs).toEqual([]);

    // Clearing the vector re-enables manual severity
    fireEvent.change(within(form).getByTestId('finding-cvss-vector'), { target: { value: '' } });
    expect(store().findings[0].cvssScore).toBeUndefined();
    expect(within(form).getByTestId('finding-severity')).not.toBeDisabled();
  });

  it('requires a second click to delete', () => {
    const id = store().addFinding({ title: 'Doomed' });
    render(<ExamFindingsEditor boxes={store().boxes} />);
    fireEvent.click(screen.getByTestId(`finding-delete-${id}`));
    expect(store().findings).toHaveLength(1);
    fireEvent.click(screen.getByTestId(`finding-delete-confirm-${id}`));
    expect(store().findings).toHaveLength(0);
  });
});

describe('ExamReportModal findings + bundle button', () => {
  it('shows the editor and includes stored findings in the raw markdown', async () => {
    store().addFinding({ title: 'Modal finding', severity: 'high' });
    render(<ExamReportModal isOpen onClose={() => {}} />);
    expect(screen.getByTestId('exam-findings-editor')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('report-tab-raw'));
    await waitFor(() => expect(screen.getByTestId('report-raw-markdown').textContent).toContain('Modal finding'));
  });

  it('disables the bundle button while proof images resolve', async () => {
    const boxId = store().boxes[0].id;
    store().addScreenshot(boxId, 'user', await createScreenshotProof(boxId, 'user', { ...shot('sc_gate'), dataUrl: PNG_DATA_URL }));
    let release!: () => void;
    idb.gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    render(<ExamReportModal isOpen onClose={() => {}} />);
    expect(screen.getByTestId('report-download-bundle-btn')).toBeDisabled();
    release();
    await waitFor(() => expect(screen.getByTestId('report-download-bundle-btn')).not.toBeDisabled());
  });
});
