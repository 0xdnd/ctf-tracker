import { fireEvent, screen } from '@testing-library/react';

/**
 * Scoped graphs with more than a handful of machines start with every subnet hub collapsed (hub node,
 * count badge, status dots). These helpers open hubs the way a user does, by clicking them.
 */
export const hubButtons = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>('[data-hub-interactive]'));

/** Expands the hub that owns the machine (no-op when its card is already drawn). Returns the card. */
export function expandHubContaining(machineId: string): HTMLElement {
  const testId = `attack-node-${machineId}`;
  if (screen.queryByTestId(testId)) return screen.getByTestId(testId);
  for (const hub of hubButtons()) {
    // A hub whose dot ring holds the machine owns it
    if (hub.querySelector(`[data-hub-dot="${machineId}"]`)) {
      fireEvent.click(hub);
      return screen.getByTestId(testId);
    }
  }
  throw new Error(`no collapsed hub owns ${machineId}`);
}

/** Ids of machines folded into hubs right now (one status dot each). */
export const hubDotIds = (): string[] =>
  Array.from(document.querySelectorAll('[data-hub-dot]')).map((e) => e.getAttribute('data-hub-dot') as string);
