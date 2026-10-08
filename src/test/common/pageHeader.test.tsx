import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PageHeader } from '../../components/common/PageHeader';

describe('PageHeader', () => {
  it('renders the title as an h1 with a one-line description and icon', () => {
    render(<PageHeader title="Evidence vault" description="Credentials and loot" icon={<svg data-testid="ic" />} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Evidence vault' })).toBeInTheDocument();
    expect(screen.getByText('Credentials and loot')).toBeInTheDocument();
    expect(screen.getByTestId('ic')).toBeInTheDocument();
  });

  it('uses the tight semibold heading style and secondary description token', () => {
    render(<PageHeader title="Analytics" description="Last 7 days" />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.className).toContain('text-xl');
    expect(h1.className).toContain('font-semibold');
    expect(h1.className).toContain('tracking-[-0.015em]');
    expect(screen.getByText('Last 7 days').className).toContain('text-secondary');
  });

  it('renders primary and secondary actions and the sub-row children', () => {
    render(
      <PageHeader title="T" primaryAction={<button type="button">Add loot</button>} actions={<button type="button">Export</button>}>
        <div role="tablist" aria-label="views" />
      </PageHeader>,
    );
    expect(screen.getByRole('button', { name: 'Add loot' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'views' })).toBeInTheDocument();
  });

  it('hides inline secondary actions below sm via CSS but keeps them mounted', () => {
    render(<PageHeader title="T" actions={<button type="button">Export</button>} />);
    const wrapper = screen.getByRole('button', { name: 'Export' }).parentElement!;
    expect(wrapper.className).toContain('hidden');
    expect(wrapper.className).toContain('sm:flex');
  });

  it('collapses overflow items into a menu and fires onSelect', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PageHeader title="T" overflow={[{ id: 'x', label: 'Export CSV', onSelect }]} />);
    await user.click(screen.getByRole('button', { name: 'More actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Export CSV' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('renders no overflow trigger or action cluster when none are provided', () => {
    render(<PageHeader title="Only title" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
