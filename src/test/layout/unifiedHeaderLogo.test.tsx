import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UnifiedHeader } from '../../components/layout/UnifiedHeader';

const logoLink = () => screen.getByTitle('ZeroBox').closest('a') as HTMLAnchorElement;

describe('UnifiedHeader logo target', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('links to the public home page on the web build', () => {
    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );
    expect(logoLink().getAttribute('href')).toBe('/');
  });

  it('keeps the in-app /tracker route on the desktop build', () => {
    vi.stubEnv('VITE_TARGET', 'tauri');
    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );
    expect(logoLink().getAttribute('href')).toBe('/tracker');
  });
});
