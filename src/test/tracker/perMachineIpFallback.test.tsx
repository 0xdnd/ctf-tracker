import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import { WriteupStudio } from '../../components/writeup/WriteupStudio';
import { MachineDetailModal } from '../../components/tracker/MachineDetailModal';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';

// A per-machine view (writeup studio / machine modal) must never resolve
// {TARGET_IP} to a DIFFERENT machine's IP just because that one is engaged.
// A machine without its own IP falls back to the global RHOST only.

const ENGAGED_IP = '10.10.11.7';

const baseMachine = {
  os: 'Linux',
  platform: 'HTB',
  difficulty: 'Easy',
  status: 'backlog',
  tags: ['recon'],
  certifications: [],
  roomUrl: '',
  timeSpentSeconds: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
const MACHINE_A = { ...baseMachine, id: 'box-a', name: 'Alpha', ip: '', isActive: false };
const MACHINE_B = { ...baseMachine, id: 'box-b', name: 'Bravo', ip: ENGAGED_IP, isActive: false };

const NOTE: CptsNoteEntry = {
  id: 'ip-note',
  title: 'Recon Note',
  titleEn: 'Recon Note',
  category: '01 Recon',
  rawCategory: '01 Recon',
  subCategory: 'Scanning',
  tags: ['recon'],
  difficulty: 'Easy',
  summary: 'fixture',
  commands: ['probe {TARGET_IP}'],
  relPath: '01 Recon/ip-note.md',
  filename: 'ip-note',
  rawMarkdown: '# Recon Note\n\n```bash\nprobe {TARGET_IP}\n```',
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
  useCtfStore.setState({
    globalVars: { lhost: '10.10.14.2', lport: '9001', targetIp: '', interface: 'tun0', customVars: {} },
    machines: [MACHINE_A, MACHINE_B],
    activeTargetId: MACHINE_B.id,
    writeupMachineId: MACHINE_A.id,
    selectedMachineId: null,
    customNotes: [NOTE],
    userNotes: [],
    soundEnabled: false,
  } as any);
});

afterEach(() => cleanup());

describe('per-machine views never borrow the engaged machine IP', () => {
  it('WriteupStudio: machine A (no IP) does not resolve {TARGET_IP} to engaged B', () => {
    render(
      <MemoryRouter>
        <WriteupStudio />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByTitle('Toggle the quick reference from your notes'));
    const region = screen.getByRole('region', { name: 'Matching notes' });
    expect(region.textContent).toContain('probe');
    expect(region.textContent).not.toContain(ENGAGED_IP);

    // Inserting the note into the writeup must not persist B's IP into A's markdown.
    // Target the note's own Insert button (the toolbar also has a disabled "Insert lab summary" button).
    fireEvent.click(screen.getAllByTitle('Insert this note and commands into active writeup')[0]);
    const saved = useCtfStore.getState().machines.find((m) => m.id === MACHINE_A.id)?.writeupMarkdown ?? '';
    expect(saved).toContain('probe');
    expect(saved).not.toContain(ENGAGED_IP);
  });

  it('MachineDetailModal: machine A (no IP) does not resolve {TARGET_IP} to engaged B', () => {
    useCtfStore.setState({ selectedMachineId: MACHINE_A.id } as any);
    render(
      <MemoryRouter>
        <MachineDetailModal />
      </MemoryRouter>
    );
    expect(screen.getByText(/Related notes from your vault/i)).toBeInTheDocument();
    expect(screen.getAllByText(/probe/).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain(ENGAGED_IP);
  });
});
