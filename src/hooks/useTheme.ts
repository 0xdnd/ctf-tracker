import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface RippleCoordinates {
  x: number;
  y: number;
}

export interface RippleState {
  active: boolean;
  x: number;
  y: number;
  targetIsDark: boolean;
}

export interface ThemeContextValue {
  theme: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  isDark: boolean;
  setTheme: (mode: ThemeMode, coordinates?: RippleCoordinates) => void;
  toggleTheme: (event?: React.MouseEvent | React.KeyboardEvent | RippleCoordinates) => void;
  prefersReducedMotion: boolean;
  systemTheme: 'light' | 'dark';
  rippleState: RippleState | null;
}

const STORAGE_KEY = 'zerobox-theme-mode';

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function extractCoordinates(
  event?: React.MouseEvent | React.KeyboardEvent | RippleCoordinates
): RippleCoordinates {
  if (!event || typeof window === 'undefined') {
    return {
      x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
      y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
    };
  }

  // Direct RippleCoordinates object
  if ('x' in event && 'y' in event && typeof event.x === 'number' && typeof event.y === 'number') {
    return { x: event.x, y: event.y };
  }

  // MouseEvent with clientX/clientY
  if ('clientX' in event && typeof event.clientX === 'number' && event.clientX > 0) {
    return { x: event.clientX, y: event.clientY };
  }

  // KeyboardEvent or element target - fall back to element center
  if ('currentTarget' in event && event.currentTarget instanceof HTMLElement) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2),
    };
  }

  if ('target' in event && event.target instanceof HTMLElement) {
    const rect = event.target.getBoundingClientRect();
    return {
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2),
    };
  }

  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  };
}

export function applyThemeToDOM(effective: 'light' | 'dark', animate = true) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (animate) {
    root.classList.add('theme-transition');
  }

  if (effective === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-mode', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-mode', 'light');
    root.style.colorScheme = 'light';
  }

  if (animate) {
    window.setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 200);
  }
}

export function useThemeEngine(): ThemeContextValue {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'dark';
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch {
      // Ignore localStorage errors
    }
    return 'dark'; // ZeroBox defaults to cyber dark
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(getPrefersReducedMotion);

  const effectiveTheme: 'light' | 'dark' = theme === 'system' ? systemTheme : theme;
  const isDark = effectiveTheme === 'dark';

  // Apply initial theme on mount synchronously without animation
  useEffect(() => {
    applyThemeToDOM(effectiveTheme, false);
  }, []);

  // Listen for system theme preference changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newSys = e.matches ? 'dark' : 'light';
      setSystemTheme(newSys);
      if (theme === 'system') {
        applyThemeToDOM(newSys, true);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Listen for reduced motion preference changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = useCallback((mode: ThemeMode, eventOrCoords?: React.MouseEvent | React.KeyboardEvent | RippleCoordinates) => {
    const eff = mode === 'system' ? getSystemTheme() : mode;
    const currentEff = theme === 'system' ? systemTheme : theme;
    
    if (eff === currentEff) {
        setThemeState(mode);
        try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
        return;
    }

    const updateDOMAndState = () => {
      applyThemeToDOM(eff, false);
      setThemeState(mode);
      try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
    };

    if (!getPrefersReducedMotion() && 'startViewTransition' in document) {
      const coords = extractCoordinates(eventOrCoords);
      document.documentElement.classList.remove('theme-transition');

      const transition = (document as any).startViewTransition(() => {
        updateDOMAndState();
      });

      transition.ready.then(() => {
        const radius = Math.hypot(
          Math.max(coords.x, window.innerWidth - coords.x),
          Math.max(coords.y, window.innerHeight - coords.y)
        );

        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${coords.x}px ${coords.y}px)`,
              `circle(${radius}px at ${coords.x}px ${coords.y}px)`,
            ],
          },
          {
            duration: 350,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
            pseudoElement: '::view-transition-new(root)',
          }
        );
      });
    } else {
      applyThemeToDOM(eff, !getPrefersReducedMotion());
      updateDOMAndState();
    }
  }, [theme, systemTheme]);

  const toggleTheme = useCallback(
    (event?: React.MouseEvent | React.KeyboardEvent | RippleCoordinates) => {
      const nextIsDark = !isDark;
      const nextMode: ThemeMode = nextIsDark ? 'dark' : 'light';

      const updateDOMAndState = () => {
        // Update DOM classes immediately without the CSS fade transition
        applyThemeToDOM(nextMode, false);
        setThemeState(nextMode);
        try {
          localStorage.setItem(STORAGE_KEY, nextMode);
        } catch {}
      };

      // Use native View Transitions API if available
      if (!prefersReducedMotion && 'startViewTransition' in document) {
        const coords = extractCoordinates(event);
        
        // Ensure any existing transition classes are removed first
        document.documentElement.classList.remove('theme-transition');

        const transition = (document as any).startViewTransition(() => {
          updateDOMAndState();
        });

        transition.ready.then(() => {
          const radius = Math.hypot(
            Math.max(coords.x, window.innerWidth - coords.x),
            Math.max(coords.y, window.innerHeight - coords.y)
          );

          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${coords.x}px ${coords.y}px)`,
                `circle(${radius}px at ${coords.x}px ${coords.y}px)`,
              ],
            },
            {
              duration: 350,
              easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
              pseudoElement: '::view-transition-new(root)',
            }
          );
        });
      } else {
        // Fallback for older browsers
        applyThemeToDOM(nextMode, !prefersReducedMotion);
        updateDOMAndState();
      }
    },
    [isDark, prefersReducedMotion]
  );

  return {
    theme,
    effectiveTheme,
    isDark,
    setTheme,
    toggleTheme,
    prefersReducedMotion,
    systemTheme,
    rippleState: null,
  };
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useThemeEngine();
  return React.createElement(ThemeContext.Provider, { value }, children);
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return useThemeEngine();
  }
  return context;
}

