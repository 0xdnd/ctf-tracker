import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ObsidianNoteViewer } from '../../components/cheatsheet/ObsidianNoteViewer';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import type { GlobalVariables } from '../../types';

const vars: GlobalVariables = { lhost: '', lport: '', targetIp: '', interface: '', customVars: {} };
const mk = (id: string): CptsNoteEntry => ({
  id,
  title: `Note ${id}`,
  titleEn: `Note ${id}`,
  category: 'General',
  rawCategory: 'General',
  subCategory: 'Recon',
  tags: [],
  difficulty: 'Core',
  summary: 'Summary',
  commands: [],
  relPath: `${id}.md`,
  rawMarkdown: `# Note ${id}\n\nBody`,
});
const note = mk('a');

const renderPane = (isPaneActive: boolean) =>
  render(
    <ObsidianNoteViewer
      note={note}
      openNotes={[note]}
      globalVars={vars}
      soundEnabled={false}
      onClose={vi.fn()}
      onNavigateToNote={vi.fn()}
      onSelectNote={vi.fn()}
      isSplitView
      isPaneActive={isPaneActive}
    />,
  );

const wrapperOf = (c: HTMLElement) => c.querySelector('[class*="overflow-hidden"][class*="flex-col"]') as HTMLElement;

describe('split view active pane cue', () => {
  it('active pane: accent line, no dimming', () => {
    const { container, getByTestId } = renderPane(true);
    expect(getByTestId('active-tab-line').className).toContain('border-accent');
    expect(wrapperOf(container).className).not.toContain('opacity-80');
  });

  it('inactive pane: neutral line, dimmed wrapper', () => {
    const { container, getByTestId } = renderPane(false);
    const line = getByTestId('active-tab-line');
    expect(line.className).toContain('border-strong');
    expect(line.className).not.toContain('border-accent');
    expect(wrapperOf(container).className).toContain('opacity-80');
  });

  it('switching the active pane swaps the cues', () => {
    const { container, getByTestId, rerender } = renderPane(true);
    rerender(
      <ObsidianNoteViewer
        note={note}
        openNotes={[note]}
        globalVars={vars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
        onSelectNote={vi.fn()}
        isSplitView
        isPaneActive={false}
      />,
    );
    expect(getByTestId('active-tab-line').className).toContain('border-strong');
    expect(wrapperOf(container).className).toContain('opacity-80');
  });
});
