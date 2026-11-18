import { useState, useEffect, useCallback } from 'react';
import { NARROW_QUERY, useMediaQuery } from '../../../hooks/useMediaQuery';
import { playCyberSound } from '../../../utils/helpers';

interface UseNotesPanelsParams {
  viewMode: 'tactical' | 'cpts-manual';
  soundEnabled: boolean;
}

/** Left and right sidebar open state (persisted), narrow-screen drawers, outline heading requests, and Ctrl+B. */
export function useNotesPanels({ viewMode, soundEnabled }: UseNotesPanelsParams) {
  const [isObsidianSidebarOpen, setIsObsidianSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('zerobox_obsidian_sidebar_open');
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  // Right sidebar (backlinks and outline): open state persists like the left one.
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('zerobox_notes_right_panel_open') !== 'false';
    } catch {
      return true;
    }
  });
  const setRightPanelOpenPersisted = useCallback((open: boolean) => {
    setIsRightPanelOpen(open);
    try {
      localStorage.setItem('zerobox_notes_right_panel_open', String(open));
    } catch { /* best effort */ }
  }, []);
  // Under 768 px both sidebars are drawers: transient state, never persisted.
  const isNarrow = useMediaQuery(NARROW_QUERY);
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  useEffect(() => {
    if (!isNarrow) {
      setLeftDrawerOpen(false);
      setRightDrawerOpen(false);
    }
  }, [isNarrow]);
  const closeDrawers = useCallback(() => {
    setLeftDrawerOpen(false);
    setRightDrawerOpen(false);
  }, []);
  const handleToggleRightPanel = useCallback(() => {
    if (isNarrow) {
      setRightDrawerOpen((prev) => !prev);
      setLeftDrawerOpen(false);
      return;
    }
    setIsRightPanelOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('zerobox_notes_right_panel_open', String(next));
      } catch { /* best effort */ }
      return next;
    });
  }, [isNarrow]);
  // Outline click: addressed to the active pane's viewer, which acts once per larger nonce.
  const [headingRequest, setHeadingRequest] = useState<{ paneId: string; slug: string; nonce: number } | null>(null);

  const handleToggleObsidianSidebar = useCallback(() => {
    if (isNarrow) {
      setLeftDrawerOpen((prev) => !prev);
      setRightDrawerOpen(false);
      if (soundEnabled) playCyberSound('click');
      return;
    }
    setIsObsidianSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('zerobox_obsidian_sidebar_open', String(next));
      } catch { /* best effort */ }
      return next;
    });
    if (soundEnabled) playCyberSound('click');
  }, [soundEnabled, isNarrow]);

  useEffect(() => {
    if (viewMode !== 'cpts-manual') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.altKey) && (e.key === 'b' || e.key === 'B')) {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        handleToggleObsidianSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, handleToggleObsidianSidebar]);
  return {
    isObsidianSidebarOpen,
    setIsObsidianSidebarOpen,
    isRightPanelOpen,
    setRightPanelOpenPersisted,
    isNarrow,
    leftDrawerOpen,
    setLeftDrawerOpen,
    rightDrawerOpen,
    setRightDrawerOpen,
    closeDrawers,
    handleToggleRightPanel,
    headingRequest,
    setHeadingRequest,
    handleToggleObsidianSidebar,
  };
}
