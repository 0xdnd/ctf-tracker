import React, { useState } from 'react';
import { Terminal, Copy, Check, Monitor, ShieldCheck } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { safeCopyToClipboard, playCyberSound } from '../../utils/helpers';
import { toast } from '../../store/useToastStore';

import { generateTtyStabilizationSteps, TtyUpgradeStep } from '../../utils/offensiveTransferUtils';

export type TtyStep = TtyUpgradeStep;

export const TtyStabilizationCheatsheet: React.FC = () => {
  const { soundEnabled } = useCtfStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Compute recommended terminal size estimate
  const estimatedRows = Math.max(24, Math.floor(window.innerHeight / 24));
  const estimatedCols = Math.max(80, Math.floor(window.innerWidth / 10));

  const steps = React.useMemo(() => {
    return generateTtyStabilizationSteps({ rows: estimatedRows, cols: estimatedCols });
  }, [estimatedRows, estimatedCols]);

  const handleCopy = async (text: string, id: string) => {
    const ok = await safeCopyToClipboard(text);
    if (ok) {
      setCopiedId(id);
      toast.success('Copied step to clipboard');
      if (soundEnabled) playCyberSound('copy');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const oneLiner = `python3 -c 'import pty; pty.spawn("/bin/bash")' || script -qc /bin/bash /dev/null`;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-4 rounded-xl border border-subtle bg-surface-card space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-primary">Fully Interactive TTY Shell Stabilization</h3>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(oneLiner, 'one-liner')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-subtle bg-surface-sunken text-xs font-medium text-secondary hover:text-accent hover:border-accent transition-colors cursor-pointer"
          >
            {copiedId === 'one-liner' ? <Check className="w-3.5 h-3.5 text-callout-success-fg" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Step 1 Fallback</span>
          </button>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Upgrades raw dumb reverse shells (netcat, bash /dev/tcp) into fully functional interactive TTYs with tab-completion, clear screen, Ctrl+C interrupt handling, and job control.
        </p>
      </div>

      {/* Sequential Steps List */}
      <div className="space-y-3">
        {steps.map((s) => {
          const isCopied = copiedId === `step-${s.step}`;
          return (
            <div
              key={s.step}
              className="p-4 rounded-xl border border-subtle bg-surface-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-strong transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 border border-accent/30 text-accent font-mono text-xs font-bold flex items-center justify-center">
                  {s.step}
                </span>
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-primary flex items-center gap-2">
                    <span>{s.title}</span>
                    {s.isKeystroke && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-sunken text-callout-warn-fg border border-callout-warn-border">
                        Keystroke
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-muted leading-relaxed max-w-xl">{s.explanation}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex-1 md:flex-none">
                  <pre className="px-3 py-1.5 rounded-lg bg-surface-sunken border border-subtle font-mono text-xs text-primary select-all whitespace-nowrap">
                    {s.command}
                  </pre>
                </div>
                {!s.isKeystroke && (
                  <button
                    type="button"
                    onClick={() => handleCopy(s.command, `step-${s.step}`)}
                    className={`p-2 rounded-lg border text-xs transition-colors cursor-pointer active:scale-95 flex-shrink-0 ${
                      isCopied
                        ? 'bg-callout-success-bg text-callout-success-fg border-callout-success-border'
                        : 'bg-surface-sunken border-subtle text-secondary hover:text-accent hover:border-accent'
                    }`}
                    title="Copy command"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Alternative Spawns & Socat tip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="p-3.5 rounded-xl border border-subtle bg-surface-card space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-primary">
            <Monitor className="w-3.5 h-3.5 text-callout-info-fg" />
            <span>Alternative PTY Spawns (If Python fails)</span>
          </div>
          <div className="space-y-1.5 font-mono text-[11px] text-secondary">
            <div className="p-2 rounded bg-surface-sunken border border-subtle select-all">
              /usr/bin/script -qc /bin/bash /dev/null
            </div>
            <div className="p-2 rounded bg-surface-sunken border border-subtle select-all">
              perl -e 'use POSIX qw(setsid); setsid(); exec "/bin/bash"'
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-subtle bg-surface-card space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-primary">
            <ShieldCheck className="w-3.5 h-3.5 text-callout-success-fg" />
            <span>Socat Instant Full TTY (Attacker + Target)</span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">
            Catching via Socat instantly gives full TTY without needing stty raw:
          </p>
          <div className="space-y-1.5 font-mono text-[11px] text-secondary">
            <div className="p-2 rounded bg-surface-sunken border border-subtle select-all">
              socat file:`tty`,raw,echo=0 tcp-listen:4444
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
