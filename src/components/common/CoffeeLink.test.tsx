import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { CoffeeLink, COFFEE_URL } from './CoffeeLink';
import { Sidebar } from '../layout/Sidebar';

describe('Buy me a coffee link', () => {
  it('is a plain external link to the right profile', () => {
    render(<CoffeeLink />);
    const a = screen.getByRole('link', { name: /buy me a coffee/i });
    expect(COFFEE_URL).toBe('https://buymeacoffee.com/0xdnd');
    expect(a.getAttribute('href')).toBe('https://buymeacoffee.com/0xdnd');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(a.querySelector('svg')).not.toBeNull();
  });

  it('is in the sidebar footer next to Privacy and Terms', () => {
    render(<BrowserRouter><Sidebar /></BrowserRouter>);
    expect(screen.getByRole('link', { name: /buy me a coffee/i }).getAttribute('href')).toBe('https://buymeacoffee.com/0xdnd');
  });
});
