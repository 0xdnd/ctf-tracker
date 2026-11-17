// @vitest-environment node
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';
import { EXAM_TRACK_CONFIGS } from '../../utils/examComplianceUtils';

const req = createRequire(import.meta.url);
const { getModel } = req('../../../scripts/lib/content-model.cjs');
const { buildExamSimulatorPage, EXAM_SIM_PATH } = req('../../../scripts/lib/exam-simulator.cjs');
const { NAV, siteFooter } = req('../../../scripts/lib/layout.cjs');

type Row = { id: string; name: string; time: string; report: string; pass: string; layout: string };
const configs = Object.values(EXAM_TRACK_CONFIGS);
const page = buildExamSimulatorPage({
  renderPage: (o: { body: string }) => o.body,
  model: getModel(),
  hasGuide: () => true,
  hasRoute: () => true,
});
const rows = page.rows as Row[];

describe('/oscp-exam-simulator/ ruleset table', () => {
  it('has one row per app ruleset, in the app order', () => {
    expect(rows.map((r) => r.id)).toEqual(configs.map((c) => c.id));
  });

  it('copies name, pass mark and layout from EXAM_TRACK_CONFIGS', () => {
    for (const c of configs) {
      const r = rows.find((x) => x.id === c.id) as Row;
      expect(r.name).toBe(c.name);
      expect(r.layout).toBe(c.targetSummary);
      expect(r.pass).toBe(c.scoringModel === 'objective' ? 'All objectives' : `${c.passThreshold} points`);
      expect(page.html).toContain(c.name);
      expect(page.html).toContain(c.targetSummary);
    }
  });

  it('states every time limit as the exact duration of the ruleset', () => {
    for (const c of configs) {
      const r = rows.find((x) => x.id === c.id) as Row;
      const hours = c.durationSeconds / 3600;
      const days = r.time.match(/^(\d+) days$/);
      const hm = r.time.match(/^(\d+) hours(?: (\d+) min)?$/);
      const total = days ? Number(days[1]) * 24 : hm ? Number(hm[1]) + Number(hm[2] || 0) / 60 : NaN;
      expect(total, `${c.id}: ${r.time}`).toBe(hours);
      expect(r.report).toBe(c.reportWindowSeconds ? `+ ${c.reportWindowSeconds / 3600}h report` : '');
    }
  });
});

describe('/oscp-exam-simulator/ page', () => {
  it('has a title and description inside the SEO limits', () => {
    expect(page.path).toBe(EXAM_SIM_PATH);
    expect(page.title.length).toBeLessThanOrEqual(60);
    expect(page.description.length).toBeLessThanOrEqual(155);
    expect(page.description).toMatch(/[.!?]$/);
    const also = (page.description as string).split('Also ')[1] ?? '';
    expect(also.length).toBeGreaterThan(0);
    expect(also).not.toContain('OSCP');
    expect(also).toContain('CPTS');
  });

  it('launches the app route and links the guides', () => {
    expect(page.html.match(/href="\/exam\/"/g)?.length).toBe(2);
    for (const href of ['/oscp-exam-scoring-and-time-budget/', '/oscp-points-calculator/', '/oscp-report-template/', '/cpts-exam-guide/']) {
      expect(page.html).toContain(`href="${href}"`);
    }
  });

  it('drops guide links whose pages do not exist', () => {
    const bare = buildExamSimulatorPage({ renderPage: (o: { body: string }) => o.body, model: getModel(), hasGuide: () => false, hasRoute: () => false });
    for (const href of ['/oscp-exam-scoring-and-time-budget/', '/oscp-points-calculator/', '/oscp-report-template/', '/cpts-exam-guide/']) {
      expect(bare.html).not.toContain(href);
    }
  });

  it('has at least 250 words of prose', () => {
    const text = (page.html as string).replace(/<table[\s\S]*?<\/table>/g, ' ').replace(/<[^>]+>/g, ' ');
    expect(text.split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(250);
  });
});

describe('site nav and footer', () => {
  it('send "Exam simulator" to the static page, not the app route', () => {
    expect(NAV).toContainEqual(['/oscp-exam-simulator/', 'Exam simulator']);
    expect(NAV.some(([p]: [string]) => p === '/exam/')).toBe(false);
    const footer = siteFooter({ analyticsNote: '' }) as string;
    expect(footer).toContain('href="/oscp-exam-simulator/"');
    expect(footer).not.toContain('href="/exam/"');
  });
});
