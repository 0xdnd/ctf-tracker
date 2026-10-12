import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ThemePresetDropdown } from './ThemePresetDropdown';
import { useCtfStore } from '../../store/useCtfStore';

describe('ThemePresetDropdown component', () => {
  beforeEach(() => {
    act(() => {
      useCtfStore.setState({ themePreset: 'obsidian' });
    });
  });

  it('renders dropdown trigger button with active theme', () => {
    render(
      <MemoryRouter>
        <ThemePresetDropdown />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /obsidian/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens dropdown and displays the HTB option with its lime swatch and OLED description', () => {
    render(
      <MemoryRouter>
        <ThemePresetDropdown />
      </MemoryRouter>
    );

    const trigger = screen.getByRole('button', { name: /obsidian/i });
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Find HTB option
    const htbOption = screen.getByText('Hack The Box');
    expect(htbOption).toBeInTheDocument();

    // Verify the OLED description in the tagline
    const tagline = screen.getByText(/OLED black and official HTB lime/i);
    expect(tagline).toBeInTheDocument();

    // Verify #9fef00 dot color swatch is present
    const swatches = document.querySelectorAll('span[style*="background-color"]');
    const hasLimeDot = Array.from(swatches).some(
      (el) => (el as HTMLElement).style.backgroundColor === 'rgb(159, 239, 0)'
    );
    expect(hasLimeDot).toBe(true);
  });

  it('allows selecting the HTB preset and updates the store', () => {
    render(
      <MemoryRouter>
        <ThemePresetDropdown />
      </MemoryRouter>
    );

    const trigger = screen.getByRole('button', { name: /obsidian/i });
    fireEvent.click(trigger);

    const htbOption = screen.getByText('Hack The Box').closest('button');
    expect(htbOption).toBeInTheDocument();

    fireEvent.click(htbOption!);

    expect(useCtfStore.getState().themePreset).toBe('htb');
    expect(document.documentElement.getAttribute('data-theme')).toBe('htb');
  });
});
