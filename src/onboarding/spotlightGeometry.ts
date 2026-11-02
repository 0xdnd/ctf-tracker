/** Where a guide step's card and spotlight go, worked out before anything moves. */

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export type Dock = 'bottom' | 'top';

export interface ScrollMove {
  node: Element;
  fromTop: number;
  toTop: number;
  fromLeft: number;
  toLeft: number;
}

export interface ScrollPlan {
  /** Where the target ends up once the moves have run, in viewport coordinates. */
  rect: DOMRect;
  moves: ScrollMove[];
}

/** The root element is scaled with CSS zoom; fixed-position overlay coordinates live in zoomed space. */
export function getZoom(): number {
  const raw = parseFloat(document.documentElement.style.getPropertyValue('--app-zoom'));
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

export const toZoomedRect = (r: DOMRect | Rect, z: number): Rect => ({
  top: r.top / z,
  left: r.left / z,
  width: r.width / z,
  height: r.height / z,
});

function scrollAncestors(el: Element): Element[] {
  const chain: Element[] = [];
  for (let node = el.parentElement; node; node = node.parentElement) chain.push(node);
  const root = document.scrollingElement;
  if (root && !chain.includes(root)) chain.push(root);
  return chain;
}

function nearestScrollerRect(el: Element): { top: number; bottom: number } {
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (node.scrollHeight > node.clientHeight + 1) {
      const overflow = getComputedStyle(node).overflowY;
      if (overflow === 'auto' || overflow === 'scroll') {
        const r = node.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom };
      }
    }
  }
  return { top: 0, bottom: window.innerHeight };
}

/**
 * Asks the browser where a scroll with these temporary margins would land, then puts everything back in
 * the same tick, so nothing paints. Nested scrollers come along for free, and the result is exact, which
 * lets the sheet and the spotlight commit to their final places before the page starts to move.
 */
export function planScroll(
  el: HTMLElement,
  options: { marginTop: number; marginBottom: number; block: ScrollLogicalPosition },
): ScrollPlan {
  const chain = scrollAncestors(el);
  const before = chain.map((node) => ({ node, top: node.scrollTop, left: node.scrollLeft }));
  const { scrollMarginTop, scrollMarginBottom } = el.style;
  el.style.scrollMarginTop = `${options.marginTop}px`;
  el.style.scrollMarginBottom = `${options.marginBottom}px`;
  el.scrollIntoView?.({ block: options.block, inline: 'nearest', behavior: 'instant' as ScrollBehavior });
  const rect = el.getBoundingClientRect();
  const moves: ScrollMove[] = [];
  before.forEach(({ node, top, left }) => {
    if (node.scrollTop === top && node.scrollLeft === left) return;
    moves.push({ node, fromTop: top, toTop: node.scrollTop, fromLeft: left, toLeft: node.scrollLeft });
    node.scrollTo?.({ top, left, behavior: 'instant' as ScrollBehavior });
  });
  el.style.scrollMarginTop = scrollMarginTop;
  el.style.scrollMarginBottom = scrollMarginBottom;
  return { rect, moves };
}

export interface PhoneSheetMetrics {
  /** The sheet's top edge when docked to the bottom. */
  sheetTop: number;
  /** The sheet's bottom edge when docked to the top. */
  dockedBottom: number;
  /** Clearance between target and sheet. */
  gap: number;
}

export interface PhonePlan extends ScrollPlan {
  dock: Dock;
}

/**
 * Bottom dock when the target can clear the sheet there. Otherwise, for a target near the end of the page
 * that cannot scroll any higher, dock to the top. A target too tall for either goes where more of it shows.
 */
export function planPhoneScroll(el: HTMLElement, m: PhoneSheetMetrics, z: number): PhonePlan {
  const scroller = nearestScrollerRect(el);
  const scrollerTop = scroller.top / z;
  const scrollerBottom = scroller.bottom / z;
  const height = el.getBoundingClientRect().height / z;

  const bottomFree = m.sheetTop - m.gap - scrollerTop;
  const bottomPlan = planScroll(el, {
    marginTop: m.gap,
    marginBottom: Math.max(0, scrollerBottom - m.sheetTop + m.gap),
    block: height + m.gap > bottomFree ? 'start' : 'nearest',
  });
  const bottomRect = toZoomedRect(bottomPlan.rect, z);
  if (bottomRect.top + bottomRect.height + m.gap / 2 <= m.sheetTop) return { ...bottomPlan, dock: 'bottom' };

  const topFree = scrollerBottom - m.gap - m.dockedBottom;
  const topPlan = planScroll(el, {
    marginTop: Math.max(m.gap, m.dockedBottom + m.gap - scrollerTop),
    marginBottom: m.gap,
    block: height + m.gap > topFree ? 'start' : 'nearest',
  });
  const topRect = toZoomedRect(topPlan.rect, z);
  if (topRect.top - m.gap / 2 >= m.dockedBottom) return { ...topPlan, dock: 'top' };

  const shownBottom = Math.min(bottomRect.top + bottomRect.height, m.sheetTop) - Math.max(bottomRect.top, scrollerTop);
  const shownTop = Math.min(topRect.top + topRect.height, scrollerBottom) - Math.max(topRect.top, m.dockedBottom);
  return shownTop > shownBottom ? { ...topPlan, dock: 'top' } : { ...bottomPlan, dock: 'bottom' };
}

export interface Bounds {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

/** The target plus padding, kept inside the bounds so the ring never runs under the sheet or off the screen. */
export function holeFor(rect: Rect, pad: number, bounds: Bounds): Rect {
  const top = Math.max(bounds.top, rect.top - pad);
  const left = Math.max(bounds.left, rect.left - pad);
  const bottom = Math.max(top, Math.min(bounds.bottom, rect.top + rect.height + pad));
  const right = Math.max(left, Math.min(bounds.right, rect.left + rect.width + pad));
  return { top, left, width: right - left, height: bottom - top };
}

/** The sheet keeps clear of notches. The inset only exists as CSS, so read it through a probe element. */
export function safeTopInset(): number {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;visibility:hidden;height:max(0.5rem, env(safe-area-inset-top))';
  document.body.appendChild(probe);
  const inset = probe.offsetHeight;
  probe.remove();
  return inset || 8;
}
