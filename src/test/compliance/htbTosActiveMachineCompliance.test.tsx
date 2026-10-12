import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useCtfStore, sanitizeActiveMachine } from '../../store/useCtfStore';
import { Machine } from '../../types';
import { KanbanBoard } from '../../components/tracker/KanbanBoard';
import { GridView } from '../../components/tracker/GridView';
import { TableView } from '../../components/tracker/TableView';
import { TargetDetailPage } from '../../pages/TargetDetailPage';
import { MachineDetailModal } from '../../components/tracker/MachineDetailModal';
import { WriteupStudio } from '../../components/writeup/WriteupStudio';
import { PentestReportModal } from '../../components/writeup/PentestReportModal';

const activeMachineMock: Machine = {
  id: 'htb-active-valkyrie',
  name: 'Valkyrie',
  platform: 'HTB',
  os: 'Linux',
  difficulty: 'Medium',
  status: 'backlog',
  isActive: true,
  ip: '10.10.11.99', // should be sanitized
  tags: ['sqli', 'sudo-privesc'], // should be sanitized
  certifications: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  userFlag: 'HTB{leaked_user_flag}', // should be purged
  rootFlag: 'HTB{leaked_root_flag}', // should be purged
  hint: 'Check port 8080 for default credentials', // should be purged
  writeupUrl: 'https://0xdnd.gitbook.io/valkyrie', // should be purged
  writeupMarkdown: '# Valkyrie Writeup\nExploit SQLi at /login', // should be purged
  openPorts: [22, 80, 8080], // should be purged
  quickNotes: 'Sensitive notes here', // should be purged
  timeSpentSeconds: 0,
};

