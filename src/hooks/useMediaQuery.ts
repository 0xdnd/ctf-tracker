import { useEffect, useState } from 'react';

/** Below the md breakpoint: both sidebars become drawers and Edit opens the raw editor. */
export const NARROW_QUERY = '(max-width: 767px)';

const read = (query: string): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false;

/** Live `matchMedia` result. False where `matchMedia` does not exist (SSR, jsdom without a stub). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => read(query));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
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
