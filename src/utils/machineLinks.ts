import ippsecSource from '../data/trackSources/ippsec-videos.json';
import { OWN_WRITEUPS } from '../data/ownWriteups';
import { isTauriTarget } from './runtimeTarget';
import { sanitizeExternalUrl } from './helpers';

export interface CommunityLink {
  href: string;
  label: string;
}

type LinkableMachine = { id: string; name: string; platform?: string; writeupUrl?: string };

const IPPSEC_HTB_NAMES: ReadonlySet<string> = new Set(
  ippsecSource.names.HTB.map((n: string) => n.toLowerCase())
);

export const ippsecSearchUrl = (name: string): string =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`ippsec HackTheBox ${name}`)}`;

export const vulnhubSearchUrl = (name: string): string =>
  `https://www.vulnhub.com/?q=${encodeURIComponent(name)}`;

export const communityLink = (machine: LinkableMachine): CommunityLink | null => {
  if (machine.platform === 'HTB') {
    return IPPSEC_HTB_NAMES.has((machine.name || '').trim().toLowerCase())
      ? { href: ippsecSearchUrl(machine.name), label: 'IppSec video' }
      : null;
  }
  if (machine.platform === 'VulnHub') {
    const own = sanitizeExternalUrl(machine.writeupUrl);
    return own
      ? { href: own, label: 'Writeup' }
      : { href: vulnhubSearchUrl(machine.name), label: 'VulnHub page' };
  }
  const href = sanitizeExternalUrl(machine.writeupUrl);
  return href ? { href, label: 'Writeup' } : null;
};

export const ownWriteupHref = (machine: { id: string }): string | null => {
  const slug = OWN_WRITEUPS[machine.id];
  if (!slug) return null;
  return isTauriTarget()
    ? `https://ctftracker.com/machines/${slug}/#writeup`
    : `/machines/${slug}/#writeup`;
};

/**
 * A batch of catalog rows (starterMachines.ts / machinesCatalog.ts) has `writeupUrl` set to the
 * root of an external writeup hub rather than a page for that specific target.
 */
const HUB_ROOT_WRITEUP_URLS: ReadonlySet<string> = new Set(['https://0xdnd.gitbook.io/thm-writeups/']);

/**
 * Resolves a `writeupUrl` that is actually one of the hub roots above (not a page for this
 * specific target) to this app's own machine page — using the same existence check as
 * `ownWriteupHref` — or to `null` when no such page exists yet (never a guessed deeper external
 * URL). Returns `undefined` when `writeupUrl` isn't a hub root at all, so the caller falls back
 * to its normal resolution (e.g. `communityLink`) unchanged.
 */
export const resolveHubRootWriteupHref = (machine: LinkableMachine): string | null | undefined => {
  if (!machine.writeupUrl || !HUB_ROOT_WRITEUP_URLS.has(machine.writeupUrl)) return undefined;
  const slug = OWN_WRITEUPS[machine.id];
  if (!slug) return null;
  return isTauriTarget() ? `https://ctftracker.com/machines/${slug}/` : `/machines/${slug}/`;
};
