import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { MethodologyPage } from '../../pages/MethodologyPage';
import { useCtfStore } from '../../store/useCtfStore';

beforeAll(() => {
  (globalThis as any).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
  // jsdom doesn't implement smooth scrolling; PhaseNav calls it on click.
  (Element.prototype as any).scrollIntoView = () => {};
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <MethodologyPage />
    </MemoryRouter>
  );

const baseMachine = (overrides: Record<string, unknown> = {}) => ({
  id: 'm1',
  name: 'Alpha',
  ip: '10.10.10.1',
  os: 'Linux',
  platform: 'HackTheBox',
  difficulty: 'Easy',
  status: 'backlog',
  tags: [],
  certifications: [],
  timeSpentSeconds: 0,
  openPorts: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
}) as any;

describe('MethodologyPage', () => {
  it('renders the playbook header and search input', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Attack Lifecycle/i);
    expect(screen.getByLabelText(/Search methodology commands/i)).toBeInTheDocument();
  });

  it('toggles a phase accordion', () => {
    renderPage();
    const headers = screen.getAllByRole('heading', { level: 2 });
    const trigger = headers[headers.length - 1].closest('button') as HTMLButtonElement;
    expect(trigger).toBeTruthy();
    const before = screen.queryAllByTitle('Copy command to clipboard').length;
    fireEvent.click(trigger);
    const after = screen.queryAllByTitle('Copy command to clipboard').length;
    expect(after).not.toBe(before);
  });

  it('renders branch chips with human-readable names, not "Branch A"', () => {
    renderPage();
    expect(screen.getByText('HTTP / HTTPS / Web Apps')).toBeInTheDocument();
    expect(screen.getByText('File Sharing & Infra')).toBeInTheDocument();
    expect(screen.queryByText('Branch A')).not.toBeInTheDocument();
  });

  it('clicking a PhaseNav entry applies the existing phase filter', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 2, name: /Host Discovery/i })).toBeInTheDocument();

    const serviceEnumEntries = screen.getAllByRole('button', { name: /Deep Non-Exploitative Service Inspection/i });
    fireEvent.click(serviceEnumEntries[0]);

    expect(screen.queryByRole('heading', { level: 2, name: /Host Discovery/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Protocol & Service Enumeration/i })).toBeInTheDocument();
  });
});

describe('MethodologyPage checklist empty state', () => {
  beforeEach(() => {
    useCtfStore.setState({ activeTargetId: null });
  });

  it('shows the empty state with a target dropdown (no silent default to the first machine)', () => {
    useCtfStore.setState({
      machines: [baseMachine({ id: 'm1', name: 'Alpha' }), baseMachine({ id: 'm2', name: 'Beta' })],
    });
    renderPage();
    fireEvent.click(screen.getByText('Live checklist'));

    expect(screen.getByText(/No target selected/i)).toBeInTheDocument();
    expect(screen.queryByText(/Methodology completion/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Select checklist target/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Target Box' })).toBeInTheDocument();
  });

  it('shows only the create action with zero machines', () => {
    useCtfStore.setState({ machines: [] });
    renderPage();
    fireEvent.click(screen.getByText('Live checklist'));

    expect(screen.getByText(/No target selected/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Select checklist target/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deploy Target Machine' })).toBeInTheDocument();
  });

  it('shows the checklist directly once a target is explicitly chosen from the empty-state dropdown', () => {
    useCtfStore.setState({ machines: [baseMachine({ id: 'm1', name: 'Alpha' })] });
    renderPage();
    fireEvent.click(screen.getByText('Live checklist'));
    fireEvent.click(screen.getByRole('button', { name: /Select checklist target/i }));
    fireEvent.click(screen.getByText('Alpha (HackTheBox)'));

    expect(screen.getByText(/Methodology completion/i)).toBeInTheDocument();
  });
});

describe('MethodologyPage checklist PhaseNav', () => {
  it('shows done/total counts for the applicable items in a phase', () => {
    useCtfStore.setState({
      activeTargetId: 'm1',
      machines: [
        baseMachine({
          id: 'm1',
          name: 'Alpha',
          checklist: { openPorts: [], activeItemId: null, itemsState: { 'p01-fast-syn': { status: 'done' } } },
        }),
      ],
    });
    renderPage();
    fireEvent.click(screen.getByText('Live checklist'));

    const nav = screen.getByRole('navigation', { name: 'Phase navigator' });
    expect(within(nav).getAllByText('1/4').length).toBeGreaterThan(0);
  });
});
