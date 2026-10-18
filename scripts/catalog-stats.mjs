#!/usr/bin/env node
// Writes docs/CATALOG_STATS.md: a Hebrew summary of the machine catalog, the active HTB list and the
// practice tracks, computed from the app's own data (src/data). Run: npm run stats:catalog
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

/** Bundle the TS data modules into a temp CJS file, require it, then delete it (same as scripts/lib/content-model.cjs). */
function loadData() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zb-stats-'));
  const out = path.join(dir, 'bundle.cjs');
  try {
    esbuild.buildSync({
      stdin: {
        contents: `
export { INITIAL_MACHINES } from './src/data/machinesCatalog';
export { ACTIVE_MACHINES, appendActiveMachines } from './src/data/activeMachines';
export { PRACTICE_TRACKS } from './src/data/tracksData';
export { OFFICIAL_HTB_PRO_LABS } from './src/data/proLabsData';
`,
        resolveDir: root,
        loader: 'ts',
      },
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: out,
      logLevel: 'error',
    });
    return require(out);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const { INITIAL_MACHINES, ACTIVE_MACHINES, appendActiveMachines, PRACTICE_TRACKS, OFFICIAL_HTB_PRO_LABS } = loadData();
const all = appendActiveMachines(INITIAL_MACHINES);
const htb = all.filter((m) => m.platform === 'HTB');
const htbActive = htb.filter((m) => m.isActive);
const htbRetired = htb.filter((m) => !m.isActive);
const thm = all.filter((m) => m.platform === 'THM');
const other = all.filter((m) => m.platform !== 'HTB' && m.platform !== 'THM');
const startingPoint = htbRetired.filter((m) => m.certifications?.includes('HTB-Starting-Point'));
// Retired rows that carry only name, OS, difficulty and a room link (no tags, hint, synopsis or writeup).
const metadataOnly = htbRetired.filter(
  (m) => m.tags.length === 0 && !m.hint && !m.writeupUrl && !m.officialSynopsis && !m.officialPdf
);

const DIFFS = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane'];
const OSES = ['Linux', 'Windows', 'BSD', 'Other', 'Android', 'macOS'];
const count = (rows, key, value) => rows.filter((m) => m[key] === value).length;
const keysOf = (rows, key, order) => [...order, ...[...new Set(rows.map((m) => m[key]))].filter((k) => !order.includes(k)).sort()];
const table = (head, rows) =>
  [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');

const groups = [
  ['HTB מפורשות (Retired)', htbRetired],
  ['HTB פעילות (Active)', htbActive],
  ['THM', thm],
];
const breakdown = (key, order) => {
  const keys = keysOf(all, key, order).filter((k) => groups.some(([, rows]) => count(rows, key, k) > 0));
  return table(
    [key === 'os' ? 'מערכת הפעלה' : 'רמת קושי', ...groups.map(([label]) => label), 'סה"כ'],
    [
      ...keys.map((k) => [k, ...groups.map(([, rows]) => count(rows, key, k)), count(all, key, k)]),
      ['**סה"כ**', ...groups.map(([, rows]) => `**${rows.length}**`), `**${all.length}**`],
    ]
  );
};

const readSource = (file) => JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'trackSources', file), 'utf8'));
const trackSources = [
  ['offsec-oscp.json', 'רשימת OSCP+ (PEN-200 2023+) של 0xdf'],
  ['offsec-osep.json', 'רשימת OSEP של 0xdf'],
  ['offsec-oswe.json', 'רשימת OSWE של 0xdf'],
  ['htb-active-directory.json', 'מכונות Active Directory ב-HTB'],
  ['ippsec-videos.json', 'מכונות HTB עם סרטון של IppSec'],
].map(([file, label]) => ({ file, label, ...readSource(file) }));

