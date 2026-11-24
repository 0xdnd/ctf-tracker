import { act, fireEvent, screen } from '@testing-library/react';

/**
 * Opens the header's lazily loaded Session popover. The chunk is imported first so React.lazy resolves from the module
 * cache within the act() flush; that keeps this usable under fake timers, where waitFor would hang.
 */
export async function openSessionPanel(): Promise<HTMLElement> {
  await import('../../components/layout/SessionPanel');
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /^Session/ }));
  });
  await act(async () => {
    await Promise.resolve();
  });
  return screen.getByRole('dialog', { name: 'Session' });
}
