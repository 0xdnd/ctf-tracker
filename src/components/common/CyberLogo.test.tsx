import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CyberLogo } from './CyberLogo';
import { useCtfStore } from '../../store/useCtfStore';

describe('CyberLogo component', () => {
  beforeEach(() => {
    act(() => {
      useCtfStore.setState({ themePreset: 'zerobox' });
    });
  });

  it('renders the default zerobox logo without any glow', () => {
    render(<CyberLogo />);

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('alt', 'ZeroBox logo - zerobox');
    expect(img).toHaveAttribute('src', '/logo-zerobox.webp');

    const container = screen.getByTitle('ZeroBox (zerobox)');
    expect(container).toBeInTheDocument();
    expect(container.className).not.toContain('drop-shadow');
  });

  it('renders the HTB logo when theme is htb', () => {
    render(<CyberLogo theme="htb" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'ZeroBox logo - htb');
    expect(img).toHaveAttribute('src', '/logo-htb.webp');
    expect(screen.getByTitle('ZeroBox (htb)').className).not.toContain('drop-shadow');
  });

  it('renders the Midnight Blue logo when theme is midnight-blue', () => {
    render(<CyberLogo theme="midnight-blue" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'ZeroBox logo - midnight-blue');
    expect(img).toHaveAttribute('src', '/logo-midnight.webp');
  });

  it('renders the OLED logo when theme is oled', () => {
    render(<CyberLogo theme="oled" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'ZeroBox logo - oled');
    expect(img).toHaveAttribute('src', '/logo-oled.webp');
  });

  it('reactively updates when store themePreset changes', () => {
    const { rerender } = render(<CyberLogo />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'ZeroBox logo - zerobox');

    act(() => {
      useCtfStore.setState({ themePreset: 'htb' });
    });
    rerender(<CyberLogo />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'ZeroBox logo - htb');
  });

  it('never renders a glow, even when the legacy glow prop is passed', () => {
    render(<CyberLogo glow />);

    const container = screen.getByTitle('ZeroBox (zerobox)');
    expect(container.className).not.toContain('drop-shadow');
  });

  it('applies the requested size classes', () => {
    const { rerender } = render(<CyberLogo size="sm" />);
    let container = screen.getByTitle('ZeroBox (zerobox)');
    expect(container.className).toContain('w-8 h-8');

    rerender(<CyberLogo size="2xl" />);
    container = screen.getByTitle('ZeroBox (zerobox)');
    expect(container.className).toContain('w-24 h-24');
  });

  it('has fetchpriority="high" and decoding="async" for optimal LCP performance', () => {
    render(<CyberLogo />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('fetchpriority', 'high');
    expect(img).toHaveAttribute('decoding', 'async');
  });
});
