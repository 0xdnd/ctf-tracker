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

export const communityLink = (machine: LinkableMachine): CommunityLink | null => {
  if (machine.platform === 'HTB') {
    return IPPSEC_HTB_NAMES.has((machine.name || '').trim().toLowerCase())
      ? { href: ippsecSearchUrl(machine.name), label: 'IppSec video' }
      : null;
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
