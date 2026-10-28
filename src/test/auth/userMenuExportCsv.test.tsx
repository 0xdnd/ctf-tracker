import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserMenu } from '../../components/auth/UserMenu';
import { useCtfStore } from '../../store/useCtfStore';

describe('UserMenu Export CSV', () => {
  beforeEach(() => {
    useCtfStore.setState({ machines: [] });
  });

  it('downloads zerobox-machines-<date>.csv without a network call', () => {
    const createObjectURL = vi.fn(() => 'blob:csv');
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this.download);
    });

    render(<UserMenu />);
    fireEvent.click(screen.getByTitle(/Operator|Local Mode/i));
    fireEvent.click(screen.getByRole('button', { name: /Export CSV/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clicked[0]).toMatch(/^zerobox-machines-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
