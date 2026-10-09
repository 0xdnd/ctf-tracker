import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import JSZip from 'jszip';
import { useExamStore } from '../../store/examStore';
import { buildSubmissionBundle } from '../../utils/examSubmissionBundle';
import { createScreenshotProof, dataUrlToBlob } from '../../utils/examProofImages';
import { deleteProofImageBlobs } from '../../utils/indexedDbDeepStorage';
import type { ExamSessionState } from '../../utils/examComplianceUtils';
import { FakeIndexedDb, installFakeIndexedDb } from './fakeIndexedDb';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const PNG_DATA_URL = `data:image/png;base64,${PNG_BASE64}`;
const PNG_BYTES = Uint8Array.from(Buffer.from(PNG_BASE64, 'base64'));
const JPEG_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

let idb: FakeIndexedDb;
const store = () => useExamStore.getState();

function session(): ExamSessionState {
  const s = store();
  return {
    id: s.id,
    track: 'OSCP',
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
    findings: s.findings,
  };
}

beforeEach(() => {
  idb = installFakeIndexedDb();
  localStorage.clear();
  store().resetExam('OSCP');
});

afterEach(() => {
  idb.uninstall();
  localStorage.clear();
});

describe('buildSubmissionBundle', () => {
  it('writes report, proofs resolved from IndexedDB, findings.json and README', async () => {
    const box = store().boxes[0];
    // (1) IndexedDB-backed screenshot (ref only), (2) legacy inline JPEG on the root proof
    const refShot = await createScreenshotProof(box.id, 'user', {
      id: 'sc_ref',
      dataUrl: PNG_DATA_URL,
      caption: 'user proof',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    expect(refShot.imageRef).toBeTruthy();
    expect(refShot.dataUrl).toBeUndefined();
    store().addScreenshot(box.id, 'user', refShot);
    store().addScreenshot(box.id, 'root', {
      id: 'sc_inline',
      dataUrl: JPEG_DATA_URL,
      caption: 'root proof',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    store().addFinding({
      title: 'Critical RCE',
      severity: 'critical',
      cvssVector: 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
      cvssScore: 9.8,
      affectedHosts: [box.name],
      evidenceRefs: ['sc_ref', 'sc_inline'],
    });
    store().addFinding({ title: 'Minor info leak', severity: 'low' });

    const result = await buildSubmissionBundle(session(), { includeScreenshots: true });
    expect(result.missingImages).toBe(0);

    const zip = await JSZip.loadAsync(result.data);
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir).sort();
    const dir = box.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
    expect(names).toEqual(
      [
        'README.txt',
        'findings.json',
        `proofs/${dir}/root-1.jpg`,
        `proofs/${dir}/user-1.png`,
        'report.html',
        'report.md',
      ].sort()
    );
    expect([...result.files].sort()).toEqual(names);

    // Proof image bytes survive the IndexedDB -> zip round trip.
    const pngBytes = await zip.file(`proofs/${dir}/user-1.png`)!.async('uint8array');
    expect(Array.from(pngBytes)).toEqual(Array.from(PNG_BYTES));
    const expectedBlob = dataUrlToBlob(PNG_DATA_URL)!;
    expect(pngBytes.length).toBe(expectedBlob.size);

    const md = await zip.file('report.md')!.async('string');
    expect(md).toContain(`![user proof](proofs/${dir}/user-1.png)`);
    expect(md).not.toContain('base64');
    expect(md.indexOf('Critical RCE')).toBeLessThan(md.indexOf('Minor info leak'));

    const html = await zip.file('report.html')!.async('string');
    expect(html).toContain(PNG_DATA_URL);
    expect(html).toContain('Findings Summary');

    const findings = JSON.parse(await zip.file('findings.json')!.async('string'));
    expect(findings.findings.map((f: { title: string }) => f.title)).toEqual(['Critical RCE', 'Minor info leak']);
    expect(findings.findings[0].evidenceFiles).toEqual([`proofs/${dir}/user-1.png`, `proofs/${dir}/root-1.jpg`]);

    const readme = await zip.file('README.txt')!.async('string');
    expect(readme).toContain('PDF');
    expect(readme).toContain('.7z');
    expect(readme).toContain('OffSec');
  });

  it('skips unresolvable images and reports them instead of failing', async () => {
    const box = store().boxes[0];
    const refShot = await createScreenshotProof(box.id, 'user', {
      id: 'sc_gone',
      dataUrl: PNG_DATA_URL,
      caption: 'gone',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    store().addScreenshot(box.id, 'user', refShot);
    await deleteProofImageBlobs([refShot.imageRef!]);

    const result = await buildSubmissionBundle(session());
    expect(result.missingImages).toBe(1);
    expect(result.files.some((f) => f.startsWith('proofs/'))).toBe(false);
    const zip = await JSZip.loadAsync(result.data);
    expect(await zip.file('README.txt')!.async('string')).toContain('1 proof image(s) could not be loaded');
  });

  it('works with no findings and no proofs', async () => {
    const result = await buildSubmissionBundle(session());
    const zip = await JSZip.loadAsync(result.data);
    expect(Object.keys(zip.files).sort()).toEqual(['README.txt', 'findings.json', 'report.html', 'report.md']);
    expect(JSON.parse(await zip.file('findings.json')!.async('string')).findings).toEqual([]);
  });
});
