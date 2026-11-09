export interface ReadinessCheck {
  id: string;
  label: string;
  ok: boolean;
}

export interface WriteupReadiness {
  checks: ReadinessCheck[];
  score: number;
  words: number;
}

const isFenceLine = (line: string) => line.trimStart().startsWith('```');

/**
 * Readiness of a writeup, computed on the content minus the untouched template lines
 * (a multiset subtraction, so a fresh template scores 0%). Code-fence lines are never
 * subtracted; the code check instead counts fenced blocks holding at least one line
 * that is not template text.
 */
export function computeWriteupReadiness(content: string, templateText: string): WriteupReadiness {
  const budget = new Map<string, number>();
  for (const raw of templateText.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim() || isFenceLine(line)) continue;
    budget.set(line, (budget.get(line) ?? 0) + 1);
  }

  const remaining: string[] = [];
  let inFence = false;
  let blockHasOwn = false;
  let ownBlocks = 0;
  for (const raw of content.split('\n')) {
    const line = raw.trimEnd();
    if (isFenceLine(line)) {
      if (inFence && blockHasOwn) ownBlocks += 1;
      inFence = !inFence;
      blockHasOwn = false;
      remaining.push(line);
      continue;
    }
    if (line.trim()) {
      const left = budget.get(line) ?? 0;
      if (left > 0) {
        budget.set(line, left - 1);
        continue;
      }
      if (inFence) blockHasOwn = true;
    }
    remaining.push(line);
  }

  const text = remaining.join('\n');
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean).length;
  const checks: ReadinessCheck[] = [
    { id: 'recon', label: 'Recon & Ports', ok: lower.includes('nmap') || lower.includes('port') },
    { id: 'foothold', label: 'Foothold', ok: lower.includes('foothold') || lower.includes('exploit') || lower.includes('user.txt') },
    { id: 'privesc', label: 'PrivEsc', ok: lower.includes('privilege') || lower.includes('root.txt') || lower.includes('sudo') },
    { id: 'code', label: 'PoC Commands', ok: ownBlocks >= 2 },
    { id: 'depth', label: '250+ Words', ok: words >= 250 },
  ];
  const passed = checks.filter((c) => c.ok).length;
  return { checks, score: Math.round((passed / checks.length) * 100), words };
}
