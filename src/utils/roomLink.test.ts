import { describe, it, expect } from 'vitest';
import { isStartingPointHubUrl, STARTING_POINT_HUB_LABEL, STARTING_POINT_HUB_URL } from './roomLink';

describe('roomLink', () => {
  it('detects only the generic Starting Point hub url', () => {
    expect(isStartingPointHubUrl(STARTING_POINT_HUB_URL)).toBe(true);
    expect(isStartingPointHubUrl('https://app.hackthebox.com/machines/Meow')).toBe(false);
    expect(isStartingPointHubUrl(undefined)).toBe(false);
  });
  it('labels the hub link as a general page', () => {
    expect(STARTING_POINT_HUB_LABEL).toBe('Open the Hack The Box Starting Point hub (general page)');
  });
});
