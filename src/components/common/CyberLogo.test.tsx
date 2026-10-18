import React from 'react';
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

  it('renders default zerobox logo and glowing container', () => {
    render(<CyberLogo />);

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('alt', 'ZeroBox Tactical Cyber Operations - zerobox');

    const container = screen.getByTitle(/ZEROBOX \/\/ TACTICAL CYBER OPERATIONS/i);
    expect(container).toBeInTheDocument();
    expect(container.className).toContain('rgba(0,240,255');
  });

  it('renders HTB lime green logo and glow when theme is htb', () => {
    render(<CyberLogo theme="htb" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'ZeroBox Tactical Cyber Operations - htb');

    const container = screen.getByTitle(/ZEROBOX \/\/ TACTICAL CYBER OPERATIONS \(HTB\)/i);
    expect(container.className).toContain('rgba(159,239,0');
  });

  it('renders Midnight Blue logo and sky blue glow when theme is midnight-blue', () => {
    render(<CyberLogo theme="midnight-blue" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'ZeroBox Tactical Cyber Operations - midnight-blue');

    const container = screen.getByTitle(/ZEROBOX \/\/ TACTICAL CYBER OPERATIONS \(MIDNIGHT-BLUE\)/i);
    expect(container.className).toContain('rgba(56,189,248');
  });

  it('renders OLED logo and ice glow when theme is oled', () => {
    render(<CyberLogo theme="oled" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'ZeroBox Tactical Cyber Operations - oled');

    const container = screen.getByTitle(/ZEROBOX \/\/ TACTICAL CYBER OPERATIONS \(OLED\)/i);
    expect(container.className).toContain('rgba(56,189,248');
  });

  it('reactively updates when store themePreset changes', () => {
    const { rerender } = render(<CyberLogo />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'ZeroBox Tactical Cyber Operations - zerobox');

    act(() => {
      useCtfStore.setState({ themePreset: 'htb' });
    });
    rerender(<CyberLogo />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'ZeroBox Tactical Cyber Operations - htb');
  });

  it('supports disabling the glow effect', () => {
    render(<CyberLogo glow={false} />);

    const container = screen.getByTitle(/ZEROBOX \/\/ TACTICAL CYBER OPERATIONS/i);
    expect(container.className).not.toContain('drop-shadow');
  });

  it('applies the requested size classes', () => {
    const { rerender } = render(<CyberLogo size="sm" />);
    let container = screen.getByTitle(/ZEROBOX \/\/ TACTICAL CYBER OPERATIONS/i);
    expect(container.className).toContain('w-8 h-8');

    rerender(<CyberLogo size="2xl" />);
    container = screen.getByTitle(/ZEROBOX \/\/ TACTICAL CYBER OPERATIONS/i);
    expect(container.className).toContain('w-24 h-24');
  });
});
