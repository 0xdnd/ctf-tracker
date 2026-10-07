import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import routeMeta from '../seo/routeMeta.json';

const normalize = (p: string): string => (p.length > 1 ? p.replace(/\/+$/, '') : p);

const META_BY_PATH = new Map(routeMeta.map((m) => [normalize(m.path), m]));

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
