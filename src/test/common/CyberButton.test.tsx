import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CyberButton } from '../../components/common/CyberButton';

describe('CyberButton Primitive', () => {
  it('renders children with tactile tap class and default variant', () => {
    render(<CyberButton>Deploy Exploit</CyberButton>);
    const button = screen.getByRole('button', { name: /Deploy Exploit/i });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain('active:scale-[0.97]');
    expect(button.className).toContain('machined-edge');
  });

  it('handles click events and disabled state properly', () => {
    const handleClick = vi.fn();
    const { rerender } = render(<CyberButton onClick={handleClick}>Click Me</CyberButton>);
    fireEvent.click(screen.getByRole('button', { name: /Click Me/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);

    rerender(<CyberButton onClick={handleClick} disabled>Click Me</CyberButton>);
    fireEvent.click(screen.getByRole('button', { name: /Click Me/i }));
    expect(handleClick).toHaveBeenCalledTimes(1); // not called again
  });

  it('renders loading spinner and sets aria-busy', () => {
    render(<CyberButton isLoading>Saving...</CyberButton>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
  });
});
