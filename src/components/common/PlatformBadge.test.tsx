import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlatformBadge, PlatformIcon } from './PlatformBadge';

describe('PlatformBadge component', () => {
  it('renders HTB platform badge with label and styling', () => {
    render(<PlatformBadge platform="HTB" />);

    const badge = screen.getByText('HTB');
    expect(badge).toBeInTheDocument();
    const container = badge.closest('.inline-flex');
    expect(container).toBeInTheDocument();
    expect(container?.className).toContain('text-emerald-900');
  });

  it('renders THM platform badge with label and styling', () => {
    render(<PlatformBadge platform="THM" />);

    const badge = screen.getByText('THM');
    expect(badge).toBeInTheDocument();
    const container = badge.closest('.inline-flex');
    expect(container).toBeInTheDocument();
    expect(container?.className).toContain('text-red-900');
  });

  it('renders Custom platform badge with neutral styling', () => {
    render(<PlatformBadge platform="Custom" />);

    const badge = screen.getByText('Custom');
    expect(badge).toBeInTheDocument();
    const container = badge.closest('.inline-flex');
    expect(container).toBeInTheDocument();
    expect(container?.className).toContain('text-slate-800');
  });

  it('hides label when showLabel is false', () => {
    render(<PlatformBadge platform="HTB" showLabel={false} />);

    expect(screen.queryByText('HTB')).not.toBeInTheDocument();
  });

  it('applies custom size and className props', () => {
    render(<PlatformBadge platform="HTB" size="lg" className="custom-platform-class" />);

    const badge = screen.getByText('HTB');
    const container = badge.closest('.inline-flex');
    expect(container?.className).toContain('px-2.5');
    expect(container?.className).toContain('custom-platform-class');
  });

  it('renders PlatformIcon correctly for HTB, THM and custom', () => {
    const { container: htbContainer } = render(<PlatformIcon platform="HTB" />);
    expect(htbContainer.querySelector('svg')).toBeInTheDocument();

    const { container: thmContainer } = render(<PlatformIcon platform="THM" />);
    expect(thmContainer.querySelector('svg')).toBeInTheDocument();

    const { container: customContainer } = render(<PlatformIcon platform="Custom" />);
    expect(customContainer.querySelector('svg')).toBeInTheDocument();
  });
});
