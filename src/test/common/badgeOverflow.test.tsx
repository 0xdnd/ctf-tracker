import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { BadgeOverflow } from '../../components/common/BadgeOverflow';
import { CyberBadge } from '../../components/common/CyberBadge';

const badges = ['Linux', 'Easy', 'HTB', 'CPTS'].map((t) => <CyberBadge key={t}>{t}</CyberBadge>);

describe('BadgeOverflow', () => {
  it('renders nothing when there are no badges', () => {
    const { container } = render(<BadgeOverflow badges={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders all badges and no pill when within max', () => {
    render(<BadgeOverflow badges={badges.slice(0, 2)} />);
    expect(screen.getByText('Linux')).toBeInTheDocument();
    expect(screen.getByText('Easy')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('caps at 2 by default and shows a +N pill', () => {
    render(<BadgeOverflow badges={badges} />);
    expect(screen.getByText('Linux')).toBeInTheDocument();
    expect(screen.getByText('Easy')).toBeInTheDocument();
    expect(screen.queryByText('HTB')).not.toBeInTheDocument();
    const pill = screen.getByRole('button', { name: '2 more' });
    expect(pill).toHaveTextContent('+2');
  });

  it('honours a custom max', () => {
    render(<BadgeOverflow badges={badges} max={3} />);
    expect(screen.getByText('HTB')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 more' })).toHaveTextContent('+1');
  });

  it('lists the remaining badges in a tooltip on keyboard focus and closes on Escape', async () => {
    const user = userEvent.setup();
    render(<BadgeOverflow badges={badges} />);
    await user.tab();
    const pill = screen.getByRole('button', { name: '2 more' });
    expect(pill).toHaveFocus();
    const tip = await screen.findByRole('tooltip');
    expect(tip).toHaveTextContent('HTB');
    expect(tip).toHaveTextContent('CPTS');
    expect(pill).toHaveAttribute('aria-describedby', tip.id);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  it('opens on hover and closes when the pointer leaves', async () => {
    const user = userEvent.setup();
    render(<BadgeOverflow badges={badges} />);
    await user.hover(screen.getByRole('button', { name: '2 more' }));
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    await user.unhover(screen.getByRole('button', { name: '2 more' }));
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });
});
