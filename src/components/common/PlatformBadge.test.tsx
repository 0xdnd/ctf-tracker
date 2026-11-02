import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlatformBadge, PlatformIcon } from './PlatformBadge';

describe('PlatformBadge component', () => {
  it('exposes the full platform name via title and aria-label', () => {
    render(<PlatformBadge platform="HTB" size="sm" />);
    const el = screen.getByLabelText('Platform: Hack The Box');
    expect(el).toHaveAttribute('title', 'Platform: Hack The Box');
  });

  it('renders nothing when platform is empty', () => {
    const { container } = render(<PlatformBadge platform={'' as never} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders HTB platform badge with label and styling', () => {
    render(<PlatformBadge platform="HTB" />);

    const badge = screen.getByText('HTB');
    expect(badge).toBeInTheDocument();
    const container = badge.closest('.inline-flex');
    expect(container).toBeInTheDocument();
    expect(container?.className).toContain('text-cat-6-fg');
  });

  it('renders THM platform badge with label and styling', () => {
    render(<PlatformBadge platform="THM" />);

    const badge = screen.getByText('THM');
    expect(badge).toBeInTheDocument();
    const container = badge.closest('.inline-flex');
    expect(container).toBeInTheDocument();
    expect(container?.className).toContain('text-cat-5-fg');
  });

  it('renders Custom platform badge with neutral styling', () => {
    render(<PlatformBadge platform="Custom" />);

    const badge = screen.getByText('Custom');
    expect(badge).toBeInTheDocument();
    const container = badge.closest('.inline-flex');
    expect(container).toBeInTheDocument();
    expect(container?.className).toContain('bg-surface-sunken');
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

  it('renders single-colour official marks for PG and VulnHub, and keeps the placeholder for Custom', () => {
    const { container: pg } = render(<PlatformIcon platform="PG" />);
    expect(pg.querySelector('svg')).toHaveAttribute('viewBox', '0 0 24 24');
    expect(pg.querySelector('svg')).toHaveAttribute('fill', 'currentColor');
    expect(pg.querySelectorAll('path')).toHaveLength(1);

    const { container: vh } = render(<PlatformIcon platform="VulnHub" />);
    expect(vh.querySelector('svg')).toHaveAttribute('viewBox', '0 0 24 24');
    expect(vh.querySelector('svg')).toHaveAttribute('fill', 'currentColor');
    expect(vh.querySelectorAll('path').length).toBeGreaterThan(0);
    // No gradients or hard-coded colours: tone and monochrome variants rely on currentColor.
    for (const c of [pg, vh]) {
      expect(c.innerHTML).not.toMatch(/gradient|#[0-9a-f]{3,6}|url\(/i);
    }

    const { container: custom } = render(<PlatformIcon platform="Custom" />);
    expect(custom.querySelector('rect')).toBeInTheDocument();
  });
});
