import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { applyThemeToDOM, extractCoordinates } from './useTheme';

describe('useTheme engine & DOM synchronization', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('applies dark theme to DOM with dark class and dark color scheme', () => {
    applyThemeToDOM('dark', false);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('applies light theme to DOM with light class and light color scheme', () => {
    applyThemeToDOM('light', false);

    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('adds and cleans up theme-transition class when animated', () => {
    applyThemeToDOM('dark', true);

    expect(document.documentElement.classList.contains('theme-transition')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    vi.advanceTimersByTime(250);
    expect(document.documentElement.classList.contains('theme-transition')).toBe(false);
  });

  it('extracts coordinates correctly from various event types', () => {
    // 1. Direct coordinates object
    const coords = extractCoordinates({ x: 150, y: 300 });
    expect(coords).toEqual({ x: 150, y: 300 });

    // 2. MouseEvent-like object
    const mouseEvent = { clientX: 200, clientY: 450 } as unknown as React.MouseEvent;
    const fromMouse = extractCoordinates(mouseEvent);
    expect(fromMouse).toEqual({ x: 200, y: 450 });

    // 3. Undefined fallback to window center
    const fallback = extractCoordinates(undefined);
    expect(typeof fallback.x).toBe('number');
    expect(typeof fallback.y).toBe('number');
  });

  it('handles rapid sequential theme switches without throwing or corrupting DOM', () => {
    expect(() => {
      applyThemeToDOM('dark', true);
      applyThemeToDOM('light', true);
      applyThemeToDOM('dark', true);
      applyThemeToDOM('light', false);
    }).not.toThrow();

    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
