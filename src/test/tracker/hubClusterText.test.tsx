import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HubCluster, hubAccessibleName } from '../../components/tracker/graph/HubCluster';
import type { CanvasThemeTokens, ClusterDef, GraphNode } from '../../components/tracker/graph/types';

const tokens = {
  canvasBg: '#000', cardBg: '#111', cardBorder: '#222', cardHoverBorder: '#333', textPrimary: '#fff', textMuted: '#999',
  codeBg: '#101010', codeBorder: '#202020', accent: '#0ff', accentGlow: 'none', gridColor: '#111',
  statusRoot: '#0f0', statusFoothold: '#ff0', statusUnsolved: '#f00',
} as CanvasThemeTokens;

const cluster: ClusterDef = { id: 'c1', name: '10.10.x.x [THM Web]', angle: 0, radius: 100, color: '#abc' };
const nodes = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `n${i}`, name: `M${i}`, status: 'backlog' }) as unknown as GraphNode);

const renderHub = (n: number, textScale: number, portrait = false) =>
  render(
    <svg>
      <HubCluster
        cluster={cluster}
        x={100}
        y={100}
        tokens={tokens}
        isHovered={false}
        collapsible
        expanded={false}
        textScale={textScale}
        portrait={portrait}
        nodes={nodes(n)}
        matchedIds={null}
        onToggle={() => {}}
      />
    </svg>,
  );

describe('HubCluster text', () => {
  it('caps the count font so a three-digit count fits inside the circle', () => {
    const { container } = renderHub(120, 3);
    const count = Array.from(container.querySelectorAll('text')).find((t) => t.textContent === '120');
    expect(count).toBeDefined();
    expect(Number(count!.getAttribute('font-size'))).toBeLessThanOrEqual(17 * 1.4 + 0.01);
  });

  it.each([false, true])('draws plain text without trailing-space hacks (portrait=%s)', (portrait) => {
    const { container } = renderHub(7, 1, portrait);
    const texts = Array.from(container.querySelectorAll('text')).map((t) => t.textContent ?? '');
    for (const t of texts) expect(t).toBe(t.trim());
  });

  it('names the hub group with the shared accessible-name helper', () => {
    renderHub(7, 1);
    const group = screen.getByTestId('graph-hub-c1');
    expect(group).toHaveAttribute('aria-label', hubAccessibleName({ total: 7, label: 'THM Web', badge: '7 machines', expanded: false }));
    expect(group.getAttribute('aria-label')).toBe('7 THM Web 7 machines. Expand');
  });

  it('omits the Expand hint while the hub is open', () => {
    expect(hubAccessibleName({ total: 7, label: 'THM Web', badge: 'Collapse', expanded: true })).toBe('7 THM Web Collapse');
  });

  it.each([false, true])('places SVG <text> outside the role="button" group so label-in-name never mismatches (portrait=%s)', (portrait) => {
    const { container } = renderHub(7, 1, portrait);
    const buttonGroup = screen.getByTestId('graph-hub-c1');
    expect(buttonGroup.querySelectorAll('text').length).toBe(0);
    expect(container.querySelectorAll('text').length).toBe(3);
  });
});
