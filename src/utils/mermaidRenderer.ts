// Mermaid rendering for the notes reading view. Only ever reached through the lazy
// MermaidDiagram chunk, and mermaid itself is a dynamic import, so neither lands in the entry.
import { sanitizeSvg } from './securityUtils';

export type MermaidTheme = 'dark' | 'default';

type MermaidApi = (typeof import('mermaid'))['default'];

const CACHE_LIMIT = 50;

let mermaidPromise: Promise<MermaidApi> | null = null;
let queue: Promise<unknown> = Promise.resolve();
let initializedTheme: MermaidTheme | null = null;
let counter = 0;
const cache = new Map<string, string>();

function loadMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then(
      (m) => m.default,
      (err) => {
        mermaidPromise = null;
        throw err;
      }
    );
  }
  return mermaidPromise;
}

/** FNV-1a 32-bit hash; enough to key a small render cache. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${(h >>> 0).toString(36)}-${text.length}`;
}

/** Mermaid mounts temporary nodes in <body> while rendering and can leave them behind on errors. */
function removeTempNodes(id: string): void {
  for (const tempId of [id, `d${id}`, `i${id}`]) {
    document.getElementById(tempId)?.remove();
  }
}

/**
 * Render a Mermaid source to sanitized SVG markup. Renders run one at a time through a
 * global queue because mermaid keeps global config and DOM state.
 * Rejects on syntax errors and on output that needs HTML labels (foreignObject is stripped).
 */
export function renderMermaid(source: string, theme: MermaidTheme): Promise<string> {
  const key = hash(`${theme}\u0000${source}`);
  const cached = cache.get(key);
  if (cached !== undefined) return Promise.resolve(cached);

  const job = queue.then(async () => {
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const mermaid = await loadMermaid();
    if (initializedTheme !== theme) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        htmlLabels: false,
        flowchart: { htmlLabels: false },
        theme,
      });
      initializedTheme = theme;
    }
    const id = `zb-mermaid-${++counter}`;
    try {
      const { svg } = await mermaid.render(id, source);
      if (/<foreignObject/i.test(svg)) {
        throw new Error('This diagram type needs HTML labels, which notes do not allow.');
      }
      const clean = sanitizeSvg(svg);
      if (!clean) throw new Error('The diagram produced no drawable output.');
      if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
      cache.set(key, clean);
      return clean;
    } finally {
      removeTempNodes(id);
    }
  });
  queue = job.catch(() => undefined);
  return job;
}

/** Test hook: forget the cache, the loaded module and the initialized theme. */
export function resetMermaidRenderer(): void {
  mermaidPromise = null;
  queue = Promise.resolve();
  initializedTheme = null;
  cache.clear();
}
