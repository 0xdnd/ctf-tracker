import React, { useState } from 'react';
import { Check, Copy, Eye, EyeOff, KeyRound, Radio } from 'lucide-react';
import { useCtfStore } from '../../../store/useCtfStore';
import { playCyberSound, safeCopyToClipboard } from '../../../utils/helpers';

export interface GraphNodeCred {
  id: string;
  domain?: string;
  username: string;
  secret: string;
  type?: string;
}

interface NodeCredentialsListProps {
  creds: GraphNodeCred[];
  nodeIp?: string;
  nodeDomain?: string;
}

/**
 * Compact linked credentials panel rendered inside the Attack Graph node flyout.
 * Masks secrets by default, offers 1-click Copy, and 1-click "Use in HUD" (sets globalVars).
 */
export const NodeCredentialsList: React.FC<NodeCredentialsListProps> = ({ creds, nodeIp, nodeDomain }) => {
  const setGlobalVars = useCtfStore((s) => s.setGlobalVars);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  if (creds.length === 0) return null;

  const handleCopy = (cred: GraphNodeCred) => {
    if (!cred.secret) return;
    void safeCopyToClipboard(cred.secret);
    setCopiedId(cred.id);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedId((prev) => (prev === cred.id ? null : prev)), 1500);
  };

  const handleUseInHud = (cred: GraphNodeCred) => {
    setGlobalVars({
      ...(cred.domain || nodeDomain ? { domain: cred.domain || nodeDomain } : {}),
      ...(nodeIp && !/x/i.test(nodeIp) ? { targetIp: nodeIp } : {}),
      user: cred.username,
      cred: cred.secret,
    });
    setAppliedId(cred.id);
    if (soundEnabled) playCyberSound('click');
    setTimeout(() => setAppliedId((prev) => (prev === cred.id ? null : prev)), 1500);
  };

  return (
    <div className="space-y-1.5 border-t border-subtle pt-2" data-testid="graph-node-creds">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
        <KeyRound className="h-3 w-3 text-accent" aria-hidden="true" />
        <span>Linked credentials ({creds.length})</span>
      </div>
      <div className="max-h-28 space-y-1 overflow-y-auto pr-0.5 scrollbar-thin">
        {creds.slice(0, 4).map((cred) => {
          const identity = cred.domain ? `${cred.domain}\\${cred.username}` : cred.username;
          const isRevealed = revealedId === cred.id;
          return (
            <div
              key={cred.id}
              className="flex items-center gap-1 rounded-lg border border-subtle bg-surface-sunken px-2 py-1 font-mono text-[11px]"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-primary" title={identity}>
                  {identity || '(no user)'}
                </div>
                {cred.secret && (
                  <div className="truncate text-[10px] text-muted">
                    {isRevealed ? cred.secret : '••••••••'}
                  </div>
                )}
              </div>
              {cred.secret && (
                <>
                  <button
                    type="button"
                    onClick={() => setRevealedId((prev) => (prev === cred.id ? null : cred.id))}
                    aria-label={isRevealed ? `Hide secret for ${identity}` : `Reveal secret for ${identity}`}
                    title={isRevealed ? 'Hide secret' : 'Reveal secret'}
                    className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {isRevealed ? <EyeOff className="h-3 w-3" aria-hidden="true" /> : <Eye className="h-3 w-3" aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(cred)}
                    aria-label={`Copy secret for ${identity}`}
                    title="Copy secret"
                    className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {copiedId === cred.id ? (
                      <Check className="h-3 w-3 text-callout-success-fg" aria-hidden="true" />
                    ) : (
                      <Copy className="h-3 w-3" aria-hidden="true" />
                    )}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => handleUseInHud(cred)}
                aria-label={`Use ${identity} in Session HUD`}
                title="Load into Session Connection HUD"
                className="inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded border border-subtle bg-surface-card px-1.5 font-sans text-[10px] font-medium text-secondary transition-colors hover:border-accent/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {appliedId === cred.id ? (
                  <Check className="h-2.5 w-2.5 text-callout-success-fg" aria-hidden="true" />
                ) : (
                  <Radio className="h-2.5 w-2.5 text-accent" aria-hidden="true" />
                )}
                <span>HUD</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
