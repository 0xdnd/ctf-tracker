import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

describe('Sidebar component', () => {
  it('renders collapse toggle button and aside without overflow-hidden', () => {
    const { container } = render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    const aside = container.querySelector('aside');
    expect(aside).toBeInTheDocument();
    // Aside must NOT have overflow-hidden so the floating collapse button is not clipped
    expect(aside?.className).not.toContain('overflow-hidden');

    const toggleBtn = screen.getByRole('button', { name: /Collapse Sidebar/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn.className).toContain('-right-3');
  });

  it('toggles collapse state when clicking the arrow button', () => {
    const { container } = render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    const aside = container.querySelector('aside');
    expect(aside?.className).toContain('w-72');

    const toggleBtn = screen.getByRole('button', { name: /Collapse Sidebar/i });
    fireEvent.click(toggleBtn);

    expect(aside?.className).toContain('w-16');
    expect(screen.getByRole('button', { name: /Expand Sidebar/i })).toBeInTheDocument();
  });
});
