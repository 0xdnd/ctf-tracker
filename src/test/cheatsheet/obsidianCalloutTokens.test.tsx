import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ObsidianTabContent } from '../../components/cheatsheet/ObsidianTabContent';
import { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import { GlobalVariables } from '../../types';

const globalVars = {
  lhost: '10.10.14.42', lport: '4444', targetIp: '10.10.11.5', domain: 'corp.local', username: 'u', password: 'p',
} as unknown as GlobalVariables;

const note = {
  id: 'tok_note',
  title: 'Token Note',
  category: 'Test',
  content: '# Token Note\n\n> [!WARNING] Careful\n> Do not run this twice.\n\nSee [[Target Note]] for more.\n',
} as unknown as CptsNoteEntry;

describe('Obsidian callout and wikilink tokens', () => {
  it('renders a [!WARNING] callout with callout-warn semantic classes and a focusable wikilink', () => {
    const { container } = render(
      <ObsidianTabContent
        note={note}
        isActive={true}
        globalVars={globalVars}
        soundEnabled={false}
        onNavigateToNote={vi.fn()}
        viewMode="reading"
      />
    );
    const callout = container.querySelector('.callout-warn');
    expect(callout).not.toBeNull();
    expect(callout!.className).toContain('bg-callout-warn-bg');
    expect(callout!.className).toContain('border-callout-warn-border');

    const link = container.querySelector('a[data-wikilink]') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.className).toContain('focus-visible:ring-accent');
    link.focus();
    expect(document.activeElement).toBe(link);
    expect(screen.getByText('Careful')).toBeInTheDocument();
  });
});
