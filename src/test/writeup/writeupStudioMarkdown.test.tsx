import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderInlineMarkdown } from '../../components/writeup/WriteupStudio';

describe('WriteupStudio Inline Markdown Parser', () => {
  it('renders plain text unchanged when no markdown tokens exist', () => {
    const { container } = render(<div>{renderInlineMarkdown('Plain recon text without formatting', 'test')}</div>);
    expect(container.textContent).toBe('Plain recon text without formatting');
  });

  it('renders bold text with strong element', () => {
    const { container } = render(<div>{renderInlineMarkdown('Initial access via **EternalBlue** vulnerability', 'test')}</div>);
    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('EternalBlue');
  });

  it('renders inline code with code element', () => {
    const { container } = render(<div>{renderInlineMarkdown('Run `nmap -sC -sV 10.10.10.10` to scan ports', 'test')}</div>);
    const code = container.querySelector('code');
    expect(code).not.toBeNull();
    expect(code?.textContent).toBe('nmap -sC -sV 10.10.10.10');
  });

  it('renders combined bold and inline code correctly (**Target IP:** `10.10.x.x`)', () => {
    const { container } = render(<div>{renderInlineMarkdown('**Target IP:** `10.10.11.200`', 'test')}</div>);
    const strong = container.querySelector('strong');
    const code = container.querySelector('code');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('Target IP:');
    expect(code).not.toBeNull();
    expect(code?.textContent).toBe('10.10.11.200');
  });

  it('renders Obsidian wikilinks with badge and icon', () => {
    const { container } = render(<div>{renderInlineMarkdown('See [[01 - Active Directory/Kerberos|Kerberos Guide]] for escalation', 'test')}</div>);
    expect(container.textContent).toContain('Kerberos Guide');
    const badge = container.querySelector('span[title="Wikilink: 01 - Active Directory/Kerberos"]');
    expect(badge).not.toBeNull();
  });

  it('renders external links with target="_blank" and rel="noopener noreferrer"', () => {
    const { container } = render(<div>{renderInlineMarkdown('Documentation: [OffSec Portal](https://portal.offsec.com)', 'test')}</div>);
    const anchor = container.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute('href')).toBe('https://portal.offsec.com');
    expect(anchor?.getAttribute('target')).toBe('_blank');
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(anchor?.textContent).toBe('OffSec Portal');
  });

  it('renders italic formatting correctly', () => {
    const { container } = render(<div>{renderInlineMarkdown('This is *crucial* for exploitation', 'test')}</div>);
    const em = container.querySelector('em');
    expect(em).not.toBeNull();
    expect(em?.textContent).toBe('crucial');
  });
});

describe('WriteupStudio telemetry counts', () => {
  it('computes characters, words and lines', async () => {
    const { computeWriteupTelemetry } = await import('../../components/writeup/WriteupStudio');
    expect(computeWriteupTelemetry('')).toEqual({ chars: 0, words: 0, lines: 1 });
    expect(computeWriteupTelemetry('alpha beta\ngamma')).toEqual({ chars: 16, words: 3, lines: 2 });
  });
});
