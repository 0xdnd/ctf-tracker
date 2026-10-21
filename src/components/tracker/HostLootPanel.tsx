import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Eye, EyeOff, KeyRound } from 'lucide-react';
import type { Machine } from '../../types';
import type { Credential, CredService } from '../../types/loot';
import type { HostCredEntry, HostCredLevel, MachineLoot } from '../../utils/machineLoot';
import { CyberBadge } from '../common/CyberBadge';

interface HostLootPanelProps {
  machine: Machine;
  machineLoot: MachineLoot;
}

const MASK = '••••••••';

const LEVEL_LABELS: Record<HostCredLevel, string> = {
  admin: 'Admin',
  user: 'User',
  unknown: 'Valid, level unknown',
};

const iconBtn =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-subtle bg-surface-card text-muted transition-[transform,background-color,color] hover:text-primary active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11';

interface CredRowProps {
  credential: Credential;
  level?: HostCredLevel;
  services?: CredService[];
  protocol?: string;
}

const CredRow: React.FC<CredRowProps> = ({ credential, level, services = [], protocol }) => {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const redacted = Boolean(credential.redacted);
  const name = credential.domain ? `${credential.domain}\\${credential.username}` : credential.username;
  const meta = [...(protocol ? [protocol] : []), ...services].filter((v, i, a) => a.indexOf(v) === i);

  const handleCopy = () => {
    if (redacted) return;
    navigator.clipboard.writeText(credential.secret).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <li className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-subtle bg-surface-sunken px-3 py-2">
      <span className="min-w-0 break-all font-medium text-primary">{name}</span>
      <CyberBadge size="xs">{credential.type}</CyberBadge>
      {level && (
        <CyberBadge size="xs" variant={level === 'admin' ? 'danger' : level === 'user' ? 'success' : 'warning'}>
          {LEVEL_LABELS[level]}
        </CyberBadge>
      )}
      {meta.length > 0 && <span className="text-xs text-muted">{meta.join(', ')}</span>}
      <span className="ml-auto flex min-w-0 max-w-full items-center gap-2">
        <span className="min-w-0 break-all font-mono text-xs tabular-nums text-secondary" data-testid="loot-secret">
          {redacted ? 'Redacted' : revealed ? credential.secret : MASK}
        </span>
        <button
          type="button"
          aria-label={`${revealed ? 'Hide' : 'Reveal'} secret for ${name}`}
          disabled={redacted}
          onClick={() => setRevealed((v) => !v)}
          className={iconBtn}
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <button type="button" aria-label={`Copy secret for ${name}`} disabled={redacted} onClick={handleCopy} className={iconBtn}>
          {copied ? <Check className="h-3.5 w-3.5 text-callout-success-fg" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </span>
    </li>
  );
};

const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-1.5">
    <h3 className="text-xs font-medium text-secondary">{title}</h3>
    <ul className="space-y-1.5">{children}</ul>
  </div>
);

export const HostLootPanel: React.FC<HostLootPanelProps> = ({ machine, machineLoot }) => {
  const { foundHere, works, failed, triedNoResult, tryHere, items } = machineLoot;
  const empty =
    works.length + foundHere.length + failed.length + triedNoResult.length + tryHere.length + items.length === 0;

  const entryRows = (entries: HostCredEntry[], withLevel = false) =>
    entries.map((e) => (
      <CredRow
        key={e.credential.id}
        credential={e.credential}
        level={withLevel ? e.level : undefined}
        services={e.services}
        protocol={e.protocol}
      />
    ));

  return (
    <section aria-labelledby="target-loot-heading" className="p-4 rounded-xl border border-subtle bg-surface-card space-y-3.5">
      <div className="flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-callout-info-fg" aria-hidden="true" />
        <h2 id="target-loot-heading" className="text-xs font-semibold text-primary">Loot on this host</h2>
      </div>
      {empty && <p className="text-xs text-muted">No loot linked to this machine yet.</p>}
      {works.length > 0 && <Group title="Works here">{entryRows(works, true)}</Group>}
      {foundHere.length > 0 && (
        <Group title="Found here">
          {foundHere.map((c) => (
            <CredRow key={c.id} credential={c} />
          ))}
        </Group>
      )}
      {failed.length > 0 && <Group title="Failed">{entryRows(failed)}</Group>}
      {triedNoResult.length > 0 && <Group title="Tried, no result">{entryRows(triedNoResult)}</Group>}
      {tryHere.length > 0 && <Group title={`Try these here (${tryHere.length})`}>{entryRows(tryHere)}</Group>}
      {items.length > 0 && (
        <Group title="Other loot">
          {items.map((item) => (
            <li key={item.id} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-subtle bg-surface-sunken px-3 py-2">
              <CyberBadge size="xs">{item.category}</CyberBadge>
              <span className="min-w-0 break-words font-medium text-primary">{item.title}</span>
              <span className="break-all font-mono text-xs text-secondary">{item.value}</span>
            </li>
          ))}
        </Group>
      )}
      <Link to={`/vault?target=${machine.id}`} className="inline-block text-xs font-medium text-callout-info-fg hover:underline">
        Open in Vault
      </Link>
    </section>
  );
};
