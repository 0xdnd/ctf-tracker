import { describe, it, expect } from 'vitest';
import { toMermaid } from './mermaidExport';

describe('toMermaid', () => {
  it('emits graph LR with sanitized stable ids', () => {
    const out = toMermaid(
      [
        { id: 'a-1', label: 'Web', ip: '10.0.0.1' },
        { id: 'a_1', label: 'Clash' },
        { id: '9', label: 'Num' },
      ],
      [{ source: 'a-1', target: 'a_1' }],
    );
    expect(out).toBe(
      ['graph LR', '  a_1["Web (10.0.0.1)"]', '  a_1_2["Clash"]', '  n_9["Num"]', '  a_1 --> a_1_2'].join('\n'),
    );
  });
  it('escapes labels', () => {
    const out = toMermaid([{ id: 'x', label: 'a"b`c<d>\ne' }], []);
    expect(out).toContain('x["abcd e"]');
  });
  it('uses dashed arrows for non-confirmed statuses and labels', () => {
    const out = toMermaid(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      [
        { source: 'a', target: 'b', status: 'failed' },
        { source: 'a', target: 'b', label: 'ssh', status: 'success' },
        { source: 'a', target: 'b', label: 'x"y', status: 'blocked' },
      ],
    );
    expect(out).toContain('a -.-> b');
    expect(out).toContain('a -->|"ssh"| b');
    expect(out).toContain('a -. "xy" .-> b');
  });
});
