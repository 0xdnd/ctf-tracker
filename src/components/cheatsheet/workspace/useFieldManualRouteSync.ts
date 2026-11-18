import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';
import { CptsNoteEntry, getNoteById } from '../../../utils/obsidianManualUtils';
import type { ObsidianNavView } from './types';

interface UseFieldManualRouteSyncParams {
  location: Location;
  navigate: NavigateFunction;
  defaultMode?: 'tactical' | 'cpts-manual';
  isFullscreen: boolean;
  allActiveNotes: CptsNoteEntry[];
  setActiveObsidianNote: (note: CptsNoteEntry | null) => void;
  setViewMode: Dispatch<SetStateAction<'tactical' | 'cpts-manual'>>;
  setObsidianNavView: Dispatch<SetStateAction<ObsidianNavView>>;
  setSelectedCategory: Dispatch<SetStateAction<string>>;
  setNewNoteInitialDir: Dispatch<SetStateAction<string | undefined>>;
  setIsNewCptsModalOpen: Dispatch<SetStateAction<boolean>>;
}

/** Route and query sync: view mode, the one-shot ?note= and ?new=1 handling, and legacy deep links. */
export function useFieldManualRouteSync({
  location,
  navigate,
  defaultMode,
  isFullscreen,
  allActiveNotes,
  setActiveObsidianNote,
  setViewMode,
  setObsidianNavView,
  setSelectedCategory,
  setNewNoteInitialDir,
  setIsNewCptsModalOpen,
}: UseFieldManualRouteSyncParams) {
  const exitingFromPathRef = useRef<string | null>(null);
  const renderWindowPath = typeof window !== 'undefined' ? window.location.pathname : null;

  // Sync viewMode and activeObsidianNote when route or search query changes
  useEffect(() => {
    if (exitingFromPathRef.current !== null) {
      if (exitingFromPathRef.current === location.pathname) return;
      exitingFromPathRef.current = null;
    }
    if (renderWindowPath !== null && typeof window !== 'undefined' && window.location.pathname !== renderWindowPath) {
      return;
    }
    const params = new URLSearchParams(location.search);
    const isManualParam = location.pathname.includes('note') || 
      location.pathname.includes('manual') || 
      location.search.includes('manual') || 
      location.search.includes('cpts') ||
      (typeof window !== 'undefined' && (window.location.hash.includes('manual') || window.location.hash.includes('cpts')));

    // Legacy routes that reach the field manual under full chrome move to the full-screen route.
    // The query (including ?note=) is kept; the remounted view opens the note and strips the param.
    if (!isFullscreen && /^\/cheatsheets?\/?$/i.test(location.pathname) && (params.has('note') || isManualParam)) {
      navigate({ pathname: '/field-manual', search: location.search, hash: location.hash }, { replace: true });
      return;
    }

    if (isFullscreen || isManualParam) {
      setViewMode('cpts-manual');
    } else if (defaultMode) {
      setViewMode(defaultMode);
    } else if (location.pathname.startsWith('/cheatsheets') || location.pathname === '/cheatsheet') {
      setViewMode('tactical');
    }

    // Check for direct note opening via query parameter, e.g. ?note=cpts-... (supporting both search & hash)
    let noteParam = params.get('note');
    let noteFromHash = false;
    if (!noteParam && typeof window !== 'undefined' && window.location.hash.includes('?')) {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
      noteParam = hashParams.get('note');
      noteFromHash = Boolean(noteParam);
    }
    if (noteParam) {
      const found = getNoteById(noteParam, allActiveNotes.length > 0 ? allActiveNotes : undefined) || getNoteById(noteParam);
      if (found) {
        setActiveObsidianNote(found);
        setViewMode('cpts-manual');
        setObsidianNavView('files');
        // One-shot: drop `note` so later edits don't re-open it and the same link can be used again.
        if (noteFromHash) {
          const [hashPath, hashQuery = ''] = window.location.hash.split('?');
          const hashParams = new URLSearchParams(hashQuery);
          hashParams.delete('note');
          const restHash = hashParams.toString();
          window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${hashPath}${restHash ? `?${restHash}` : ''}`);
        } else {
          params.delete('note');
          const rest = params.toString();
          navigate({ pathname: location.pathname, search: rest ? `?${rest}` : '', hash: location.hash }, { replace: true });
        }
      }
    }

    const catParam = params.get('category') || params.get('cat') || params.get('tab');
    if (catParam === 'revshell') {
      // The generator moved to its own section; old deep links land there.
      navigate('/reverse-shell', { replace: true });
      return;
    }
    if (catParam && !isFullscreen) {
      setSelectedCategory(catParam);
      setViewMode('tactical');
    }
  // location.hash is only forwarded on redirect; re-running on hash changes would re-apply deep links.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultMode, isFullscreen, location.pathname, location.search, allActiveNotes, setActiveObsidianNote, navigate]);

  // /notes?new=1 (from the dock's empty state) opens the new-note modal once, then drops the param.
  useEffect(() => {
    if (exitingFromPathRef.current !== null) {
      if (exitingFromPathRef.current === location.pathname) return;
      exitingFromPathRef.current = null;
    }
    if (renderWindowPath !== null && typeof window !== 'undefined' && window.location.pathname !== renderWindowPath) {
      return;
    }
    const params = new URLSearchParams(location.search);
    if (params.get('new') !== '1') return;
    setNewNoteInitialDir(undefined);
    setIsNewCptsModalOpen(true);
    params.delete('new');
    const rest = params.toString();
    navigate({ pathname: location.pathname, search: rest ? `?${rest}` : '' }, { replace: true });
  }, [location.pathname, location.search, navigate, renderWindowPath, setNewNoteInitialDir, setIsNewCptsModalOpen]);
  return { exitingFromPathRef };
}
