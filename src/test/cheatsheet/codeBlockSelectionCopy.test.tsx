import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { ObsidianMarkdownBody } from '../../components/cheatsheet/ObsidianMarkdownBody';
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

const TWO_BLOCKS = '```bash\nnmap -sV 10.10.11.32\ncurl http://{TARGET}:8080/login\n```\n\ntext\n\n```bash\necho second\n```';

/** Select from `startOffset` in the first text node of `start` to `endOffset` in the first text node of `end`. */
function selectBetween(start: Node, startOffset: number, end: Node, endOffset: number) {
  const range = document.createRange();
  range.setStart(start, startOffset);
  range.setEnd(end, endOffset);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
  act(() => {
    document.dispatchEvent(new Event('selectionchange'));
  });
}

function clearSelection() {
  window.getSelection()!.removeAllRanges();
  act(() => {
    document.dispatchEvent(new Event('selectionchange'));
  });
}

describe('code block selection copy', () => {
  beforeEach(() => {
    vi.mocked(safeCopyToClipboard).mockClear();
    useCtfStore.setState({ activeTargetId: null, globalVars: vars });
  });
  afterEach(() => {
    window.getSelection()?.removeAllRanges();
  });

  it('lets the reader select part of a code block instead of forcing the whole block', () => {
    const { container } = render(<ObsidianMarkdownBody content={TWO_BLOCKS} globalVars={vars} soundEnabled={false} />);
    const pre = container.querySelector('pre')!;
    expect(pre.className).not.toContain('select-all');
    expect(pre.className).toContain('select-text');
  });

  it('copies just the selected text, chips contributing their displayed value', () => {
    const { container } = render(<ObsidianMarkdownBody content={TWO_BLOCKS} globalVars={vars} soundEnabled={false} />);
    const [first, second] = Array.from(container.querySelectorAll('pre'));
    const chip = first.querySelector('[data-placeholder="TARGET"]')!;
    // "nmap -sV 10.10.11.32\ncurl http://" is the first text node; select from "curl" through "10.10" of the chip.
    const head = first.firstChild!;
    const curlAt = head.textContent!.indexOf('curl');
    selectBetween(head, curlAt, chip.firstChild!, 5);

    const blocks = container.querySelectorAll('pre');
    const firstHeader = blocks[0].parentElement!;
    const button = within(firstHeader).getByRole('button', { name: /copy selection/i });
    expect(button).toHaveAttribute('title', 'Copy the selected text');
    // The other block keeps its whole-block Copy.
    expect(within(second.parentElement!).getByRole('button', { name: /^copy$/i })).toBeInTheDocument();

    fireEvent.mouseDown(button);
    fireEvent.click(button);
    expect(safeCopyToClipboard).toHaveBeenCalledWith('curl http://10.10');
    expect(within(firstHeader).getByText('Copied')).toBeInTheDocument();
  });

  it('keeps the selection when the button is pressed', () => {
    const { container } = render(<ObsidianMarkdownBody content={TWO_BLOCKS} globalVars={vars} soundEnabled={false} />);
    const first = container.querySelector('pre')!;
    selectBetween(first.firstChild!, 0, first.firstChild!, 4);
    const button = within(first.parentElement!).getByRole('button', { name: /copy selection/i });
    // preventDefault on mousedown stops the click from collapsing the selection first.
    expect(fireEvent.mouseDown(button)).toBe(false);
  });

  it('falls back to the whole-block copy once the selection is gone', () => {
    const { container } = render(<ObsidianMarkdownBody content={TWO_BLOCKS} globalVars={vars} soundEnabled={false} />);
    const first = container.querySelector('pre')!;
    selectBetween(first.firstChild!, 0, first.firstChild!, 4);
    clearSelection();
    const button = within(first.parentElement!).getByRole('button', { name: /^copy$/i });
    expect(button).toHaveAttribute('title', 'Copy interpolated code');
    fireEvent.click(button);
    expect(safeCopyToClipboard).toHaveBeenCalledWith('nmap -sV 10.10.11.32\ncurl http://10.10.11.5:8080/login');
  });

  it('ignores a selection that leaves the block', () => {
    const { container } = render(<ObsidianMarkdownBody content={TWO_BLOCKS} globalVars={vars} soundEnabled={false} />);
    const [first, second] = Array.from(container.querySelectorAll('pre'));
    selectBetween(first.firstChild!, 0, second.firstChild!, 4);
    expect(screen.queryByRole('button', { name: /copy selection/i })).toBeNull();
  });
});
