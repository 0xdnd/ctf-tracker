import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import { SnippetsDrawer } from '../../components/layout/SnippetsDrawer';
import { CheatsheetView } from '../../components/cheatsheet/CheatsheetView';
import { MethodologyPage } from '../../pages/MethodologyPage';
import { MASTER_METHODOLOGY_FRAMEWORK } from '../../data/methodologyFramework';
import { resolveTemplate, contextFromGlobalVars } from '../../utils/variableSubstitution';

// Regression guard: lowercase `{ip}` means the TARGET for every user /
// cheatsheet / methodology surface (legacy mode) and LHOST only for revshell
// templates (non-legacy mode). ZeroBox copies commands to the clipboard, so a
// wrong resolution points a command at the wrong host.

const LHOST = '10.10.14.2';
const TARGET = '10.10.11.5';
const TEMPLATE = 'nmap -p- {ip}';
const EXPECTED = `nmap -p- ${TARGET}`;

const GLOBAL_VARS = {
  lhost: LHOST,
  lport: '9001',
  targetIp: TARGET,
  interface: 'tun0',
  customVars: {},
};

const CHEATSHEET = [
  {
    id: 'mode-test',
    title: 'Mode Test Command',
    category: 'network',
    description: 'test',
    commandTemplate: TEMPLATE,
    tags: ['test'],
  },
];

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
    machines: [],
    activeTargetId: null,
    soundEnabled: false,
    cheatsheets: CHEATSHEET,
    snippetsDrawerOpen: false,
  } as any);
});

afterEach(() => cleanup());

describe('legacy vs non-legacy {ip} resolution', () => {
  it('SnippetsDrawer copies `{ip}` as the TARGET (not LHOST)', async () => {
    useCtfStore.setState({ snippetsDrawerOpen: true } as any);
    render(
      <MemoryRouter>
        <SnippetsDrawer />
      </MemoryRouter>
    );
    expect(screen.getByText(EXPECTED)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Copy'));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(EXPECTED);
    });
  });

  it('SnippetsDrawer does not report `{ip}` as an unresolved LHOST', () => {
    useCtfStore.setState({
      snippetsDrawerOpen: true,
      globalVars: { ...GLOBAL_VARS, lhost: '' },
    } as any);
    render(
      <MemoryRouter>
        <SnippetsDrawer />
      </MemoryRouter>
    );
    expect(screen.queryByText('Missing:', { exact: false })).not.toBeInTheDocument();
  });

  it('CheatsheetView resolves the same template identically to the drawer', async () => {
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

    it('resolves `{ip}` in a methodology command to the target', async () => {
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

  it('revshell templates (non-legacy) still resolve `{ip}` to LHOST', () => {
    const ctx = contextFromGlobalVars(GLOBAL_VARS as any);
    expect(resolveTemplate('/dev/tcp/{ip}/{port}', ctx).text).toBe(`/dev/tcp/${LHOST}/9001`);
    // ...while the legacy mode on the same context targets the box.
    expect(resolveTemplate('nmap {ip}', ctx, { legacyAliases: true }).text).toBe(`nmap ${TARGET}`);
  });
});
