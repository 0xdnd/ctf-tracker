import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { useCtfStore, selectTacticalVarsUnset } from '../../store/useCtfStore';
import { resolveSortMode } from '../../utils/trackerSort';
import { CardIpBadge } from '../../components/tracker/CardIpBadge';

const vars = (o: Partial<{ lhost: string; targetIp: string; lport: string }>) =>
  ({ globalVars: { lhost: '10.10.14.X', targetIp: '10.10.10.X', lport: '4444', ...o } }) as never;

describe('first visit calm', () => {
  it('new users start on the recommended sort; an ordered track still wins', () => {
    expect(useCtfStore.getState().filters.sortBy).toBe('recommended');
    expect(resolveSortMode({ sortBy: 'recommended', selectedTrack: 'ALL', selectedTracks: [] })).toBe('difficulty');
    expect(resolveSortMode({ sortBy: 'recommended', selectedTrack: 'tjnull-oscp', selectedTracks: ['tjnull-oscp'] })).toBe('track');
    expect(resolveSortMode({ sortBy: 'default', selectedTrack: 'ALL', selectedTracks: [] })).toBe('default');
  });

  it('derives "unset" from the placeholders and flips once any value is the user\'s own', () => {
    expect(selectTacticalVarsUnset(vars({}))).toBe(true);
    expect(selectTacticalVarsUnset(vars({ lhost: '10.10.14.7' }))).toBe(false);
    expect(selectTacticalVarsUnset(vars({ targetIp: '10.10.11.5' }))).toBe(false);
    expect(selectTacticalVarsUnset(vars({ lport: '9001' }))).toBe(false);
  });

  it('card IP pill is quiet only for a placeholder while nothing is set', () => {
    useCtfStore.setState(vars({}));
    const quiet = render(<CardIpBadge machineId="a" initialIp="10.10.x.x" />);
    expect(quiet.container.firstElementChild?.className).toContain('opacity-60');
    const real = render(<CardIpBadge machineId="b" initialIp="10.10.11.5" />);
    expect(real.container.firstElementChild?.className).not.toContain('opacity-60');
    useCtfStore.setState(vars({ lhost: '10.10.14.7' }));
    const after = render(<CardIpBadge machineId="c" initialIp="10.10.x.x" />);
    expect(after.container.firstElementChild?.className).not.toContain('opacity-60');
  });
});
