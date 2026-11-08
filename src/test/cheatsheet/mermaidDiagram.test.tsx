import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import mermaid from 'mermaid';
import { ObsidianMarkdownBody } from '../../components/cheatsheet/ObsidianMarkdownBody';
import { resetMermaidRenderer } from '../../utils/mermaidRenderer';
import { sanitizeSvg } from '../../utils/securityUtils';
import { useCtfStore } from '../../store/useCtfStore';
import { GlobalVariables } from '../../types';

vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn() },
}));

const mockRender = vi.mocked(mermaid.render);
const mockInitialize = vi.mocked(mermaid.initialize);

const vars: GlobalVariables = {
  lhost: '10.10.14.7',
  lport: '9001',
  targetIp: '10.10.11.5',
  interface: 'tun0',
  customVars: {},
};

const svgFor = (label: string) =>
  `<svg id="zb-mermaid-x" xmlns="http://www.w3.org/2000/svg"><style>#zb-mermaid-x .node rect{fill:#123456;}</style><g class="node"><rect width="10" height="10"></rect><text>${label}</text></g></svg>`;

const fence = (body: string) => '```mermaid\n' + body + '\n```';

const renderBody = (content: string) =>
  render(<ObsidianMarkdownBody content={content} globalVars={vars} soundEnabled={false} />);

type RenderResult = Awaited<ReturnType<typeof mermaid.render>>;

