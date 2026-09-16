import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DifficultyBadge } from './DifficultyBadge';

describe('DifficultyBadge component', () => {
  it('renders the difficulty text and title attribute', () => {
    render(<DifficultyBadge difficulty="Medium" />);

    const badge = screen.getByText('Medium');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('title', 'Difficulty: Medium');
  });

  it('applies appropriate theme classes for Easy difficulty', () => {
    render(<DifficultyBadge difficulty="Easy" />);

    const badge = screen.getByText('Easy');
    expect(badge.className).toContain('emerald');
  });

  it('applies appropriate theme classes for Hard difficulty', () => {
    render(<DifficultyBadge difficulty="Hard" />);

    const badge = screen.getByText('Hard');
    expect(badge.className).toContain('rose');
  });

  it('applies custom size and className props', () => {
    render(<DifficultyBadge difficulty="Insane" size="md" className="custom-test-class" />);

    const badge = screen.getByText('Insane');
    expect(badge.className).toContain('px-2.5');
    expect(badge.className).toContain('custom-test-class');
  });
});
