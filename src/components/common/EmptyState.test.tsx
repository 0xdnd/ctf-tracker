import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Inbox, Plus } from 'lucide-react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState icon={Inbox} title="Nothing here" description="Add your first item." />);
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument();
    expect(screen.getByText('Add your first item.')).toBeInTheDocument();
  });

  it('fires the primary and secondary actions', () => {
    const onAction = vi.fn();
    const onSecondary = vi.fn();
    render(
      <EmptyState
        title="Empty"
        action={{ label: 'Create', onClick: onAction, icon: Plus }}
        secondaryAction={{ label: 'Learn more', onClick: onSecondary }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Learn more' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it('renders no buttons without actions', () => {
    render(<EmptyState title="Empty" compact />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
