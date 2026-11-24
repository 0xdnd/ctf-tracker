import { useEffect, useState } from 'react';

/** Below the md breakpoint: both sidebars become drawers and Edit opens the raw editor. */
export const NARROW_QUERY = '(max-width: 767px)';

/** Phones: below the sm breakpoint. Compact cards, rows and scrolling chip strips key off this. */
export const PHONE_QUERY = '(max-width: 639px)';

/** Desktop layouts: lg breakpoint and up (lanes scroll horizontally, rails dock). */
export const LG_QUERY = '(min-width: 1024px)';

/** One-shot `matchMedia` read. False where `matchMedia` does not exist (SSR, jsdom without a stub). */
export function matchesQuery(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? Boolean(window.matchMedia(query)?.matches) : false;
}

/** Live `matchMedia` result. False where `matchMedia` does not exist (SSR, jsdom without a stub). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => matchesQuery(query));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    if (!mql) return;
    const onChange = () => setMatches(mql.matches);
    onChange();
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener?.(onChange);
    return () => mql.removeListener?.(onChange);
  }, [query]);

  return matches;
}
