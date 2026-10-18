import { render, screen, fireEvent, waitFor, cleanup, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import { SnippetsDrawer } from '../../components/layout/SnippetsDrawer';
import { CheatsheetView } from '../../components/cheatsheet/CheatsheetView';
import { ChecklistWorkspace } from '../../components/checklist/ChecklistWorkspace';
import { MethodologyPage } from '../../pages/MethodologyPage';
import { MASTER_METHODOLOGY_FRAMEWORK } from '../../data/methodologyFramework';
import { useEffectiveGlobalVars, selectActiveTargetIp } from '../../hooks/useActiveTargetIp';
import { interpolateCommand } from '../../utils/helpers';

// One precedence rule everywhere: the engaged machine's IP beats the global
// RHOST for both `{TARGET_IP}` and legacy `{ip}`, in every view.

const GLOBAL_RHOST = '10.10.11.5';
const ENGAGED_IP = '10.10.11.77';
const TEMPLATE = 'curl {TARGET_IP} && ping {ip}';
const EXPECTED = `curl ${ENGAGED_IP} && ping ${ENGAGED_IP}`;

const GLOBAL_VARS = {
  lhost: '10.10.14.2',
  lport: '9001',
  targetIp: GLOBAL_RHOST,
  interface: 'tun0',
  customVars: {},
};

const ENGAGED_MACHINE = {
  id: 'engaged-box',
  name: 'Engaged',
  ip: ENGAGED_IP,
  os: 'Linux',
  platform: 'HTB',
  difficulty: 'Easy',
  status: 'backlog',
  tags: [],
  certifications: [],
  roomUrl: '',
  timeSpentSeconds: 0,
  openPorts: [80],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeAll(() => {
  if (!window.matchMedia) {
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
  (globalThis as any).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
});

beforeEach(() => {
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
  useCtfStore.setState({
    globalVars: GLOBAL_VARS,
    machines: [ENGAGED_MACHINE],
    activeTargetId: ENGAGED_MACHINE.id,
    soundEnabled: false,
    snippetsDrawerOpen: false,
    cheatsheets: [
      {
        id: 'prec-test',
        title: 'Precedence Test',
        category: 'network',
        description: 'test',
        commandTemplate: TEMPLATE,
        tags: ['test'],
      },
    ],
  } as any);
});

afterEach(() => cleanup());

describe('engaged-target precedence across views', () => {
  it('SnippetsDrawer resolves {TARGET_IP} and {ip} to the engaged IP', async () => {
    useCtfStore.setState({ snippetsDrawerOpen: true } as any);
    render(
      <MemoryRouter>
        <SnippetsDrawer />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('Copy'));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(EXPECTED);
    });
  });

  it('CheatsheetView resolves {TARGET_IP} and {ip} to the engaged IP', async () => {
    render(
      <MemoryRouter initialEntries={['/cheatsheet']}>
        <CheatsheetView defaultMode="tactical" />
      </MemoryRouter>
    );
    const copyButtons = await screen.findAllByRole('button', { name: /^Copy$/ });
    fireEvent.click(copyButtons[0]);
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(EXPECTED);
    });
  });

  it('CheatsheetView falls back to the global RHOST when no target is engaged', async () => {
    useCtfStore.setState({ activeTargetId: null } as any);
    render(
      <MemoryRouter initialEntries={['/cheatsheet']}>
        <CheatsheetView defaultMode="tactical" />
      </MemoryRouter>
    );
    const copyButtons = await screen.findAllByRole('button', { name: /^Copy$/ });
    fireEvent.click(copyButtons[0]);
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`curl ${GLOBAL_RHOST} && ping ${GLOBAL_RHOST}`);
    });
  });

  it('ChecklistWorkspace (interpolateCommand consumer) shows the engaged IP, not the global RHOST', () => {
    render(<ChecklistWorkspace machine={ENGAGED_MACHINE as any} />);
    const engaged = screen.getAllByText(new RegExp(ENGAGED_IP.replace(/\./g, '\\.')));
    expect(engaged.length).toBeGreaterThan(0);
    expect(screen.queryAllByText(new RegExp(GLOBAL_RHOST.replace(/\./g, '\\.') + '(?!\\d)')).length).toBe(0);
  });

  describe('MethodologyPage', () => {
    const original = new Map<object, string | undefined>();

    beforeEach(() => {
      for (const phase of MASTER_METHODOLOGY_FRAMEWORK) {
        for (const sub of phase.subcategories) {
          for (const item of sub.items) {
            original.set(item, item.commandSnippet);
            item.commandSnippet = TEMPLATE;
          }
        }
      }
    });

    afterEach(() => {
      original.forEach((snippet, item) => {
        (item as { commandSnippet?: string }).commandSnippet = snippet;
      });
      original.clear();
    });

    it('resolves {TARGET_IP} and {ip} to the engaged IP', async () => {
      render(
        <MemoryRouter>
          <MethodologyPage />
        </MemoryRouter>
      );
      const copyButtons = await screen.findAllByTitle('Copy command to clipboard');
      fireEvent.click(copyButtons[0]);
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(EXPECTED);
      });
    });
  });

  it('shared helper: selectActiveTargetIp + useEffectiveGlobalVars + interpolateCommand agree', () => {
    expect(selectActiveTargetIp(useCtfStore.getState())).toBe(ENGAGED_IP);
    const { result } = renderHook(() => useEffectiveGlobalVars(GLOBAL_VARS));
    expect(result.current.targetIp).toBe(ENGAGED_IP);
    expect(interpolateCommand(TEMPLATE, result.current)).toBe(EXPECTED);

    useCtfStore.setState({ activeTargetId: null } as any);
    expect(selectActiveTargetIp(useCtfStore.getState())).toBeUndefined();
    const fallback = renderHook(() => useEffectiveGlobalVars(GLOBAL_VARS));
    expect(fallback.result.current.targetIp).toBe(GLOBAL_RHOST);
  });
});
