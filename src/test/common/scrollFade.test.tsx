import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { ScrollFade } from '../../components/common/ScrollFade';

const metrics = (el: HTMLElement, m: Partial<Record<'scrollWidth' | 'clientWidth' | 'scrollHeight' | 'clientHeight' | 'scrollLeft' | 'scrollTop', number>>) => {
  for (const [k, v] of Object.entries(m)) Object.defineProperty(el, k, { configurable: true, writable: true, value: v });
};

const maskOf = (el: HTMLElement) => el.style.maskImage || el.style.getPropertyValue('-webkit-mask-image') || '';

describe('ScrollFade', () => {
  afterEach(() => cleanup());

  it('shows no fade while the content fits', () => {
    const { getByTestId } = render(<ScrollFade data-testid="s">x</ScrollFade>);
    expect(maskOf(getByTestId('s'))).toBe('');
  });

  it('fades the end of a horizontal scroller that overflows, then the start once scrolled', () => {
    const ref = React.createRef<HTMLDivElement>();
    const { getByTestId } = render(
      <ScrollFade ref={ref} data-testid="s" fadeSize="56px">
        <span>x</span>
      </ScrollFade>
    );
    const el = getByTestId('s');
    expect(ref.current).toBe(el);
    metrics(el, { scrollWidth: 500, clientWidth: 100, scrollLeft: 0 });
    fireEvent.scroll(el);
    expect(maskOf(el)).toContain('to right');
    expect(maskOf(el)).toContain('black calc(100% - 56px), transparent)');
    expect(maskOf(el)).not.toMatch(/^linear-gradient\(to right, transparent/);
    metrics(el, { scrollLeft: 50 });
    fireEvent.scroll(el);
    expect(maskOf(el)).toMatch(/^linear-gradient\(to right, transparent/);
  });

  it('supports the vertical axis with an end-only fade', () => {
    const { getByTestId } = render(
      <ScrollFade data-testid="s" axis="y" fade="end" fadeSize="28px">
        <span>x</span>
      </ScrollFade>
    );
    const el = getByTestId('s');
    metrics(el, { scrollHeight: 900, clientHeight: 300, scrollTop: 100 });
    fireEvent.scroll(el);
    expect(maskOf(el)).toContain('calc(100% - 28px)');
    expect(maskOf(el)).not.toContain('to right');
    expect(maskOf(el)).not.toMatch(/^linear-gradient\((to bottom, )?transparent/);
    metrics(el, { scrollTop: 600 });
    fireEvent.scroll(el);
    expect(maskOf(el)).toBe('');
  });
});
