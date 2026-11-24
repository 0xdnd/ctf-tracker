import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import routeMeta from '../seo/routeMeta.json';
import {
  CATALOG_TOTAL,
  EXAM_TRACK_COUNT,
  EXAM_TRACKS_LIST,
  PHASE_COUNT,
  PHASE_COUNT_WORD,
  SHELL_COUNT,
} from '../data/catalogStats';

const normalize = (p: string): string => (p.length > 1 ? p.replace(/\/+$/, '') : p);

const TOKENS: Record<string, string> = {
  catalogTotal: CATALOG_TOTAL.toLocaleString('en-US'),
  phaseCount: String(PHASE_COUNT),
  phaseCountWord: PHASE_COUNT_WORD,
  phaseCountWordLower: PHASE_COUNT_WORD.toLowerCase(),
  examTrackCount: String(EXAM_TRACK_COUNT),
  examTracksList: EXAM_TRACKS_LIST,
  shellCount: String(SHELL_COUNT),
};

const fillRouteTokens = (s: string): string =>
  s.replace(/\{\{(\w+)\}\}/g, (match, key) => TOKENS[key] ?? match);

const META_BY_PATH = new Map(
  routeMeta.map((m) => [
    normalize(m.path),
    {
      ...m,
      title: fillRouteTokens(m.title),
      description: fillRouteTokens(m.description),
    },
  ])
);

/** Sets document.title and meta description from src/seo/routeMeta.json on route change. */
export function useRouteMeta(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    const meta = META_BY_PATH.get(normalize(pathname));
    if (!meta) return;
    document.title = meta.title;
    const tag = document.querySelector('meta[name="description"]');
    if (tag) tag.setAttribute('content', meta.description);
  }, [pathname]);
}
