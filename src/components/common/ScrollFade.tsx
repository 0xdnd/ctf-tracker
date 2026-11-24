import React, { useCallback, useEffect, useRef, useState } from 'react';

type Axis = 'x' | 'y';

export interface ScrollEdges {
  /** Content is clipped before the start edge (scrolled away from the start). */
  start: boolean;
  /** Content is clipped past the end edge (more to scroll to). */
  end: boolean;
}

const THRESHOLD = 4;

/**
 * Which edges of a scroller currently have clipped content. Re-measures on scroll, when the scroller or any of its
 * children resize, and when `remeasureKey` changes (pass whatever makes the content or the element change, such as
 * the children or an "is open" flag for a scroller that mounts later).
 */
export function useScrollEdges(ref: React.RefObject<HTMLElement | null>, axis: Axis = 'x', remeasureKey?: unknown): ScrollEdges {
  const [edges, setEdges] = useState<ScrollEdges>({ start: false, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const pos = axis === 'x' ? el.scrollLeft : el.scrollTop;
      const view = axis === 'x' ? el.clientWidth : el.clientHeight;
      const total = axis === 'x' ? el.scrollWidth : el.scrollHeight;
      const start = pos > THRESHOLD;
      const end = pos + view < total - THRESHOLD;
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(el);
      for (const child of Array.from(el.children)) ro.observe(child);
    }
    return () => {
      el.removeEventListener('scroll', measure);
      ro?.disconnect();
    };
  }, [ref, axis, remeasureKey]);

  return edges;
}

const gradient = (axis: Axis, stops: string) => `linear-gradient(${axis === 'x' ? 'to right' : 'to bottom'}, ${stops})`;

function fadeMask(edges: ScrollEdges, axis: Axis, size: string, fade: 'both' | 'end'): string | undefined {
  const start = fade === 'both' && edges.start;
  if (start && edges.end) return gradient(axis, `transparent, black ${size}, black calc(100% - ${size}), transparent`);
  if (edges.end) return gradient(axis, `black calc(100% - ${size}), transparent`);
  if (start) return gradient(axis, `transparent, black ${size}`);
  return undefined;
}

interface ScrollFadeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Scroll direction. Default `x`. */
  axis?: Axis;
  /** Width of the fade (any CSS length). Default 1.5rem. */
  fadeSize?: string;
  /** `end` fades only the far edge; `both` (default) also fades the start once scrolled. */
  fade?: 'both' | 'end';
  /** The caller sets the overflow and scrollbar classes itself (e.g. only from a breakpoint up). */
  unstyled?: boolean;
}

/**
 * The scroll-edge primitive: a scroller that fades the edge where more content is clipped, so a cut-off chip row,
 * tab strip or menu reads as scrollable rather than broken. The fade only shows while there is something to scroll
 * to. The ref is forwarded to the scrolling element.
 */
export const ScrollFade = React.forwardRef<HTMLDivElement, ScrollFadeProps>(function ScrollFade(
  { children, className = '', style, axis = 'x', fadeSize = '1.5rem', fade = 'both', unstyled = false, ...rest },
  forwardedRef
) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      innerRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef]
  );
  const edges = useScrollEdges(innerRef, axis, children);
  const mask = fadeMask(edges, axis, fadeSize, fade);
  const base = unstyled ? '' : axis === 'x' ? 'overflow-x-auto no-scrollbar ' : 'overflow-y-auto no-scrollbar ';

  return (
    <div ref={setRef} {...rest} className={`${base}${className}`} style={{ ...style, maskImage: mask, WebkitMaskImage: mask }}>
      {children}
    </div>
  );
});
