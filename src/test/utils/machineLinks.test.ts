import { describe, it, expect } from 'vitest';
import { communityLink, ippsecSearchUrl } from '../../utils/machineLinks';

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
