import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GraphView, AttackNodeCard, getCanvasThemeTokens, GraphNode } from '../../components/tracker/GraphView';
import { useCtfStore, safeLocalStorage, ATTACK_GRAPH_STORAGE_KEY } from '../../store/useCtfStore';
import { Machine } from '../../types';

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

const machine = (over: Partial<Machine> = {}): Machine => ({
  id: 'm1',
  name: 'Forest',
  ip: '10.10.10.161',
  os: 'Windows',
  platform: 'HTB',
  difficulty: 'Medium',
  status: 'backlog',
  tags: [],
  certifications: [],
  timeSpentSeconds: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

const tokens = getCanvasThemeTokens('zerobox', true);

function renderCard(over: Partial<Machine> = {}) {
  const m = machine(over);
  const node: GraphNode = {
    id: m.id,
    name: m.name,
    ip: m.ip,
    os: m.os,
    platform: m.platform,
    difficulty: m.difficulty,
    status: m.status,
    cluster: 'c',
    x: 300,
    y: 300,
    machine: m,
  };
  const { container } = render(
    <svg>
      <AttackNodeCard
        node={node}
        isSelected={false}
        isHovered={false}
        tokens={tokens}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        onPointerDown={vi.fn()}
      />
    </svg>
  );
  return container;
}

describe('Graph node card text is readable at default zoom', () => {
  afterEach(() => cleanup());

  it('uses a 14px name and nothing smaller than 11px', () => {
    const c = renderCard({ openPorts: [22, 80, 443, 8080, 3389] });
    const sizes = Array.from(c.querySelectorAll('text')).map((t) => Number(t.getAttribute('fontSize') ?? t.getAttribute('font-size')));
    expect(sizes.length).toBeGreaterThan(5);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(11);
    const name = Array.from(c.querySelectorAll('text')).find((t) => t.textContent === 'Forest');
    expect(name?.getAttribute('font-size')).toBe('14');
  });

  it('keeps the 180x84 card footprint that layout and edge anchors rely on', () => {
    const c = renderCard();
    const card = c.querySelector('g[data-node-id] > rect[width="180"][height="84"]');
    expect(card).not.toBeNull();
  });

  it('gives a long platform label a wider chip and a shorter name so the row cannot overlap', () => {
    const c = renderCard({ platform: 'VulnHub', name: 'KioptrixLevelOne' });
    const chip = c.querySelector('g[aria-label^="Platform"] rect');
    expect(Number(chip?.getAttribute('width'))).toBeGreaterThanOrEqual(54);
    // 7-char platform leaves ~74px for the name: 8 glyphs including the ellipsis
    expect(screen.getByText('Kioptri…')).toBeInTheDocument();
  });

  it('truncates an over-long IP and drops the colon on five-digit ports so text stays inside its pill', () => {
    const c = renderCard({ ip: '255.255.255.255:8080', openPorts: [65535, 80] });
    expect(screen.getByText('255.255.255.25…')).toBeInTheDocument();
    expect(Array.from(c.querySelectorAll('text')).map((t) => t.textContent)).toEqual(
      expect.arrayContaining(['65535', ':80'])
    );
  });
});

describe('Graph controls use plain labels', () => {
  beforeEach(() => {
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
    const many = Array.from({ length: 60 }, (_, i) => machine({ id: `m${i}`, name: `Box${i}`, ip: `10.10.10.${i + 1}` }));
    useCtfStore.setState({ machines: many, themePreset: 'zerobox' });
  });
  afterEach(() => {
    cleanup();
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
  });

  const renderGraph = () =>
    render(
      <MemoryRouter>
        <GraphView filteredMachines={useCtfStore.getState().machines} />
      </MemoryRouter>
    );

  it('names the heading, counts and toolbar buttons by what they do', () => {
    renderGraph();
    expect(screen.getByText('Machine graph')).toBeInTheDocument();
    expect(screen.getByText('60 of 60 machines')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Group all by subnet' })).toHaveAttribute('title', expect.stringContaining('subnet group'));
    expect(screen.getByRole('button', { name: 'Center on selected machine' })).toHaveAttribute(
      'title',
      expect.stringContaining('selected machine')
    );
    expect(screen.getByRole('button', { name: 'Enter fullscreen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide minimap' })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/BLOODHOUND|TACTICAL RADAR|Engage Target|Fullscreen Attack Topology/);
  });

  it('toggles between the compact layout and the all-by-subnet layout with matching button text', () => {
    renderGraph();
    fireEvent.click(screen.getByRole('button', { name: 'Group all by subnet' }));
    const back = screen.getByRole('button', { name: 'Compact layout' });
    expect(back).toHaveTextContent('Compact layout');
    fireEvent.click(back);
    expect(screen.getByRole('button', { name: 'Group all by subnet' })).toHaveTextContent('Group all by subnet');
  });

  it('labels the selected-machine action by its effect', () => {
    renderGraph();
    fireEvent.click(screen.getByTestId('attack-node-m3'));
    expect(screen.getByRole('button', { name: /Set as active machine/ })).toBeInTheDocument();
  });

  it('shows the minimap toggle as Show minimap once collapsed', () => {
    renderGraph();
    fireEvent.click(screen.getByRole('button', { name: 'Hide minimap' }));
    expect(screen.getByRole('button', { name: 'Show minimap' })).toHaveAttribute('title', 'Show minimap');
  });
});