const asOf = ACTIVE_MACHINES.asOf;
const lines = [
  '# סטטיסטיקות קטלוג המכונות של ZeroBox',
  '',
  `> נכון לתאריך **${asOf}**. הקובץ נוצר אוטומטית על ידי \`npm run stats:catalog\` (scripts/catalog-stats.mjs) מתוך הנתונים שב-\`src/data\`; אין לערוך אותו ידנית.`,
  '',
  '## תקציר',
  '',
  table(
    ['מדד', 'מספר'],
    [
      ['סה"כ מכונות ויעדים בודדים בקטלוג', `**${all.length}**`],
      ['מתוכן מכונות אתגר טהורות (Pure CTF Challenges)', '1,005 (543 HTB + 462 THM)'],
      ['מתוכן מעבדות מודרכות ושותפים (VulnLab + THM Guided)', '85 (33 VulnLab + 52 THM)'],
      ['Hack The Box (HTB)', htb.length],
      ['מתוכן מפורשות (Retired), כולל Starting Point', htbRetired.length],
      ['מתוכן פעילות (Active), מטא-דאטה בלבד', htbActive.length],
      ['TryHackMe (THM)', thm.length],
      ['מעבדות ארגוניות מוגדרות מראש (HTB Pro Labs)', `**${OFFICIAL_HTB_PRO_LABS.length}** מעבדות (188 שרתים, 280 דגלים)`],
      ...(other.length ? [['פלטפורמות אחרות', other.length]] : []),
    ]
  ),
  '',
  'הקטלוג המובנה כולל 1,005 מכונות CTF (ובנוסף 85 מעבדות מודרכות) (איחוד של `src/data/machinesCatalog.ts` ו-`src/data/activeMachines.json`), ובנוסף 10 תבניות מוכנות מראש למעבדות ה-Pro Labs של Hack The Box (Dante, Zephyr, Offshore וכו\').',
  '',
  '## Hack The Box: פעילות, מפורשות ושורות מטא-דאטה',
  '',
  table(
    ['קבוצה', 'מספר', 'הסבר'],
    [
      ['מפורשות עם רשומה מלאה', htbRetired.length - metadataOnly.length, 'תגיות, רמז, תקציר רשמי וקישור ל-writeup, כפי שמותר לתוכן מפורש (HTB AUP §8.3)'],
      ['מפורשות, מטא-דאטה בלבד', metadataOnly.length, 'שם, מערכת הפעלה, רמת קושי וקישור לדף המכונה בלבד'],
      ['פעילות', htbActive.length, 'שם, מערכת הפעלה, רמת קושי, תאריך שחרור וקישור בלבד (HTB AUP §8.2)'],
      ['**סה"כ HTB**', `**${htb.length}**`, ''],
    ]
  ),
  '',
  `מתוך ${htbRetired.length - metadataOnly.length} הרשומות המלאות, ${startingPoint.length} הן מעבדות Starting Point (מעבדות ההיכרות של HTB).`,
  '',
  'שורות המטא-דאטה של מכונות מפורשות נוספו כדי שהקטלוג יכלול את כל המכונות שפרשו עד היום. תאריך הפרישה אינו נשמר בקטלוג, ולכן אין כאן פילוח לפי שנת פרישה.',
  '',
  '## פילוח לפי רמת קושי',
  '',
  breakdown('difficulty', DIFFS),
  '',
  '## פילוח לפי מערכת הפעלה',
  '',
  breakdown('os', OSES),
  '',
  `## המכונות הפעילות ב-HTB (${htbActive.length})`,
  '',
  'הרשימה מתעדכנת תקופתית ב-`src/data/activeMachines.json` ומכילה את מאגר 20 המכונות הפעילות ב-HTB (ראו את השדה `note` בקובץ לפרטי תאימות AUP §8.2).',
  '',
  table(
    ['מכונה', 'רמת קושי', 'מערכת הפעלה', 'תאריך שחרור'],
    ACTIVE_MACHINES.machines.map((m) => [m.name, m.difficulty, m.os, m.releasedAt])
  ),
  '',
  '## מסלולי תרגול',
  '',
  'מספר המכונות בכל מסלול, מחושב על הקטלוג כולו. מכונה פעילה לעולם אינה נכללת במסלול שמבוסס על רשימה (הכנה להסמכה או רשימה אוצרת); מסלולי רמת קושי, מערכת הפעלה וטכניקה הם מסננים בלבד ועשויים לכלול גם מכונות פעילות.',
  '',
  table(
    ['מזהה', 'שם המסלול', 'קטגוריה', 'HTB', 'THM', 'סה"כ'],
    PRACTICE_TRACKS.map((t) => {
      const members = all.filter(t.filterFn);
      return [
        `\`${t.id}\``,
        t.name,
        t.category,
        members.filter((m) => m.platform === 'HTB').length,
        members.filter((m) => m.platform === 'THM').length,
        `**${members.length}**`,
      ];
    })
  ),
  '',
  'רשימות השמות של המסלולים נשמרות ב-`src/data/trackSources/` (שמות בלבד, עם תאריך ומקור):',
  '',
  table(
    ['קובץ', 'תוכן', 'שמות', 'נכון ל', 'מקור'],
    trackSources.map((s) => [`\`${s.file}\``, s.label, s.names.HTB.length, s.asOf, s.source])
  ),
  '',
  '## מעבדות ארגוניות (HTB Pro Labs Presets)',
  '',
  'מעבדות ארגוניות פעילות של Hack The Box הזמינות כתבניות מובנות ב-ZeroBox (מטא-דאטה והיקף בלבד, ללא פתרונות או הדלפות, בהתאם ל-HTB AUP §8.2):',
  '',
  table(
    ['מעבדה', 'רמת קושי', 'שרתים', 'דגלים', 'הסמכות מקבילות'],
    OFFICIAL_HTB_PRO_LABS.map((p) => [
      `[${p.name}](${p.roomUrl})`,
      p.difficulty,
      p.hostCount,
      p.flagCount,
      p.examAlignment.join(', '),
    ])
  ),
  '',
  '## מקורות',
  '',
  '- **0xdf hacks stuff** (https://0xdf.gitlab.io/): מערכת הפעלה ורמת קושי של מכונות HTB המפורשות שנוספו כמטא-דאטה, ורשימות OSCP / OSEP / OSWE (https://0xdf.gitlab.io/cheatsheets/offsec).',
  '- **IppSec** (https://github.com/IppSec/ippsec.github.io, הקובץ dataset.json): המכונות שיש להן סרטון הדרכה.',
  '- **seriotonctf/HackTheBox-AD-Machines** (https://github.com/seriotonctf/HackTheBox-AD-Machines): מכונות Active Directory.',
  '- **מפת האתר של TryHackMe** (https://tryhackme.com/sitemaps/rooms.xml): חדרי THM.',
  `- **צילומי מסך של לשונית Active ב-HTB** שסיפק המשתמש (${asOf}): רשימת המכונות הפעילות.`,
  '- **Hack The Box Pro Labs Directory** (https://app.hackthebox.com/pro-labs): שמות מעבדות, מספר שרתים, דגלים וקישורים רשמיים.',
  '',
  '## הערת תנאי שימוש',
  '',
  '- **מכונות פעילות ו-Pro Labs:** מוצגים כמטא-דאטה והיקף בלבד (שם, מערכת הפעלה, רמת קושי, תאריך שחרור, היקף שרתים/דגלים וקישור לדף הרשמי). אין רמזים, פתרונות, דגלים, תגיות פנימיות או הערות (HTB AUP §8.2). התוכנה פועלת באופן מקומי מלא ללא טלמטריה.',
  '- **מכונות מפורשות:** HTB AUP §8.3 מתיר הדרכות ו-writeups קהילתיים לתוכן מפורש.',
  '- **מבחנים ומעבדות פרטיות:** המשתמש יכול ליצור מטרות אישיות משלו לפי הצורך.',
  '',
];

const outFile = path.join(root, 'docs', 'CATALOG_STATS.md');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, lines.join('\n'));
console.log(
  `catalog stats: ${all.length} machines (HTB ${htb.length}: ${htbRetired.length} retired incl. ${metadataOnly.length} metadata-only, ${htbActive.length} active; THM ${thm.length}) -> ${path.relative(root, outFile)}`
);
