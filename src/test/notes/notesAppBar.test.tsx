import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotesAppBar } from '../../components/notes/NotesAppBar';

afterEach(cleanup);

describe('NotesAppBar', () => {
  it('has the brand, a way back, theme and settings, and no session controls', () => {
    const onBack = vi.fn();
    render(
      <MemoryRouter>
        <NotesAppBar onBack={onBack} ribbon={<span data-testid="slot" />} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('notes-app-bar')).toBeInTheDocument();
    expect(screen.getByTestId('slot')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to app' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Switch to (dark|light) mode/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings and options' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Session/ })).toBeNull();
    expect(screen.queryByText(/RHOST/)).toBeNull();
  });
});
