import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import { DomainVhostSection } from '../../components/tracker/DomainVhostSection';
import { PortTriageTable } from '../../components/tracker/PortTriageTable';
import { LabFindingsPanel } from '../../components/tracker/LabFindingsPanel';
import { LabTimelineAndIndependence } from '../../components/tracker/LabTimelineAndIndependence';
import { Machine } from '../../types';

const testMachine: Machine = {
  id: 'htb-testbox',
  name: 'TestBox',
  ip: '10.10.11.200',
  os: 'Linux',
  platform: 'HTB',
  difficulty: 'Easy',
  status: 'recon',
  tags: ['web'],
  certifications: ['OSCP'],
  timeSpentSeconds: 120,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  domain: 'testbox.htb',
  vhosts: ['api.testbox.htb'],
  openPorts: [80, 22],
  services: [
    { port: 22, protocol: 'tcp', state: 'open', service: 'ssh' },
    { port: 80, protocol: 'tcp', state: 'open', service: 'http' },
  ],
  portTriage: {
    '80': { status: 'checking', note: 'inspecting api' },
  },
  findings: [
    {
      id: 'f-1',
      title: 'SQL Injection in Auth',
      severity: 'high',
      cvssScore: 8.5,
      cweCve: 'CVE-2023-1234',
      affectedService: 'HTTP 80',
      repro: "' OR 1=1--",
      remediation: 'Use parameterized queries',
      createdAt: 1000,
      updatedAt: 1000,
    },
  ],
  timeline: [
    {
      id: 't-1',
      at: 1000,
      kind: 'finding_added',
      label: 'Finding added: SQL Injection in Auth',
    },
  ],
  solveIndependence: 'solo',
  nextReviewAt: 2000000000000,
};

describe('Lab Study UI Components', () => {
  beforeEach(() => {
    useCtfStore.setState({
      machines: [testMachine],
    });
  });

  describe('DomainVhostSection', () => {
    it('renders domain and vhosts and generates /etc/hosts snippet', () => {
      render(<DomainVhostSection machine={testMachine} />);
      expect(screen.getByDisplayValue('testbox.htb')).toBeTruthy();
      expect(screen.getByText('api.testbox.htb')).toBeTruthy();
      expect(screen.getByText((content) => content.includes('10.10.11.200') && content.includes('testbox.htb'))).toBeTruthy();
      expect(screen.getByRole('button', { name: /Copy \/etc\/hosts line/i })).toBeTruthy();
    });

    it('adds and removes vhosts via store actions', () => {
      render(<DomainVhostSection machine={testMachine} />);
      const input = screen.getByPlaceholderText(/Add vhost/i);
      fireEvent.change(input, { target: { value: 'dev.testbox.htb' } });
      fireEvent.submit(input.closest('form')!);

      const state = useCtfStore.getState();
      const updated = state.machines.find((m) => m.id === testMachine.id);
      expect(updated?.vhosts).toContain('dev.testbox.htb');
    });
  });

  describe('PortTriageTable', () => {
    it('renders ports list and existing triage state', () => {
      render(<PortTriageTable machine={testMachine} />);
      expect(screen.getByText('22/tcp')).toBeTruthy();
      expect(screen.getByText('80/tcp')).toBeTruthy();
      expect(screen.getByDisplayValue('inspecting api')).toBeTruthy();
    });

    it('updates triage status and notes in store', () => {
      render(<PortTriageTable machine={testMachine} />);
      const select = screen.getByLabelText('Triage status for port 80');
      fireEvent.change(select, { target: { value: 'key_vector' } });

      const state = useCtfStore.getState();
      const updated = state.machines.find((m) => m.id === testMachine.id);
      expect(updated?.portTriage?.['80']?.status).toBe('key_vector');
    });
  });

  describe('LabFindingsPanel', () => {
    it('renders findings with severity badges and allows expanding', () => {
      render(<LabFindingsPanel machine={testMachine} />);
      expect(screen.getByText('SQL Injection in Auth')).toBeTruthy();
      expect(screen.getByText('high')).toBeTruthy();

      // Click to expand
      fireEvent.click(screen.getByText('SQL Injection in Auth'));
      expect(screen.getByText("' OR 1=1--")).toBeTruthy();
      expect(screen.getByText('Use parameterized queries')).toBeTruthy();
    });

    it('adds a new finding to the store', () => {
      render(<LabFindingsPanel machine={testMachine} />);
      fireEvent.click(screen.getByRole('button', { name: /Add Finding/i }));

      fireEvent.change(screen.getByPlaceholderText(/Remote Code Execution/i), {
        target: { value: 'Command Injection' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Save Finding/i }));

      const state = useCtfStore.getState();
      const updated = state.machines.find((m) => m.id === testMachine.id);
      expect(updated?.findings?.some((f) => f.title === 'Command Injection')).toBe(true);
    });
  });

  describe('LabTimelineAndIndependence', () => {
    it('renders independence modes and timeline events', () => {
      render(<LabTimelineAndIndependence machine={testMachine} />);
      expect(screen.getByText('Solo (Unassisted)')).toBeTruthy();
      expect(screen.getByText('Finding added: SQL Injection in Auth')).toBeTruthy();
    });

    it('updates solve independence when mode is clicked', () => {
      render(<LabTimelineAndIndependence machine={testMachine} />);
      fireEvent.click(screen.getByText('Nudged (Hints)'));

      const state = useCtfStore.getState();
      const updated = state.machines.find((m) => m.id === testMachine.id);
      expect(updated?.solveIndependence).toBe('nudged');
    });
  });
});
