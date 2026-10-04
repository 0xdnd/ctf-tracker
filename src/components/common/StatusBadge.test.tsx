import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge Component (Zero Layout Shift Contract)', () => {
  it('renders Recon status with fixed width and tabular-nums', () => {
    const { container } = render(<StatusBadge status="recon" />);
    expect(screen.getByText('RECON')).toBeInTheDocument();
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('w-[74px]');
    expect(badge?.className).toContain('tabular-nums');
  });

  it('renders Foothold status with matching fixed dimensions', () => {
    const { container } = render(<StatusBadge status="foothold" />);
    expect(screen.getByText('FOOTHOLD')).toBeInTheDocument();
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('w-[74px]');
  });

  it('renders Pwned / Root status with exact dimensions', () => {
    const { container } = render(<StatusBadge status="root" />);
    expect(screen.getByText('PWNED')).toBeInTheDocument();
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('w-[74px]');
  });

  it('renders Backlog status', () => {
    render(<StatusBadge status="backlog" />);
    expect(screen.getByText('BACKLOG')).toBeInTheDocument();
  });
});
