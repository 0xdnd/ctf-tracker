import { describe, it, expect } from 'vitest';
import { communityLink, ippsecSearchUrl, resolveHubRootWriteupHref } from '../../utils/machineLinks';
import { OWN_WRITEUPS } from '../../data/ownWriteups';

const HUB_ROOT = 'https://0xdnd.gitbook.io/thm-writeups/';

describe('machineLinks', () => {
  it('links an HTB machine with an IppSec video to a YouTube search', () => {
    expect(communityLink({ id: 'htb-cap', name: 'cap', platform: 'HTB', writeupUrl: 'https://0xdf.gitlab.io/x' })).toEqual({
      href: ippsecSearchUrl('cap'),
      label: 'IppSec video',
    });
  });
  it('returns null for an HTB machine without an IppSec video, ignoring writeupUrl', () => {
    expect(communityLink({ id: 'htb-zzz', name: 'NoSuchBoxZZ', platform: 'HTB', writeupUrl: 'https://0xdf.gitlab.io/x' })).toBeNull();
  });
  it('keeps writeupUrl for non-HTB machines', () => {
    expect(communityLink({ id: 'thm-a', name: 'A', platform: 'THM', writeupUrl: 'https://example.com/w' })).toEqual({
      href: 'https://example.com/w',
      label: 'Writeup',
    });
    expect(communityLink({ id: 'thm-b', name: 'B', platform: 'THM' })).toBeNull();
  });
  it('URL-encodes the search query', () => {
    expect(ippsecSearchUrl('Blue & Co')).toBe(
      'https://www.youtube.com/results?search_query=ippsec%20HackTheBox%20Blue%20%26%20Co'
    );
  });
});

describe('resolveHubRootWriteupHref', () => {
  it('returns undefined for a normal (non-hub-root) writeupUrl, leaving it to the caller\'s normal resolution', () => {
    expect(
      resolveHubRootWriteupHref({ id: 'thm-rootme', name: 'RootMe', writeupUrl: 'https://example.com/writeup' })
    ).toBeUndefined();
  });

  it('resolves a hub-root writeupUrl to this app\'s own page, when one exists for the id', () => {
    const idWithOwnPage = Object.keys(OWN_WRITEUPS)[0];
    expect(idWithOwnPage, 'fixture assumes OWN_WRITEUPS has at least one entry').toBeTruthy();
    expect(
      resolveHubRootWriteupHref({ id: idWithOwnPage, name: 'x', writeupUrl: HUB_ROOT })
    ).toBe(`/machines/${OWN_WRITEUPS[idWithOwnPage]}/`);
  });

  it('shows no writeup link (never a guessed URL) for a hub-root writeupUrl with no page for that id', () => {
    expect(
      resolveHubRootWriteupHref({ id: 'thm-rootme', name: 'RootMe', writeupUrl: HUB_ROOT })
    ).toBeNull();
  });

  it('returns undefined (not applicable) when writeupUrl is empty or missing', () => {
    expect(resolveHubRootWriteupHref({ id: 'thm-rootme', name: 'RootMe', writeupUrl: '' })).toBeUndefined();
    expect(resolveHubRootWriteupHref({ id: 'thm-rootme', name: 'RootMe' })).toBeUndefined();
  });
});
