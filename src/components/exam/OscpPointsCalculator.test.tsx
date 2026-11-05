import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OscpPointsCalculator } from './OscpPointsCalculator';

describe('OscpPointsCalculator', () => {
  it('labels every input and updates the total and live status', () => {
    render(<OscpPointsCalculator initialMode="fixed" />);
    expect(screen.getByTestId('oscp-calc-total')).toHaveTextContent('0');

    // Every checkbox is reachable by its accessible name.
    fireEvent.click(screen.getByRole('checkbox', { name: /Machine 1 compromised/ }));
    expect(screen.getAllByRole('checkbox', { name: /local\.txt/ })).toHaveLength(3);
    for (const box of screen.getAllByRole('checkbox', { name: /local\.txt/ })) fireEvent.click(box);
    for (const box of screen.getAllByRole('checkbox', { name: /proof\.txt/ })) fireEvent.click(box);

    expect(screen.getByTestId('oscp-calc-total')).toHaveTextContent('70');
    expect(screen.getByTestId('oscp-calc-verdict')).toHaveTextContent('Pass');
    expect(screen.getByRole('status')).toHaveTextContent('Reaches the 70 point pass mark');

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(screen.getByTestId('oscp-calc-total')).toHaveTextContent('0');
  });

  it('explains the shortfall with no AD points', () => {
    render(<OscpPointsCalculator initialMode="fixed" />);
    for (const box of screen.getAllByRole('checkbox', { name: /(local|proof)\.txt/ })) fireEvent.click(box);
    expect(screen.getByTestId('oscp-calc-total')).toHaveTextContent('60');
    expect(screen.getByTestId('oscp-calc-verdict')).toHaveTextContent('Not yet');
    expect(screen.getByTestId('oscp-calc-needed')).toHaveTextContent('at least 10 Active Directory points');
  });

  it('does not show pass or fail in scaled mode', () => {
    render(<OscpPointsCalculator initialMode="fixed" />);
    fireEvent.click(screen.getByRole('radio', { name: /On or after 1 December 2026/ }));
    expect(screen.queryByTestId('oscp-calc-verdict')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Pass or fail is not shown for scaled scoring');
  });
});