function deferred() {
  let resolve!: (value: RenderResult) => void;
  const promise = new Promise<RenderResult>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('Mermaid diagrams in the reading view', () => {
  beforeEach(() => {
    resetMermaidRenderer();
    mockRender.mockReset();
    mockInitialize.mockReset();
    document.documentElement.classList.remove('dark');
    useCtfStore.setState({ activeTargetId: null, globalVars: vars });
  });

  it('renders a mermaid fence as a sanitized diagram with the source kept for copy', async () => {
    mockRender.mockResolvedValue({ svg: svgFor('Start') } as RenderResult);
    renderBody(fence('graph TD\n  A[Start] --> B'));

    const diagram = await screen.findByTestId('mermaid-diagram');
    expect(diagram.querySelector('svg')).not.toBeNull();
    expect(diagram.querySelector('style')?.textContent).toContain('#zb-mermaid-x');
    expect(diagram.textContent).toContain('Start');
    expect(mockRender).toHaveBeenCalledWith(expect.stringMatching(/^zb-mermaid-\d+$/), 'graph TD\n  A[Start] --> B');
    expect(mockInitialize).toHaveBeenCalledWith(
      expect.objectContaining({ startOnLoad: false, securityLevel: 'strict', htmlLabels: false, theme: 'default' })
    );
    expect(screen.getByText('mermaid')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('strips scripts and event handlers from the rendered svg', async () => {
    mockRender.mockResolvedValue({
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><g onclick="alert(2)"><text>Safe</text></g></svg>',
    } as RenderResult);
    renderBody(fence('graph TD\n  A --> B'));

    const diagram = await screen.findByTestId('mermaid-diagram');
    expect(diagram.querySelector('script')).toBeNull();
    expect(diagram.innerHTML).not.toContain('onclick');
    expect(diagram.textContent).toContain('Safe');
  });

  it('shows the code block and a short error on a syntax error, and removes leftover nodes', async () => {
    mockRender.mockImplementation(async (id: string) => {
      const temp = document.createElement('div');
      temp.id = `d${id}`;
      document.body.appendChild(temp);
      throw new Error('Parse error on line 2:\n...details');
    });
    const { container } = renderBody(fence('graph TD\n  A -->'));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Parse error on line 2:');
    expect(alert.textContent).not.toContain('details');
    expect(container.querySelector('pre')?.textContent).toContain('A -->');
    expect(screen.queryByTestId('mermaid-diagram')).toBeNull();
    expect(document.querySelector('[id^="dzb-mermaid-"]')).toBeNull();
  });

  it('falls back to code when the output needs HTML labels', async () => {
    mockRender.mockResolvedValue({
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>x</div></foreignObject></svg>',
    } as RenderResult);
    const { container } = renderBody(fence('mindmap\n  root'));

    expect((await screen.findByRole('alert')).textContent).toContain('HTML labels');
    expect(container.querySelector('pre')?.textContent).toContain('mindmap');
  });

  it('never applies a stale render after the source changes', async () => {
    const first = deferred();
    const second = deferred();
    mockRender.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { rerender, container } = renderBody(fence('graph TD\n  Old --> X'));
    await waitFor(() => expect(mockRender).toHaveBeenCalledTimes(1));

    rerender(<ObsidianMarkdownBody content={fence('graph TD\n  New --> X')} globalVars={vars} soundEnabled={false} />);
    await act(async () => {
      first.resolve({ svg: svgFor('OLD-SVG') } as RenderResult);
    });
    expect(container.textContent).not.toContain('OLD-SVG');
    expect(screen.queryByTestId('mermaid-diagram')).toBeNull();

    await waitFor(() => expect(mockRender).toHaveBeenCalledTimes(2));
    await act(async () => {
      second.resolve({ svg: svgFor('NEW-SVG') } as RenderResult);
    });
    expect((await screen.findByTestId('mermaid-diagram')).textContent).toContain('NEW-SVG');
    expect(container.textContent).not.toContain('OLD-SVG');
  });

  it('does not fail when unmounted before the render finishes', async () => {
    const pending = deferred();
    mockRender.mockReturnValueOnce(pending.promise);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = renderBody(fence('graph TD\n  A --> B'));
    await waitFor(() => expect(mockRender).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => {
      pending.resolve({ svg: svgFor('LATE') } as RenderResult);
    });
    expect(document.body.textContent).not.toContain('LATE');
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it('re-renders with the dark theme when the document theme changes', async () => {
    mockRender.mockImplementation(async () => ({
      svg: svgFor(document.documentElement.classList.contains('dark') ? 'DARK' : 'LIGHT'),
    }) as RenderResult);
    renderBody(fence('graph TD\n  A --> B'));
    expect((await screen.findByTestId('mermaid-diagram')).textContent).toContain('LIGHT');

    await act(async () => {
      document.documentElement.classList.add('dark');
    });
    await waitFor(() => expect(screen.getByTestId('mermaid-diagram').textContent).toContain('DARK'));
    expect(mockInitialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'dark' }));
    expect(mockRender).toHaveBeenCalledTimes(2);
  });

  it('caches identical diagrams and toggles between diagram and code', async () => {
    mockRender.mockResolvedValue({ svg: svgFor('Cached') } as RenderResult);
    const { container } = renderBody(fence('graph TD\n  A --> B') + '\n\ntext\n\n' + fence('graph TD\n  A --> B'));

    await waitFor(() => expect(screen.getAllByTestId('mermaid-diagram')).toHaveLength(2));
    expect(mockRender).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole('button', { name: 'Code' })[0]);
    expect(screen.getAllByTestId('mermaid-diagram')).toHaveLength(1);
    expect(container.querySelector('pre')?.textContent).toContain('A --> B');
    fireEvent.click(screen.getByRole('button', { name: 'Diagram' }));
    expect(screen.getAllByTestId('mermaid-diagram')).toHaveLength(2);
  });

  it('leaves other fenced languages as plain code blocks', () => {
    const { container } = renderBody('```bash\necho hi\n```');
    expect(container.querySelector('pre')?.textContent).toContain('echo hi');
    expect(screen.queryByTestId('mermaid-diagram')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Code' })).toBeNull();
    expect(mockRender).not.toHaveBeenCalled();
  });
});

describe('sanitizeSvg with mermaid output', () => {
  it('keeps the scoped <style>, ids, markers and marker references', () => {
    const svg =
      '<svg id="zb-mermaid-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<style>#zb-mermaid-1 .edgePath .path{stroke:#333;}</style>' +
      '<defs><marker id="zb-mermaid-1_flowchart-v2-pointEnd" viewBox="0 0 10 10" refX="5" refY="5"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker></defs>' +
      '<path class="flowchart-link" d="M0,0L50,50" marker-end="url(#zb-mermaid-1_flowchart-v2-pointEnd)"></path>' +
      '<g class="node" id="flowchart-A-0"><rect width="20" height="10"></rect><text>A</text></g></svg>';
    const clean = sanitizeSvg(svg);
    const doc = new DOMParser().parseFromString(clean, 'image/svg+xml');

    expect(doc.querySelector('svg')?.getAttribute('id')).toBe('zb-mermaid-1');
    expect(doc.querySelector('style')?.textContent).toContain('#zb-mermaid-1 .edgePath');
    expect(doc.querySelector('marker')?.getAttribute('id')).toBe('zb-mermaid-1_flowchart-v2-pointEnd');
    expect(doc.querySelector('path.flowchart-link')?.getAttribute('marker-end')).toBe(
      'url(#zb-mermaid-1_flowchart-v2-pointEnd)'
    );
    expect(doc.querySelector('#flowchart-A-0')).not.toBeNull();
  });
});
