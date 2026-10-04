import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton, SkeletonText, ViewSkeleton, CanvasSkeleton } from '../../components/common/Skeleton';

describe('Skeleton primitives', () => {
  it('Skeleton is aria-hidden, token-based and reduced-motion safe', () => {
    const { container } = render(<Skeleton width={40} height={10} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el.className).toContain('bg-surface-sunken');
    expect(el.className).toContain('motion-safe:animate-pulse');
    expect(el.style.width).toBe('40px');
  });

  it('SkeletonText renders the requested number of lines', () => {
    const { container } = render(<SkeletonText lines={4} />);
    expect(container.firstElementChild?.children.length).toBe(4);
  });

  it('ViewSkeleton exposes a polite status region with Loading label', () => {
    render(<ViewSkeleton cards={3} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Loading…');
  });

  it('CanvasSkeleton uses a custom label', () => {
    render(<CanvasSkeleton label="Loading attack graph…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading attack graph…');
  });
});
