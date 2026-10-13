export interface MermaidNode {
  id: string;
  label: string;
  ip?: string;
}
export interface MermaidEdge {
  source: string;
  target: string;
  label?: string;
  status?: string;
}

const DASHED_STATUSES = new Set(['failed', 'blocked', 'potential', 'unverified', 'dead', 'pending']);

function esc(text: string): string {
  return text
    .replace(/[\r\n]+/g, ' ')
    .replace(/["`<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function toMermaid(nodes: MermaidNode[], edges: MermaidEdge[]): string {
  const ids = new Map<string, string>();
  const used = new Set<string>();
  const idFor = (raw: string): string => {
    const existing = ids.get(raw);
    if (existing) return existing;
    let base = raw.replace(/[^A-Za-z0-9_]/g, '_') || 'n';
    if (/^\d/.test(base)) base = `n_${base}`;
    let id = base;
    for (let i = 2; used.has(id); i++) id = `${base}_${i}`;
    used.add(id);
    ids.set(raw, id);
    return id;
  };

  const lines = ['graph LR'];
  for (const n of nodes) {
    const text = esc(n.ip ? `${n.label} (${n.ip})` : n.label) || esc(n.id);
    lines.push(`  ${idFor(n.id)}["${text}"]`);
  }
  for (const e of edges) {
    const dashed = !!e.status && DASHED_STATUSES.has(e.status.toLowerCase());
    const label = e.label ? esc(e.label) : '';
    const arrow = dashed ? (label ? `-. "${label}" .->` : '-.->') : label ? `-->|"${label}"|` : '-->';
    lines.push(`  ${idFor(e.source)} ${arrow} ${idFor(e.target)}`);
  }
  return lines.join('\n');
}
