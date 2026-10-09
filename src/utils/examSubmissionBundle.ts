/**
 * examSubmissionBundle.ts
 * Builds the exam submission bundle (.zip): report.md, report.html, proofs/<box>/<flag>-<n>.<ext>,
 * findings.json and README.txt. Proof images are resolved from IndexedDB via examProofImages.
 *
 * report.md references the proof files by relative path (small, viewer-friendly); report.html embeds
 * the images as data URLs so it stays standalone and can be printed to PDF.
 */

import JSZip from 'jszip';
import type { ExamBox, ExamSessionState, ExamTargetProof, ScreenshotProof } from './examComplianceUtils';
import { hydrateBoxesWithProofImages } from './examProofImages';
import { generateExamReportHtml, generateExamReportMarkdown, type ExamReportOptions } from './examReportGenerator';
import { sortFindingsBySeverity } from './cvss';

export interface SubmissionBundleResult {
  data: Uint8Array;
  /** Paths of every file written to the archive. */
  files: string[];
  /** Screenshots whose image could not be resolved (omitted from the archive). */
  missingImages: number;
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

const slug = (value: string): string =>
  (value || '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');

/** Splits `data:<mime>[;params],<payload>` into mime + bytes payload; null when not an image data URL. */
function parseImageDataUrl(dataUrl: string): { mime: string; base64: boolean; payload: string } | null {
  const match = /^data:(image\/[a-z0-9.+-]+)((?:;[^;,]*)*),(.*)$/is.exec(dataUrl || '');
  if (!match) return null;
  return { mime: match[1].toLowerCase(), base64: /;base64/i.test(match[2]), payload: match[3] };
}

const README_TEXT = (track: string, files: string[], missingImages: number): string =>
  [
    `ZeroBox ${track} exam submission bundle`,
    '='.repeat(40),
    '',
    'Contents',
    '  report.md       Markdown report (proof images referenced from proofs/)',
    '  report.html     Standalone HTML report (images embedded; print to PDF from a browser)',
    '  proofs/         Proof screenshots, one folder per box: <flag>-<n>.<ext>',
    '  findings.json   Structured findings (severity-sorted) with their evidence file paths',
    '',
    'Submission notes',
    '  OSCP requires the report as a PDF inside a .7z archive, per OffSec exam guidelines.',
    '  This tool produces a .zip plus an HTML report that can be printed to PDF:',
    '    1. Open report.html in a browser and use Print > Save as PDF.',
    '    2. Put the PDF in a .7z archive named as OffSec instructs and upload it.',
    '  Always re-check the current OffSec (or your certification provider) requirements before submitting.',
    ...(missingImages > 0
      ? ['', `Warning: ${missingImages} proof image(s) could not be loaded from local storage and are not included.`]
      : []),
    '',
    `Files in this bundle: ${files.length}`,
    '',
  ].join('\n');

/**
 * Builds the bundle. Resolves ref-only screenshots from IndexedDB first; unresolved images are
 * skipped (counted in `missingImages`) rather than failing the whole export.
 */
export async function buildSubmissionBundle(
  session: ExamSessionState,
  options: ExamReportOptions = {}
): Promise<SubmissionBundleResult> {
  const hydrated = await hydrateBoxesWithProofImages(session.boxes);
  const zip = new JSZip();
  const written: string[] = [];
  const addFile = (path: string, content: string | Uint8Array | { base64: string }) => {
    if (typeof content === 'object' && !(content instanceof Uint8Array)) {
      zip.file(path, content.base64, { base64: true });
    } else {
      zip.file(path, content);
    }
    written.push(path);
  };

  let missingImages = 0;
  const usedDirs = new Set<string>();
  const pathByScreenshotId = new Map<string, string>();

  // Boxes copy whose screenshots carry the relative archive path (used for report.md only).
  const markdownBoxes: ExamBox[] = hydrated.map((box) => {
    let dir = slug(box.name) || slug(box.id) || 'box';
    if (usedDirs.has(dir)) dir = `${dir}-${slug(box.id) || usedDirs.size}`;
    usedDirs.add(dir);

    const mapProof = (proof: ExamTargetProof, flag: 'user' | 'root'): ExamTargetProof => {
      if (!proof?.screenshots?.length) return proof;
      const screenshots: ScreenshotProof[] = proof.screenshots.map((sc, i) => {
        const parsed = sc.dataUrl ? parseImageDataUrl(sc.dataUrl) : null;
        if (!parsed) {
          missingImages += 1;
          return sc;
        }
        const path = `proofs/${dir}/${flag}-${i + 1}.${MIME_EXTENSIONS[parsed.mime] || 'bin'}`;
        try {
          addFile(path, parsed.base64 ? { base64: parsed.payload } : new TextEncoder().encode(decodeURIComponent(parsed.payload)));
        } catch {
          missingImages += 1;
          return sc;
        }
        pathByScreenshotId.set(sc.id, path);
        return { ...sc, dataUrl: path };
      });
      return { ...proof, screenshots };
    };
    return { ...box, userProof: mapProof(box.userProof, 'user'), rootProof: mapProof(box.rootProof, 'root') };
  });

  const mdSession: ExamSessionState = { ...session, boxes: markdownBoxes };
  const htmlSession: ExamSessionState = { ...session, boxes: hydrated };

  addFile('report.md', generateExamReportMarkdown(mdSession, options));
  addFile('report.html', generateExamReportHtml(htmlSession, options));

  const track = options.template || session.track || 'OSCP';
  const findings = sortFindingsBySeverity(session.findings || []).map((f) => ({
    ...f,
    evidenceFiles: f.evidenceRefs.map((id) => pathByScreenshotId.get(id)).filter((p): p is string => Boolean(p)),
  }));
  addFile('findings.json', JSON.stringify({ track, findings }, null, 2));

  addFile('README.txt', README_TEXT(track, [...written, 'README.txt'], missingImages));

  const data = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  return { data, files: [...written], missingImages };
}
