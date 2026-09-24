import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useMotionValue, MotionValue } from 'framer-motion';

export interface ScrollActionsContextType {
  scrollElement: HTMLElement | null;
  setScrollElement: (el: HTMLElement | null) => void;
  scrollToTop: (behavior?: ScrollBehavior | unknown) => void;
}

export interface ScrollStateContextType {
  scrollTop: number;
  scrollProgress: number; // 0 to 1
  isScrolled: boolean;
  scrollProgressMotion: MotionValue<number>;
}

export interface ScrollContextType extends ScrollActionsContextType, ScrollStateContextType {}

const ScrollActionsContext = createContext<ScrollActionsContextType>({
  scrollElement: null,
  setScrollElement: () => {},
  scrollToTop: () => {},
});

const defaultProgressMotion = {
  get: () => 0,
  set: () => {},
  on: () => () => {},
} as unknown as MotionValue<number>;

const ScrollStateContext = createContext<ScrollStateContextType>({
  scrollTop: 0,
  scrollProgress: 0,
  isScrolled: false,
  scrollProgressMotion: defaultProgressMotion,
});

export const useScrollActions = () => useContext(ScrollActionsContext);
export const useScrollState = () => useContext(ScrollStateContext);

// Backwards-compatible hook that combines actions and state
export const useWorkspaceScroll = (): ScrollContextType => {
  const actions = useScrollActions();
  const state = useScrollState();
  return useMemo(() => ({ ...actions, ...state }), [actions, state]);
};

export const ScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scrollElement, setScrollElementState] = useState<HTMLElement | null>(null);
  const scrollElementRef = useRef<HTMLElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollProgressMotion = useMotionValue(0);
  const lastTopRef = useRef(0);

  const setScrollElement = useCallback((el: HTMLElement | null) => {
    scrollElementRef.current = el;
    setScrollElementState(el);
  }, []);

  const scrollToTop = useCallback((behavior?: ScrollBehavior | unknown) => {
    if (scrollElementRef.current) {
      const mode: ScrollBehavior = typeof behavior === 'string' && (behavior === 'instant' || behavior === 'auto' || behavior === 'smooth') 
        ? behavior 
        : 'smooth';
      if (mode === 'instant') {
        scrollElementRef.current.scrollTop = 0;
      }
      if (typeof scrollElementRef.current.scrollTo === 'function') {
        scrollElementRef.current.scrollTo({ top: 0, behavior: mode });
      } else {
        scrollElementRef.current.scrollTop = 0;
      }
    }
  }, []);

  useEffect(() => {
    const el = scrollElement;
    if (!el) return;

    let ticking = false;
    let lastIsScrolled = el.scrollTop > 180;
    setIsScrolled(lastIsScrolled);

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (!el) {
            ticking = false;
            return;
          }
          const top = el.scrollTop;
          const height = el.scrollHeight - el.clientHeight;
          const progress = height > 0 ? Math.min(Math.max(top / height, 0), 1) : 0;

          // 1. Direct compositor-thread motion value update (0ms latency, zero React render overhead)
          scrollProgressMotion.set(progress);

          // 2. Only flip isScrolled when state actually transitions
          const newIsScrolled = top > 180;
          if (newIsScrolled !== lastIsScrolled) {
            lastIsScrolled = newIsScrolled;
            setIsScrolled(newIsScrolled);
          }

          if (Math.abs(top - lastTopRef.current) >= 16 || top === 0 || progress >= 1) {
            lastTopRef.current = top;
            setScrollTop(top);
            setScrollProgress(progress);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      el.removeEventListener('scroll', handleScroll);
    };
  }, [scrollElement, scrollProgressMotion]);

  const actionsValue = useMemo(
    () => ({
      scrollElement,
      setScrollElement,
      scrollToTop,
    }),
    [scrollElement, setScrollElement, scrollToTop]
  );

  const stateValue = useMemo(
    () => ({
      scrollTop,
      scrollProgress,
      isScrolled,
      scrollProgressMotion,
    }),
    [scrollTop, scrollProgress, isScrolled, scrollProgressMotion]
  );

  return (
    <ScrollActionsContext.Provider value={actionsValue}>
      <ScrollStateContext.Provider value={stateValue}>
        {children}
      </ScrollStateContext.Provider>
    </ScrollActionsContext.Provider>
  );
};
