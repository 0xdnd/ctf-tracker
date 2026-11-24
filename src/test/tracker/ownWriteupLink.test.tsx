import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import { MachineDetailModal } from '../../components/tracker/MachineDetailModal';

const baseMachine = {
  os: 'Linux',
  platform: 'HTB',
  difficulty: 'Easy',
  status: 'completed',
  tags: [],
  certifications: [],
  roomUrl: '',
  ip: '',
  isActive: false,
  timeSpentSeconds: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
const WITH_OWN = { ...baseMachine, id: 'htb-cap', name: 'Cap', writeupUrl: 'https://0xdnd.gitbook.io/x/cap', officialPdf: '351-Cap_HTB_Official_writeup_Tamarisk.pdf' };
const WITHOUT_OWN = { ...baseMachine, platform: 'THM', id: 'box-none', name: 'None', writeupUrl: 'https://0xdnd.gitbook.io/x/none' };

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
  (globalThis as unknown as Record<string, unknown>).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
});

beforeEach(() => {
  useCtfStore.setState({ machines: [WITH_OWN, WITHOUT_OWN], selectedMachineId: null, soundEnabled: false } as never);
});

afterEach(() => cleanup());

const open = (id: string) => {
  useCtfStore.setState({ selectedMachineId: id } as never);
  render(
    <MemoryRouter>
      <MachineDetailModal />
    </MemoryRouter>
  );
};

describe('machine panel own-writeup link', () => {
  it('shows own "Writeup" plus an IppSec video search for an HTB machine, and no 0xdf link', () => {
    open('htb-cap');
    const mine = screen.getByRole('link', { name: /^Writeup$/ });
    expect(mine).toHaveAttribute('href', '/machines/htb-cap/#writeup');
    expect(mine).not.toHaveAttribute('target');
    expect(screen.getByRole('link', { name: /IppSec video/ })).toHaveAttribute(
      'href',
      'https://www.youtube.com/results?search_query=ippsec%20HackTheBox%20Cap'
    );
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href') || '');
    expect(hrefs.some((h) => h.includes('0xdf.gitlab.io') || h.includes('0xdnd.gitbook.io'))).toBe(false);
  });

  it('keeps a single external "Writeup" link for a machine without an own writeup', () => {
    open('box-none');
    expect(screen.queryByRole('link', { name: /Community writeup/ })).not.toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: /^Writeup/ });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', WITHOUT_OWN.writeupUrl);
  });

  it('shows a clean official source name and keeps the raw filename only as a title', () => {
    open('htb-cap');
    fireEvent.click(screen.getByRole('tab', { name: /Official intel/ }));
    expect(screen.getByText('Source:')).toBeInTheDocument();
    const clean = screen.getByText('Cap — HTB Official Writeup');
    expect(clean).toHaveAttribute('title', WITH_OWN.officialPdf);
    expect(screen.queryByText(WITH_OWN.officialPdf)).not.toBeInTheDocument();
  });
});

describe('machine panel phone overflow menu', () => {
  const original = window.matchMedia;
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('max-width: 639px'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    useCtfStore.setState({
      machines: [{ ...WITHOUT_OWN, id: 'box-phone', ip: '10.10.x.x', roomUrl: 'https://tryhackme.com/room/none' }],
    } as never);
  });
  afterEach(() => {
    window.matchMedia = original;
  });

  it('keeps Assign IP, Official room and the community writeup reachable from More actions', async () => {
    open('box-phone');
    fireEvent.click((await screen.findAllByRole('button', { name: 'More actions' }))[0]);
    for (const name of [/Assign IP/, /Official room/, /Writeup/]) {
      expect(await screen.findByRole('menuitem', { name })).toBeInTheDocument();
    }
  });
});
