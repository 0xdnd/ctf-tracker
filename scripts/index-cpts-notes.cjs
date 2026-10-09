/**
 * index-cpts-notes.cjs
 * Offline developer utility for indexing local markdown notes into JSON schema.
 * Note: Private notes are stored locally in the operator's browser (IndexedDB)
 * and are never bundled into the public repository.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_VAULT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\DANIEL', 'Documents', 'cpts-field-manual');
const DEFAULT_EXPORT_FILE = path.resolve(DEFAULT_VAULT_DIR, 'cpts-notes-vault-export.json');
const REPO_STUB_FILE = path.resolve(__dirname, '..', 'src', 'data', 'cptsNotesIndex.json');

// Parse CLI flags
const args = process.argv.slice(2);
const exportFlagIdx = args.findIndex(a => a === '--export' || a === '-o');
const isForceRepo = args.includes('--force-repo-bundle');

let VAULT_DIR = process.env.OBSIDIAN_VAULT_PATH ? path.resolve(process.env.OBSIDIAN_VAULT_PATH) : DEFAULT_VAULT_DIR;
let OUTPUT_FILE = DEFAULT_EXPORT_FILE;

if (exportFlagIdx !== -1 && args[exportFlagIdx + 1]) {
  OUTPUT_FILE = path.resolve(args[exportFlagIdx + 1]);
} else if (isForceRepo) {
  console.warn('[!] WARNING: Writing to public repository bundle. Ensure ToS compliance!');
  OUTPUT_FILE = REPO_STUB_FILE;
}

const CANONICAL_CATEGORIES = [
  { prefix: '00 _Methodology', friendly: 'Methodology & Exam Playbooks', rank: 0 },
  { prefix: '01 Information Gathering', friendly: 'Information Gathering & Recon', rank: 1 },
  { prefix: '02 Pre-Exploitation', friendly: 'Pre-Exploitation & Vuln Analysis', rank: 2 },
  { prefix: '03 Exploitation', friendly: 'Offensive Exploitation', rank: 3 },
  { prefix: '04 Post-Exploitation', friendly: 'Post-Exploitation & PrivEsc', rank: 4 },
  { prefix: '05 Lateral Movement', friendly: 'Lateral Movement & Pivoting', rank: 5 },
  { prefix: '06 NetExec', friendly: 'NetExec Arsenal', rank: 6 }
];

function getCategoryInfo(normRelPath) {
  const top = normRelPath.split('/')[0];
  const found = CANONICAL_CATEGORIES.find(c => top.startsWith(c.prefix));
  if (found) {
    return { category: found.friendly, rank: found.rank };
  }
  return { category: 'General Methodology', rank: 99 };
}

function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.startsWith('.') || file === 'node_modules') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function cleanSlug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function stripEmoji(s) {
  if (!s) return '';
  return s.replace(/^[\p{Emoji}\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '').trim();
}

function sanitizeText(raw) {
  if (!raw) return '';
  return raw
    .replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1') // [[target|label]] -> label
    .replace(/\|[^\n]+\|/g, '') // remove markdown tables
    .replace(/>\s*\[![^\]]+\][^\n]*/g, '') // remove callout markers
    .replace(/^>\s*/gm, '') // remove blockquotes
    .replace(/[*_#`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCommands(content) {
  const commands = [];
  const seen = new Set();

  function addCmd(c) {
    if (!c) return;
    const trimmed = c.trim();
    if (trimmed.length < 4 || trimmed.length > 280) return;
    if (seen.has(trimmed)) return;
    // Reject markdown tables, wikilinks, Hebrew text, comments, mermaid diagrams
    if (trimmed.includes('|') || trimmed.includes('[[') || trimmed.includes(']]')) return;
    if (/[\u0590-\u05FF]/.test(trimmed)) return;
    if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('<!') || trimmed.startsWith('>')) return;
    if (trimmed.startsWith('graph ') || trimmed.startsWith('flowchart ') || trimmed.startsWith('classDef ') || trimmed.startsWith('subgraph ')) return;
    seen.add(trimmed);
    commands.push(trimmed);
  }

  // 1. Check for bulleted backticks under ### פקודות
  const cmdSectionMatch = content.match(/###\s*פקודות[^\n]*\n([\s\S]*?)(?=\n###|\n##|\n<!--|$)/);
  if (cmdSectionMatch) {
    const lines = cmdSectionMatch[1].split('\n');
    for (const line of lines) {
      const bMatch = line.match(/^-\s*`([^`]+)`/);
      if (bMatch) {
        addCmd(bMatch[1]);
      }
    }
  }

  // 2. Check code blocks with syntax
  const codeBlockRegex = /```(?:bash|sh|powershell|cmd|python|text)?\s*\n([\s\S]*?)```/g;
  let match;
  let cbCount = 0;
  while ((match = codeBlockRegex.exec(content)) !== null && cbCount < 8) {
    cbCount++;
    const codeLines = match[1].split('\n');
    for (const cl of codeLines) {
      addCmd(cl);
      if (commands.length >= 10) break;
    }
    if (commands.length >= 10) break;
  }

  return commands;
}

function extractOutgoingWikilinks(content) {
  const links = [];
  const linkRegex = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;
  let match;
  const seen = new Set();
  while ((match = linkRegex.exec(content)) !== null) {
    const target = match[1].trim();
    if (target && !seen.has(target)) {
      seen.add(target);
      links.push(target);
    }
  }
  return links;
}

function indexVault() {
  if (!VAULT_DIR || !fs.existsSync(VAULT_DIR)) {
    if (!fs.existsSync(OUTPUT_FILE)) {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ notes: [], wikilinkMap: {} }, null, 2), 'utf8');
    }
    return;
  }

  const allMarkdownFiles = walkDir(VAULT_DIR);

  // Canonical ordering: Sort strictly by category rank, then natural alphanumeric filename order
  allMarkdownFiles.sort((a, b) => {
    const relA = path.relative(VAULT_DIR, a).replace(/\\/g, '/');
    const relB = path.relative(VAULT_DIR, b).replace(/\\/g, '/');
    const rankA = getCategoryInfo(relA).rank;
    const rankB = getCategoryInfo(relB).rank;
    if (rankA !== rankB) return rankA - rankB;
    return relA.localeCompare(relB, undefined, { numeric: true, sensitivity: 'base' });
  });

  const notes = [];
  const wikilinkMap = {}; // mapping various query tokens -> note.id

  for (let idx = 0; idx < allMarkdownFiles.length; idx++) {
    const fullPath = allMarkdownFiles[idx];
    const relPath = path.relative(VAULT_DIR, fullPath).replace(/\\/g, '/');
    let content = '';
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch (e) {
      continue;
    }

    const filename = path.basename(fullPath, '.md');
    let fmTitle = filename;
    let tags = [];
    let difficulty = 'Intermediate';
    let noteType = 'Master_Note';
    let dateModified = '';

    // YAML Frontmatter parsing
    if (content.startsWith('---')) {
      const parts = content.split('---');
      if (parts.length >= 3) {
        const fm = parts[1];
        const lines = fm.split('\n');
        for (const line of lines) {
          if (line.startsWith('title:')) {
            fmTitle = line.replace('title:', '').trim().replace(/^['"]|['"]$/g, '');
          } else if (line.startsWith('tags:')) {
            const raw = line.replace('tags:', '').trim().replace(/^\[|\]$/g, '');
            tags = raw.split(',').map((t) => t.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
          } else if (line.startsWith('difficulty:')) {
            difficulty = line.replace('difficulty:', '').trim();
          } else if (line.startsWith('type:')) {
            noteType = line.replace('type:', '').trim();
          } else if (line.startsWith('date_modified:')) {
            dateModified = line.replace('date_modified:', '').trim();
          }
        }
      }
    }

    const h1Match = content.match(/^#\s+(.+)$/m);
    const h1 = h1Match ? h1Match[1].trim() : '';

    const cFm = stripEmoji(fmTitle);
    const cH1 = stripEmoji(h1);

    let titleEn = '';
    let titleHe = '';

    // Check split on | or —
    for (const str of [cH1, cFm]) {
      if (!str) continue;
      const splitParts = str.includes('|') 
        ? str.split('|').map(s => s.trim()) 
        : (str.includes(' — ') ? str.split(' — ').map(s => s.trim()) : [str]);
      for (const part of splitParts) {
        if (/[\u0590-\u05FF]/.test(part) && !titleHe) {
          titleHe = part;
        }
        if (/[a-zA-Z]{3,}/.test(part) && !titleEn) {
          titleEn = part;
        }
      }
    }

    if (!titleEn) titleEn = cFm || filename;

    // Extract stage & tools from metadata callout
    let stage = '';
    let tools = [];
    const metaMatch = content.match(/>\s*\[!example\][^\n]*\n([\s\S]*?)(?=\n> \[|\n\n|\n#|$)/i);
    if (metaMatch) {
      const raw = metaMatch[1];
      const sMatch = raw.match(/שלב:\s*([^·\n]+)/);
      if (sMatch) stage = sMatch[1].replace(/[*_]/g, '').trim();
      const tMatch = raw.match(/כלים:\s*([^·\n]+)/);
      if (tMatch) {
        tools = tMatch[1].replace(/[*_]/g, '').split(/[·,]/).map(t => t.trim()).filter(Boolean);
      }
    }

    // Hebrew Summary Extraction
    let heSummary = '';
    const goalMatch = content.match(/###\s*מטרה מעשית\s*\n+([\s\S]*?)(?=\n+###|\n+<!--|\n+#|$)/);
    if (goalMatch) {
      heSummary = sanitizeText(goalMatch[1]);
    }
    if (!heSummary) {
      const abstractMatch = content.match(/>\s*\[!abstract\][^\n]*\n([\s\S]*?)(?=\n> \[|\n\n|\n#|$)/i);
      if (abstractMatch) {
        heSummary = sanitizeText(abstractMatch[1]);
      }
    }
    if (!heSummary) {
      const heTokenMatch = content.match(/\*\*HE:\*\*\s*([^\n]+)/i);
      if (heTokenMatch) {
        heSummary = sanitizeText(heTokenMatch[1]);
      }
    }

    // English Summary Extraction
    let enSummary = '';
    const enTokenMatch = content.match(/\*\*EN:\*\*\s*([^\n]+)/i);
    if (enTokenMatch) {
      enSummary = sanitizeText(enTokenMatch[1]);
    }

    if (!enSummary) {
      const strippedForSummary = content
        .replace(/^---[\s\S]*?---/, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/%%[\s\S]*?%%/g, '')
        .replace(/`[^`]+`/g, '')
        .replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1')
        .replace(/\|[^\n]+\|/g, '')
        .replace(/>\s*\[![^\]]+\][^\n]*/g, '')
        .replace(/^>\s*/gm, '');

      const lines = strippedForSummary.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 30 && !l.startsWith('#') && !l.startsWith('!') && !l.startsWith('-'));
      
      const candidate = lines.find(l => !/[\u0590-\u05FF]/.test(l));
      if (candidate) {
        enSummary = sanitizeText(candidate).slice(0, 240);
      } else {
        const catClean = getCategoryInfo(relPath).category;
        enSummary = `Tactical offensive methodology and battle-tested commands for ${titleEn} (${catClean}).`;
      }
    }

    const summary = enSummary || heSummary || `${titleEn} execution guide.`;
    const commands = extractCommands(content);
    const pathParts = relPath.split('/');
    const rawCategory = pathParts.length > 1 ? pathParts[0] : 'General';
    const subCategory = pathParts.length > 2 ? pathParts.slice(1, -1).join(' / ') : '';
    const { category, rank } = getCategoryInfo(relPath);

    const slug = cleanSlug(titleEn) || cleanSlug(filename) || `note-${idx}`;
    const noteId = `cpts-${slug}`;
    const hasHebrew = /[\u0590-\u05FF]/.test(content);
    const outgoingWikilinks = extractOutgoingWikilinks(content);

    // Register all resolution aliases in wikilinkMap
    const aliases = [
      filename.toLowerCase(),
      filename.replace(/^\d+[\s_.-]*/, '').trim().toLowerCase(),
      titleEn.toLowerCase(),
      titleEn.replace(/^\d+[\s_.-]*/, '').trim().toLowerCase(),
      slug,
      noteId
    ];
    if (titleHe) {
      aliases.push(titleHe.toLowerCase());
    }

    for (const a of aliases) {
      if (a && !wikilinkMap[a]) {
        wikilinkMap[a] = noteId;
      }
    }

    notes.push({
      id: noteId,
      title: titleEn,
      titleEn,
      titleHe: titleHe || undefined,
      category,
      categoryOrder: rank,
      order: idx,
      rawCategory,
      subCategory,
      tags,
      difficulty,
      noteType: noteType || 'Master_Note',
      dateModified: dateModified || undefined,
      summary,
      enSummary,
      heSummary: heSummary || undefined,
      stage: stage || undefined,
      tools: tools.length > 0 ? tools : undefined,
      hasHebrew,
      commands,
      relPath,
      filename,
      outgoingWikilinks,
      backlinks: [], // computed below
      rawMarkdown: content,
    });
  }

  // Compute backlinks graph
  const noteIdSet = new Set(notes.map(n => n.id));
  const noteMapById = new Map(notes.map(n => [n.id, n]));

  for (const note of notes) {
    for (const rawTarget of note.outgoingWikilinks) {
      const normTarget = rawTarget.trim().toLowerCase();
      const strippedTarget = normTarget.replace(/^\d+[\s_.-]*/, '').trim();
      const targetId = wikilinkMap[normTarget] || wikilinkMap[strippedTarget] || wikilinkMap[cleanSlug(normTarget)];
      if (targetId && targetId !== note.id && noteMapById.has(targetId)) {
        const targetNote = noteMapById.get(targetId);
        if (!targetNote.backlinks.includes(note.id)) {
          targetNote.backlinks.push(note.id);
        }
      }
    }
  }

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  const payload = {
    notes,
    wikilinkMap
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[+] Successfully indexed ${notes.length} Obsidian notes with ${Object.keys(wikilinkMap).length} wikilink aliases into ${path.relative(process.cwd(), OUTPUT_FILE)}`);
}

indexVault();
