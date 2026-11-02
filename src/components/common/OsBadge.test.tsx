import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { OsBadge, OsIcon } from './OsBadge';

describe('OsBadge Component', () => {
  it('renders Linux badge with yellow categorical tokens (cat-7)', () => {
    render(<OsBadge os="Linux" />);

    const label = screen.getByText('Linux');
    expect(label).toBeInTheDocument();

    const badge = label.closest('.inline-flex');
    expect(badge).toBeInTheDocument();
    // Cat-7 yellow tokens
    expect(badge?.className).toContain('bg-cat-7-bg');
    expect(badge?.className).toContain('text-cat-7-fg');
    expect(badge?.className).toContain('border-cat-7-border');
  });

  it('renders Windows badge with blue categorical tokens (cat-1)', () => {
    render(<OsBadge os="Windows" />);

    const label = screen.getByText('Windows');
    expect(label).toBeInTheDocument();

    const badge = label.closest('.inline-flex');
    expect(badge).toBeInTheDocument();
    expect(badge?.className).toContain('text-cat-1-fg');
  });

  it('renders Unknown / Other OS with neutral styling fallback', () => {
    render(<OsBadge os="Other" />);

    const label = screen.getByText('Other');
    expect(label).toBeInTheDocument();

    const badge = label.closest('.inline-flex');
    expect(badge).toBeInTheDocument();
    expect(badge?.className).toContain('bg-surface-sunken');
    expect(badge?.className).toContain('text-secondary');
  });

  it('hides label when showLabel is false', () => {
    render(<OsBadge os="Linux" showLabel={false} />);

    expect(screen.queryByText('Linux')).not.toBeInTheDocument();
  });

  it('applies hardware variant correctly', () => {
    render(<OsBadge os="Linux" variant="hardware" />);

    const label = screen.getByText('Linux');
    const badge = label.closest('.inline-flex');
    expect(badge).toBeInTheDocument();
    expect(badge?.className).toContain('bg-cat-7-bg');
  });

  it('renders OsIcon correctly with Tux SVG path for Linux', () => {
    const { container } = render(<OsIcon os="Linux" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.className.baseVal || svg?.getAttribute('class')).toContain('text-cat-7-fg');
  });

  it('renders OsBadge and OsIcon with yellow Tux styling for lowercase "linux"', () => {
    const { container } = render(<OsBadge os="linux" />);
    const badge = container.querySelector('.inline-flex');
    expect(badge).toBeInTheDocument();
    expect(badge?.className).toContain('bg-cat-7-bg');
    expect(badge?.className).toContain('text-cat-7-fg');

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.className.baseVal || svg?.getAttribute('class')).toContain('text-cat-7-fg');
  });
});
