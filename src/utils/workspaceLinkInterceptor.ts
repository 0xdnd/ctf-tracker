import React from 'react';
import { CptsNoteEntry, getAllCptsNotes, resolveWikilink } from './obsidianManualUtils';
import { OpenNoteOptions } from '../types/workspace';

export interface WorkspaceLinkHandlerOptions {
  containerElement: HTMLElement | null;
  onOpenNote: (noteId: string, options?: OpenNoteOptions) => void;
  notesPool?: CptsNoteEntry[];
  currentNoteId?: string;
}

/**
 * Normalizes heading text or anchor string to a reliable DOM ID
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0590-\u05FF-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Parses a target link into target path and optional heading anchor
 * e.g. "07 Kerberos#TGS-REP Roasting" -> { target: "07 Kerberos", anchor: "tgs-rep-roasting" }
 * e.g. "#prerequisites" -> { target: "", anchor: "prerequisites" }
 * e.g. "web/sqli.md" -> { target: "web/sqli", anchor: undefined }
 */
export function parseNoteTarget(rawHref: string): { target: string; anchor?: string } {
  const clean = rawHref.trim().replace(/^\//, '');
  const hashIdx = clean.indexOf('#');
  if (hashIdx === -1) {
    return { target: clean.replace(/\.(md|markdown)$/i, '') };
  }
  const target = clean.substring(0, hashIdx).replace(/\.(md|markdown)$/i, '').trim();
  const anchor = clean.substring(hashIdx + 1).trim();
  return { target, anchor: anchor ? slugifyHeading(anchor) : undefined };
}

/**
 * Universal Event Delegation Interceptor
 * Intercepts link clicks at the workspace container level, strictly enforcing:
 * 1. Zero popups / zero external browser tabs for internal notes
 * 2. In-page heading anchors smoothly scroll the isolated container without shifting outer viewport
 * 3. Modifier handling: Ctrl/Cmd+Click or Middle-Click opens tab in background
 * 4. Genuine external links are allowed with rel="noopener noreferrer"
 */
export function handleWorkspaceLinkClick(
  e: MouseEvent | React.MouseEvent,
  options: WorkspaceLinkHandlerOptions
): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;

  // Find nearest anchor tag or element marked with wikilink data attribute
  const linkEl = target.closest('a, [data-wikilink], [data-href]') as HTMLElement | null;
  if (!linkEl) return false;

  // Respect links explicitly marked to bypass interception
  if (linkEl.getAttribute('data-no-intercept') === 'true') {
    return false;
  }

  let rawHref = linkEl.getAttribute('href') || 
                linkEl.getAttribute('data-href') || 
                linkEl.getAttribute('data-wikilink') || '';

  if (!rawHref || rawHref === '#') {
    return false;
  }

  const isBackground = e.ctrlKey || e.metaKey || e.button === 1;

  // Check if link is genuinely external (http:// or https:// outside host origin)
  const isHttp = /^https?:\/\//i.test(rawHref);
  if (isHttp) {
    try {
      const url = new URL(rawHref, typeof window !== 'undefined' ? window.location.href : 'http://localhost');
      if (typeof window !== 'undefined' && url.origin !== window.location.origin) {
        // Genuine external link: enforce security attributes and let browser handle
        linkEl.setAttribute('rel', 'noopener noreferrer');
        linkEl.setAttribute('target', '_blank');
        return false;
      } else {
        // Same-origin URL: extract pathname and hash for internal note routing
        rawHref = url.pathname.replace(/^\//, '') + url.hash;
      }
    } catch {
      return false;
    }
  }

  // Any other link is treated as an internal note link or in-page anchor!
  e.preventDefault();
  e.stopPropagation();

  // Strip auto-generated target="_blank" to prevent popup leaks
  if (linkEl.getAttribute('target') === '_blank') {
    linkEl.removeAttribute('target');
  }

  const { target: noteTarget, anchor } = parseNoteTarget(rawHref);

  // Case 1: In-page heading anchor without note path (e.g. #step-2-enumeration) or targeting current note
  if (!noteTarget || noteTarget === options.currentNoteId) {
    if (anchor && options.containerElement) {
      scrollToHeadingAnchor(options.containerElement, anchor);
      return true;
    }
    return true;
  }

  // Case 2: Target is an internal note path or wikilink
  const pool = options.notesPool || getAllCptsNotes();
  const resolution = resolveWikilink(noteTarget, pool);

  if (resolution.targetNoteId) {
    options.onOpenNote(resolution.targetNoteId, {
      background: isBackground,
      anchor,
    });
    return true;
  }

  // Fallback: direct match by ID, filename, relPath, or slug
  const normalizedTarget = noteTarget.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  const fallback = pool.find((n) => 
    n.id.toLowerCase() === normalizedTarget ||
    n.id.toLowerCase() === `cpts-${normalizedTarget}` ||
    n.title.toLowerCase().includes(noteTarget.toLowerCase()) ||
    (n.filename && n.filename.toLowerCase().includes(noteTarget.toLowerCase())) ||
    (n.relPath && (
      n.relPath.toLowerCase() === noteTarget.toLowerCase() ||
      n.relPath.toLowerCase() === `${noteTarget.toLowerCase()}.md` ||
      n.relPath.toLowerCase() === `${noteTarget.toLowerCase()}.markdown` ||
      n.relPath.toLowerCase().replace(/\.(md|markdown)$/i, '') === noteTarget.toLowerCase() ||
      n.relPath.toLowerCase().includes(noteTarget.toLowerCase())
    ))
  );

  if (fallback) {
    options.onOpenNote(fallback.id, {
      background: isBackground,
      anchor,
    });
    return true;
  }

  return false;
}

/**
 * Locates the target heading inside an isolated container and smoothly scrolls
 * without shifting the outer browser viewport.
 */
export function scrollToHeadingAnchor(container: HTMLElement, anchor: string): boolean {
  if (!container || !anchor) return false;

  const normalizedAnchor = slugifyHeading(anchor);

  // 1. Direct match on id
  let targetEl = container.querySelector(`[id="${anchor}"]`) || 
                 container.querySelector(`[id="${normalizedAnchor}"]`) ||
                 container.querySelector(`[id="h-${normalizedAnchor}"]`) ||
                 container.querySelector(`[id*="${normalizedAnchor}"]`);

  // 2. Match on name attribute (classic anchors <a name="...">)
  if (!targetEl) {
    targetEl = container.querySelector(`a[name="${anchor}"]`) || 
               container.querySelector(`a[name="${normalizedAnchor}"]`);
  }

  // 3. Fallback: Search all heading tags for matching textContent
  if (!targetEl) {
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (let i = 0; i < headings.length; i++) {
      const h = headings[i];
      const hSlug = slugifyHeading(h.textContent || '');
      if (hSlug.includes(normalizedAnchor) || normalizedAnchor.includes(hSlug)) {
        targetEl = h;
        break;
      }
    }
  }

  if (targetEl && typeof (targetEl as HTMLElement).scrollIntoView === 'function') {
    (targetEl as HTMLElement).scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
    });
    return true;
  }

  return false;
}
