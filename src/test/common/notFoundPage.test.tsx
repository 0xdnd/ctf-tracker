import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NotFoundPage } from '../../pages/NotFoundPage';
import { useCtfStore } from '../../store/useCtfStore';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NotFoundPage (In-App 404 Component)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCtfStore.setState({ soundEnabled: false });
  });

  it('renders 404 title, status badge, and the unresolved path', () => {
    render(
      <MemoryRouter initialEntries={['/some-broken-path']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Page not found/i })).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Unresolved route')).toBeInTheDocument();
    expect(screen.getAllByText('/some-broken-path').length).toBeGreaterThanOrEqual(1);
  });

  it('provides smart contextual suggestions based on URL keywords', () => {
    // 1. Evidence / Loot path
    const { unmount } = render(
      <MemoryRouter initialEntries={['/loot-archive']}>
        <NotFoundPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Looking for this page?')).toBeInTheDocument();
    expect(screen.getAllByText('Evidence Vault').length).toBeGreaterThanOrEqual(1);
    unmount();

    // 2. Exam simulation path
    render(
      <MemoryRouter initialEntries={['/oscp-exam-mock']}>
        <NotFoundPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Looking for this page?')).toBeInTheDocument();
    expect(screen.getAllByText('Exam Simulator').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 8 quick-link directory cards', () => {
    render(
      <MemoryRouter initialEntries={['/random-404']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Machine Tracker')).toBeInTheDocument();
    expect(screen.getByText('Evidence Vault')).toBeInTheDocument();
    expect(screen.getByText('Methodology')).toBeInTheDocument();
    expect(screen.getByText('Cheatsheets')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Writeup Studio')).toBeInTheDocument();
    expect(screen.getByText('Exam Simulator')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('navigates back to tracker on button click and keyboard "T" press', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/unknown']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    const backBtn = screen.getByRole('button', { name: /Back to tracker/i });
    await user.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/tracker');

    // Test 'T' key press
    fireEvent.keyDown(window, { key: 't' });
    expect(mockNavigate).toHaveBeenCalledWith('/tracker');
  });
});
