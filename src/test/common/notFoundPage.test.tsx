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

  it('renders a short heading and one sentence', () => {
    render(
      <MemoryRouter initialEntries={['/some-broken-path']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /isn.t here/i })).toBeInTheDocument();
    expect(screen.getByText(/Nothing lives at this address/)).toBeInTheDocument();
  });

  it('provides smart contextual suggestions based on URL keywords', () => {
    // 1. Evidence / Loot path
    const { unmount } = render(
      <MemoryRouter initialEntries={['/loot-archive']}>
        <NotFoundPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Did you mean/)).toBeInTheDocument();
    expect(screen.getAllByText('Evidence Vault').length).toBeGreaterThanOrEqual(1);
    unmount();

    // 2. Exam simulation path
    render(
      <MemoryRouter initialEntries={['/oscp-exam-mock']}>
        <NotFoundPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Did you mean/)).toBeInTheDocument();
    expect(screen.getAllByText('Exam Simulator').length).toBeGreaterThanOrEqual(1);
  });

  it('offers two actions and no section directory', () => {
    render(
      <MemoryRouter initialEntries={['/random-404']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.queryByRole('navigation')).toBeNull();
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
