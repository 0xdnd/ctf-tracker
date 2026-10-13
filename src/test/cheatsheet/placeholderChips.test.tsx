import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MarkdownEditor } from '../../components/cheatsheet/MarkdownEditor';
import { ObsidianMarkdownBody } from '../../components/cheatsheet/ObsidianMarkdownBody';
import { renderPlaceholderChips } from '../../components/common/PlaceholderChip';
import { splitPlaceholderSegments } from '../../utils/placeholderSegments';
import { useCtfStore } from '../../store/useCtfStore';
import { GlobalVariables } from '../../types';
import { safeCopyToClipboard } from '../../utils/helpers';

vi.mock('../../utils/helpers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/helpers')>()),
  safeCopyToClipboard: vi.fn(() => Promise.resolve(true)),
}));

const vars: GlobalVariables = {
  lhost: '10.10.14.7',
  lport: '9001',
  targetIp: '10.10.11.5',
  interface: 'tun0',
  customVars: {},
};

const unsetVars: GlobalVariables = { ...vars, lhost: '', targetIp: '' };

describe('placeholder segments and chips', () => {
  beforeEach(() => {
    vi.mocked(safeCopyToClipboard).mockClear();
    useCtfStore.setState({ activeTargetId: null, globalVars: vars });
  });

  it('splits text around the ranges resolveTemplate reports', () => {
    const segs = splitPlaceholderSegments('connect to {TARGET} on port 8080', vars);
    expect(segs).toEqual([
      { kind: 'text', text: 'connect to ' },
      { kind: 'placeholder', token: '{TARGET}', name: 'TARGET', value: '10.10.11.5', resolved: true },
      { kind: 'text', text: ' on port 8080' },
    ]);
  });

  it('renders a resolved chip with the token name in its tooltip', () => {
    const { container } = render(<p>{renderPlaceholderChips('echo {LHOST}', vars)}</p>);
    const chip = container.querySelector('[data-placeholder="LHOST"]')!;
    expect(chip.textContent).toBe('10.10.14.7');
    expect(chip.getAttribute('data-resolved')).toBe('true');
    expect(chip.getAttribute('title')).toBe('{LHOST}');
    expect(container.textContent).toBe('echo 10.10.14.7');
  });

  it('renders an unresolved chip in the warning style with the target-bar hint', () => {
    const { container } = render(<p>{renderPlaceholderChips('echo {LHOST} {MISSING_VAR}', unsetVars)}</p>);
    const lhost = container.querySelector('[data-placeholder="LHOST"]')!;
    expect(lhost.getAttribute('data-resolved')).toBe('false');
    expect(lhost.getAttribute('title')).toContain('Set it in the target bar');
    expect(lhost.className).toContain('bg-callout-warn-bg');
    const missing = container.querySelector('[data-placeholder="MISSING_VAR"]')!;
    expect(missing.textContent).toBe('{MISSING_VAR}');
    expect(missing.getAttribute('data-resolved')).toBe('false');
  });
});

describe('ObsidianMarkdownBody inline code and code blocks', () => {
  beforeEach(() => {
    vi.mocked(safeCopyToClipboard).mockClear();
    useCtfStore.setState({ activeTargetId: null, globalVars: vars });
  });

  it('renders backtick spans as <code> with chips inside', () => {
    const { container } = render(
      <ObsidianMarkdownBody content={'Run `connect to {TARGET} on port 8080` first'} globalVars={vars} soundEnabled={false} />
    );
    const code = container.querySelector('p code')!;
    expect(code).not.toBeNull();
    expect(code.textContent).toBe('connect to 10.10.11.5 on port 8080');
    expect(code.querySelector('[data-placeholder="TARGET"]')).not.toBeNull();
    expect(container.querySelector('p')!.textContent).toBe('Run connect to 10.10.11.5 on port 8080 first');
  });

  it('leaves an unmatched backtick as literal text', () => {
    const { container } = render(<ObsidianMarkdownBody content={'a `b'} globalVars={vars} soundEnabled={false} />);
    expect(container.querySelector('code')).toBeNull();
    expect(container.textContent).toBe('a `b');
  });

  it('shows chips in fenced blocks and copies the resolved text', () => {
    const { container } = render(
      <ObsidianMarkdownBody content={'```bash\necho {LHOST}\n```'} globalVars={vars} soundEnabled={false} />
    );
    const pre = container.querySelector('pre')!;
    expect(pre.textContent).toBe('echo 10.10.14.7');
    expect(pre.querySelector('[data-placeholder="LHOST"]')).not.toBeNull();
    fireEvent.click(screen.getByTitle('Copy interpolated code'));
    expect(safeCopyToClipboard).toHaveBeenCalledWith('echo 10.10.14.7');
  });

  it('pins {TARGET} to the machine IP when targetIp is given', () => {
    const { container } = render(
      <ObsidianMarkdownBody content={'`connect to {TARGET}`'} globalVars={vars} soundEnabled={false} targetIp="10.129.0.9" />
    );
    expect(container.querySelector('code')!.textContent).toBe('connect to 10.129.0.9');
  });
});

describe('MarkdownEditor preview copy buttons', () => {
  beforeEach(() => {
    vi.mocked(safeCopyToClipboard).mockClear();
    useCtfStore.setState({ activeTargetId: null, customNotes: [], globalVars: vars });
  });

  it('adds a Copy button to each <pre> that copies the resolved text', () => {
    render(
      <MarkdownEditor
        noteId="note-x"
        initialContent={'```\necho {LHOST}\n```\n\n```\nconnect to {TARGET} on port 8080\n```'}
        onContentChange={vi.fn()}
        globalVars={vars}
        soundEnabled={false}
      />
    );
    fireEvent.click(screen.getByTitle('Toggle Dual-Pane Split Preview'));
    const preview = screen.getByTestId('markdown-split-preview');
    const buttons = within(preview).getAllByRole('button', { name: 'Copy resolved command' });
    expect(buttons).toHaveLength(preview.querySelectorAll('pre').length);
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[1]);
    expect(safeCopyToClipboard).toHaveBeenCalledWith('connect to 10.10.11.5 on port 8080');
    expect(buttons[1].textContent).toBe('Copied');
  });
});
