import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { ALL_SHELL_ITEMS } from '../../data/revshellsData';
import {
  ReverseShellGenerator,
  isTemplateCompatibleWithShellBinary,
} from '../../components/cheatsheet/ReverseShellGenerator';

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

/** The payload chip currently marked selected, resolved back to its catalog entry (scoped to the
 * chip list, since the shell-binary buttons also carry aria-pressed). */
function activeTemplate() {
  const chipList = document.querySelector('[data-tour="rs-payloads"]');
  if (!chipList) throw new Error('payload chip list not found');
  const pressed = within(chipList as HTMLElement).getByRole('button', { pressed: true, name: /.+/ });
  const name = pressed.querySelector('span')?.textContent;
  const found = ALL_SHELL_ITEMS.find((s) => s.name === name);
  if (!found) throw new Error(`active chip "${name}" not found in catalog`);
  return found;
}

describe('ReverseShellGenerator: interpreter / payload compatibility', () => {
  afterEach(() => cleanup());

  it('switches off the default payload when a Windows interpreter is chosen, to one compatible with it', () => {
    render(<ReverseShellGenerator />);
    // Default payload is the Linux "Bash -i" one-liner
    expect(activeTemplate().id).toBe('rev-bash-i');

    fireEvent.click(screen.getByRole('button', { name: 'powershell' }));

    expect(screen.getByTestId('revshell-compat-notice')).toHaveTextContent(/switched the payload/i);
    const nowActive = activeTemplate();
    expect(nowActive.id).not.toBe('rev-bash-i');
    expect(isTemplateCompatibleWithShellBinary(nowActive, 'powershell')).toBe(true);
  });

  it('switches the interpreter when a Windows-only payload is picked while using a Linux binary', () => {
    render(<ReverseShellGenerator />);
    fireEvent.change(screen.getByLabelText('Filter reverse shell payloads'), { target: { value: 'nc.exe -e' } });
    fireEvent.click(screen.getByRole('button', { name: /^nc\.exe -e$/ }));

    expect(screen.getByTestId('revshell-compat-notice')).toHaveTextContent(/switched the interpreter/i);
    expect(activeTemplate().id).toBe('rev-nc-exe-e');
    const psBtn = screen.getByRole('button', { name: 'powershell' });
    const shBtn = screen.getByRole('button', { name: 'sh' });
    // One of the two Windows interpreters is now the active (highlighted) one
    expect(psBtn.className).not.toBe(shBtn.className);
  });

  it('keeps the current payload when the new interpreter is already compatible', () => {
    render(<ReverseShellGenerator />);
    fireEvent.click(screen.getByRole('button', { name: 'sh' }));
    expect(screen.queryByTestId('revshell-compat-notice')).toBeNull();
    expect(activeTemplate().id).toBe('rev-bash-i');
  });

  it('marks the active interpreter with aria-pressed and every selection lands on a template of its own family', () => {
    render(<ReverseShellGenerator />);
    const cases: Array<{ bin: string; family: 'Linux' | 'Windows' }> = [
      { bin: 'powershell', family: 'Windows' },
      { bin: 'cmd.exe', family: 'Windows' },
      { bin: '/bin/bash'.replace('/bin/', ''), family: 'Linux' }, // 'bash'
      { bin: '/bin/sh'.replace('/bin/', ''), family: 'Linux' }, // 'sh'
    ];
    for (const { bin, family } of cases) {
      fireEvent.click(screen.getByRole('button', { name: bin }));
      expect(screen.getByRole('button', { name: bin })).toHaveAttribute('aria-pressed', 'true');
      const landed = activeTemplate();
      expect(isTemplateCompatibleWithShellBinary(landed, bin === 'bash' ? '/bin/bash' : bin === 'sh' ? '/bin/sh' : bin)).toBe(
        true
      );
      // Strict family: a platform-neutral template is not a valid landing for a chosen interpreter.
      const own = family === 'Windows' ? ['Windows'] : ['Linux', 'macOS'];
      expect(own).toContain(landed.platform);
    }
  });
});
