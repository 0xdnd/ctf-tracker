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