const retiredMachineMock: Machine = {
  id: 'htb-retired-lame',
  name: 'Lame',
  platform: 'HTB',
  os: 'Linux',
  difficulty: 'Easy',
  status: 'completed',
  isActive: false,
  ip: '10.10.10.3',
  tags: ['samba', 'cve-2007-2447'],
  certifications: ['OSCP', 'CPTS'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  userFlag: 'HTB{valid_user_flag}',
  rootFlag: 'HTB{valid_root_flag}',
  hint: 'Samba usermap script',
  writeupUrl: 'https://0xdnd.gitbook.io/lame',
  writeupMarkdown: '# Lame Writeup',
  openPorts: [21, 22, 139, 445],
  quickNotes: 'Samba vulnerability',
  timeSpentSeconds: 1200,
};

describe('Hack The Box Terms of Service (AUP §8.2) Name-Only Enforcement for Active Targets', () => {
  beforeEach(() => {
    const activeSanitized = sanitizeActiveMachine(activeMachineMock);
    const machinesList = [activeSanitized, retiredMachineMock];

    useCtfStore.getState().resetFilters();
    useCtfStore.setState({
      machines: machinesList,
      isCatalogLoaded: true,
      isDeepStorageLoaded: true,
      selectedMachineId: null,
      soundEnabled: false,
    });
  });

  describe('Store Layer: Data Sanitization & Quarantine', () => {
    it('purges all sensitive reconnaissance, flags, hints, notes, and tags for active machines', () => {
      const sanitized = sanitizeActiveMachine(activeMachineMock);
      expect(sanitized.isActive).toBe(true);
      expect(sanitized.name).toBe('Valkyrie');
      expect(sanitized.ip).toBe('');
      expect(sanitized.tags).toEqual([]);
      expect(sanitized.userFlag).toBe('');
      expect(sanitized.rootFlag).toBe('');
      expect(sanitized.hint).toBe('');
      expect(sanitized.writeupUrl).toBe('');
      expect(sanitized.writeupMarkdown).toBe('');
      expect(sanitized.openPorts).toEqual([]);
      expect(sanitized.quickNotes).toBe('');
      expect(sanitized.checklist).toBeUndefined();
    });

    it('preserves complete details for retired machines', () => {
      const preserved = sanitizeActiveMachine(retiredMachineMock);
      expect(preserved.isActive).toBe(false);
      expect(preserved.ip).toBe('10.10.10.3');
      expect(preserved.tags).toContain('samba');
      expect(preserved.userFlag).toBe('HTB{valid_user_flag}');
      expect(preserved.openPorts).toEqual([21, 22, 139, 445]);
    });

    it('rejects attempts to inject flags or IP onto an active machine via updateMachine', () => {
      useCtfStore.getState().updateMachine('htb-active-valkyrie', {
        userFlag: 'HTB{attempted_leak}',
        ip: '10.10.11.99',
        tags: ['attempted_tag'],
      });

      const updated = useCtfStore.getState().machines.find((m) => m.id === 'htb-active-valkyrie');
      expect(updated).toBeDefined();
      expect(updated?.userFlag).toBe('');
      expect(updated?.ip).toBe('');
      expect(updated?.tags).toEqual([]);
    });
  });

  describe('KanbanBoard View Compliance', () => {
    it('renders only the machine name and HTB ToS Protected indicator without IP or tags', () => {
      const machines = useCtfStore.getState().machines;
      render(
        <MemoryRouter>
          <KanbanBoard filteredMachines={machines} />
        </MemoryRouter>
      );

      // Active target name is visible
      expect(screen.getByText('Valkyrie')).toBeInTheDocument();

      // HTB ToS Protected badge is visible
      const protectedBadges = screen.getAllByText(/HTB ToS Protected/i);
      expect(protectedBadges.length).toBeGreaterThan(0);

      // Sensitive IP and tags are NOT rendered
      expect(screen.queryByText('10.10.11.99')).not.toBeInTheDocument();
      expect(screen.queryByText('sqli')).not.toBeInTheDocument();
      expect(screen.queryByText('HTB{leaked_user_flag}')).not.toBeInTheDocument();
    });
  });

  describe('GridView Compliance', () => {
    it('renders active target card with name and Protected badge while suppressing IP, tags, and hint spoilers', () => {
      const machines = useCtfStore.getState().machines;
      render(
        <MemoryRouter>
          <GridView filteredMachines={machines} />
        </MemoryRouter>
      );

      expect(screen.getByText('Valkyrie')).toBeInTheDocument();
      expect(screen.queryByText('10.10.11.99')).not.toBeInTheDocument();
      expect(screen.queryByText('sqli')).not.toBeInTheDocument();
      expect(screen.queryByText('Check port 8080 for default credentials')).not.toBeInTheDocument();

      // Flag action buttons are replaced with Protected
      const protectedElements = screen.getAllByText(/Protected/i);
      expect(protectedElements.length).toBeGreaterThan(0);
    });
  });

  describe('TableView Compliance', () => {
    it('masks IP column with HTB ToS Protected and hides sensitive vectors', () => {
      window.matchMedia = ((query: string) => ({
        matches: query.includes('max-width: 639px'),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      })) as any;

      const machines = useCtfStore.getState().machines;
      render(
        <MemoryRouter>
          <TableView filteredMachines={machines} />
        </MemoryRouter>
      );

      expect(screen.getByText('Valkyrie')).toBeInTheDocument();
      expect(screen.queryByText('10.10.11.99')).not.toBeInTheDocument();

      // Protected indicators present
      const protectedCells = screen.getAllByText(/HTB ToS Protected/i);
      expect(protectedCells.length).toBeGreaterThan(0);
    });
  });

  describe('TargetDetailPage Compliance', () => {
    it('renders dedicated HTB ToS compliance card and suppresses recon, flags, hints, notes, and tabs', () => {
      render(
        <MemoryRouter initialEntries={['/target/htb-active-valkyrie']}>
          <Routes>
            <Route path="/target/:id" element={<TargetDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Displays name and active policy badge
      expect(screen.getAllByText('Valkyrie').length).toBeGreaterThan(0);
      expect(screen.getByText(/Active Seasonal Target · Name Only/i)).toBeInTheDocument();
      expect(screen.getByText(/Hack The Box Terms of Service/i)).toBeInTheDocument();

      // Attack lifecycle, flags, tabs, and hint spoilers are completely hidden
      expect(screen.queryByText(/User Flag/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Root Flag/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Attack Lifecycle/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Checklist/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Arsenal/i)).not.toBeInTheDocument();
      expect(screen.queryByText('10.10.11.99')).not.toBeInTheDocument();
      expect(screen.queryByText('sqli')).not.toBeInTheDocument();
    });
  });

  describe('MachineDetailModal Compliance', () => {
    it('renders clean HTB ToS name-only card and hides all tabs and report buttons', () => {
      const activeSanitized = sanitizeActiveMachine(activeMachineMock);
      useCtfStore.setState({ selectedMachineId: activeSanitized.id });

      render(
        <MemoryRouter>
          <MachineDetailModal />
        </MemoryRouter>
      );

      expect(screen.getAllByText('Valkyrie').length).toBeGreaterThan(0);
      expect(screen.getByText(/Active Seasonal Target · Name Only/i)).toBeInTheDocument();
      expect(screen.getByText(/Hack The Box Terms of Service/i)).toBeInTheDocument();

      // Tabs are hidden
      expect(screen.queryByRole('tab', { name: /Arsenal/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: /Checklist/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: /Report/i })).not.toBeInTheDocument();

      // Action buttons for writeups and reports are hidden
      expect(screen.queryByText(/Writeup studio/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Pre-Report PDF/i)).not.toBeInTheDocument();
    });
  });

  describe('PentestReportModal Compliance', () => {
    it('blocks executive report generation and PoCs for active targets', () => {
      const activeSanitized = sanitizeActiveMachine(activeMachineMock);
      render(
        <MemoryRouter>
          <PentestReportModal
            machine={activeSanitized}
            isOpen={true}
            onClose={() => {}}
          />
        </MemoryRouter>
      );

      expect(screen.getByText(/Report Prohibited · Active Lab/i)).toBeInTheDocument();
      expect(screen.getByText(/Hack The Box Terms of Service/i)).toBeInTheDocument();
      expect(screen.queryByText(/Print \/ Save as PDF/i)).not.toBeInTheDocument();
    });
  });

  describe('WriteupStudio Compliance', () => {
    it('locks out editor workspace and prohibits writeups when active target is selected', () => {
      const activeSanitized = sanitizeActiveMachine(activeMachineMock);
      useCtfStore.setState({
        machines: [activeSanitized, retiredMachineMock],
      });

      render(
        <MemoryRouter initialEntries={['/writeup']}>
          <Routes>
            <Route path="/writeup" element={<WriteupStudio />} />
          </Routes>
        </MemoryRouter>
      );

      // Verify retired target is available in target selector
      const retiredTargets = screen.getAllByText(/Lame/i);
      expect(retiredTargets.length).toBeGreaterThan(0);
    });

    it('displays active target lockout message when an active target is selected in WriteupStudio', () => {
      const activeSanitized = sanitizeActiveMachine(activeMachineMock);
      useCtfStore.setState({
        machines: [activeSanitized],
      });

      render(
        <MemoryRouter initialEntries={['/writeup']}>
          <Routes>
            <Route path="/writeup" element={<WriteupStudio />} />
          </Routes>
        </MemoryRouter>
      );

      // Active target is locked out
      expect(screen.getByText(/Writeups Prohibited for Active Targets/i)).toBeInTheDocument();
      expect(screen.getByText(/Hack The Box Terms of Service/i)).toBeInTheDocument();
      // Ensure editor textarea is NOT rendered
      expect(screen.queryByLabelText(/Markdown report editor/i)).not.toBeInTheDocument();
    });
  });

  describe('Secondary Leak Preventions & Store Protections', () => {
    it('does not trigger QuickAssignIpModal or set global targetIp when engaging an active target', () => {
      const activeSanitized = sanitizeActiveMachine(activeMachineMock);
      useCtfStore.setState({
        machines: [activeSanitized],
        activeTargetId: null,
        assignIpMachineId: null,
        globalVars: { ...useCtfStore.getState().globalVars, targetIp: '10.10.10.3' },
      });

      useCtfStore.getState().setActiveTarget(activeSanitized.id);

      const state = useCtfStore.getState();
      expect(state.activeTargetId).toBe(activeSanitized.id);
      expect(state.assignIpMachineId).toBeNull();
      expect(state.globalVars.targetIp).toBe('10.10.10.3');
    });

    it('blocks setMachineOpenPorts and checklist mutation on active targets', () => {
      const activeSanitized = sanitizeActiveMachine(activeMachineMock);
      useCtfStore.setState({
        machines: [activeSanitized],
      });

      useCtfStore.getState().setMachineOpenPorts(activeSanitized.id, [80, 443]);
      useCtfStore.getState().setChecklistItemStatus(activeSanitized.id, 'p01-fast-syn', 'done');

      const machine = useCtfStore.getState().machines.find(m => m.id === activeSanitized.id);
      expect(machine?.openPorts).toEqual([]);
      expect(machine?.checklist).toBeUndefined();
    });

    it('does not render Import scan & payloads or Pre-report buttons in MachineDetailModal for active target', () => {
      const activeSanitized = sanitizeActiveMachine(activeMachineMock);
      useCtfStore.setState({
        machines: [activeSanitized],
        selectedMachineId: activeSanitized.id,
      });

      render(
        <MemoryRouter>
          <MachineDetailModal />
        </MemoryRouter>
      );

      expect(screen.queryByText(/Import scan & payloads/i)).not.toBeInTheDocument();
      expect(screen.queryByTitle(/Open Executive Pentest Pre-Report/i)).not.toBeInTheDocument();
    });

    it('does not render Writeup Studio in TargetDetailPage header actions for active target', () => {
      const activeSanitized = sanitizeActiveMachine(activeMachineMock);
      useCtfStore.setState({
        machines: [activeSanitized],
      });

      render(
        <MemoryRouter initialEntries={[`/target/${activeSanitized.id}`]}>
          <Routes>
            <Route path="/target/:id" element={<TargetDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByText('Writeup Studio')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Enter Focus Mode')).not.toBeInTheDocument();
    });
  });
});
