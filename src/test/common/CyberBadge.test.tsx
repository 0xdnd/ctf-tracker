import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CyberBadge } from '../../components/common/CyberBadge';

describe('CyberBadge Primitive', () => {
  it('renders neutral badge with concentric radius and children', () => {
    render(<CyberBadge>PWN-READY</CyberBadge>);
    const badge = screen.getByText('PWN-READY');
    expect(badge).toBeInTheDocument();
    expect(badge.parentElement?.className).toContain('rounded');
    expect(badge.parentElement?.className).toContain('h-5');
  });

  it('renders indicator dot with appropriate variant color', () => {
    const { container } = render(<CyberBadge variant="success" dot>ACTIVE</CyberBadge>);
    const dot = container.querySelector('span[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
    expect(dot?.className).toContain('bg-callout-success-fg');
  });

  it('applies tabular-nums when mono is true', () => {
    const { container } = render(<CyberBadge mono>10.10.11.24</CyberBadge>);
    const span = container.querySelector('span');
    expect(span?.className).toContain('tabular-nums');
    expect(span?.className).toContain('font-mono');
  });
});
