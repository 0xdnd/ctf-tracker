import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeAll } from 'vitest';
import { MethodologyPage } from '../../pages/MethodologyPage';

beforeAll(() => {
  (globalThis as any).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <MethodologyPage />
    </MemoryRouter>
  );

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
});
