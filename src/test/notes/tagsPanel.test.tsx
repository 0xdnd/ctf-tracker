import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteTagsPanel } from '../../components/notes/NoteTagsPanel';
import { ObsidianMarkdownBody } from '../../components/cheatsheet/ObsidianMarkdownBody';
import { ObsidianTabContent } from '../../components/cheatsheet/ObsidianTabContent';
import { resetNoteIndexCacheForTests } from '../../hooks/useNoteIndex';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import type { GlobalVariables } from '../../types';

const globalVars = {
  lhost: '10.10.14.42', lport: '4444', targetIp: '10.10.11.5', domain: 'corp.local', username: 'u', password: 'p',
} as unknown as GlobalVariables;

function body(content: string, onTagClick?: (t: string) => void) {
  return render(
    <ObsidianMarkdownBody
      content={content}
      globalVars={globalVars}
      soundEnabled={false}
      onTagClick={onTagClick}
    />,
  );
}

describe('NoteTagsPanel', () => {
  const tags = new Map<string, string[]>([
    ['web', ['X']],
    ['web/sqli', ['Y']],
  ]);

  it('derives parent counts and nests children', () => {
    render(<NoteTagsPanel tags={tags} activeTag={null} onSelectTag={vi.fn()} />);
    const web = screen.getByRole('button', { name: /^web\s*2$/ });
    expect(web).toBeTruthy();
    const sqli = screen.getByRole('button', { name: /^sqli\s*1$/ });
    expect(sqli).toBeTruthy();
  });

  it('creates parent nodes from child-only keys', () => {
    render(<NoteTagsPanel tags={new Map([['a/b', ['N']]])} activeTag={null} onSelectTag={vi.fn()} />);
    expect(screen.getByRole('button', { name: /^a\s*1$/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^b\s*1$/ })).toBeTruthy();
  });

  it('selects a tag by full path and deselects the active tag', () => {
    const onSelectTag = vi.fn();
    const { rerender } = render(<NoteTagsPanel tags={tags} activeTag={null} onSelectTag={onSelectTag} />);
    fireEvent.click(screen.getByRole('button', { name: /^web\s*2$/ }));
    expect(onSelectTag).toHaveBeenLastCalledWith('web');
    fireEvent.click(screen.getByRole('button', { name: /sqli/ }));
    expect(onSelectTag).toHaveBeenLastCalledWith('web/sqli');
    rerender(<NoteTagsPanel tags={tags} activeTag="web" onSelectTag={onSelectTag} />);
    fireEvent.click(screen.getByRole('button', { name: /^web\s*2$/ }));
    expect(onSelectTag).toHaveBeenLastCalledWith(null);
  });
});

describe('inline tags in ObsidianMarkdownBody', () => {
  it('renders a button and reports the lowercased tag', () => {
    const onTagClick = vi.fn();
    body('use #Web/SQLi here', onTagClick);
    const btn = screen.getByRole('button', { name: '#Web/SQLi' });
    fireEvent.click(btn);
    expect(onTagClick).toHaveBeenCalledWith('web/sqli');
  });

  it('keeps tags inside code spans as plain code', () => {
    body('run `#web/sqli` now', vi.fn());
    expect(screen.queryByRole('button', { name: /#web\/sqli/ })).toBeNull();
    expect(screen.getByText('#web/sqli').tagName).toBe('CODE');
  });

  it('does not tag text glued to a wikilink or code span, but does after whitespace', () => {
    body('[[x]]#tag', vi.fn());
    expect(screen.queryByRole('button', { name: '#tag' })).toBeNull();
    body('`c`#tag2', vi.fn());
    expect(screen.queryByRole('button', { name: '#tag2' })).toBeNull();
    body('[[x]] #tag3', vi.fn());
    expect(screen.getByRole('button', { name: '#tag3' })).toBeTruthy();
  });

  it('tags inside callout bodies', () => {
    body('> [!note]\n> see #web', vi.fn());
    expect(screen.getByRole('button', { name: '#web' })).toBeTruthy();
  });

  it('keeps tags in fenced code as plain text', () => {
    body('```\n#web\n```', vi.fn());
    expect(screen.queryByRole('button', { name: '#web' })).toBeNull();
  });

  it('renders plain text without onTagClick', () => {
    body('use #web/sqli here');
    expect(screen.queryByRole('button', { name: /#web\/sqli/ })).toBeNull();
    expect(screen.getByText('use #web/sqli here')).toBeTruthy();
  });
});

describe('header tag chips', () => {
  beforeEach(() => resetNoteIndexCacheForTests());

  it('calls onTagClick with the tag', () => {
    const onTagClick = vi.fn();
    const note = { id: 'N', title: 'N', category: 'T', rawMarkdown: 'x', tags: ['recon'] } as unknown as CptsNoteEntry;
    render(
      <ObsidianTabContent
        note={note}
        isActive
        globalVars={globalVars}
        soundEnabled={false}
        onNavigateToNote={vi.fn()}
        viewMode="reading"
        onTagClick={onTagClick}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '#recon' }));
    expect(onTagClick).toHaveBeenCalledWith('recon');
  });
});
