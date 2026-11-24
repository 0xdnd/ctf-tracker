import React from 'react';
import { X, Radio, ArrowRight } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { ReverseShellGenerator } from '../cheatsheet/ReverseShellGenerator';

export const RevShellModal: React.FC = () => {
  const navigate = useNavigate();
  const {
    revShellModalOpen,
    setRevShellModalOpen,
    globalVars,
    setGlobalVars,
  } = useCtfStore(
    useShallow((s) => ({
      revShellModalOpen: s.revShellModalOpen,
      setRevShellModalOpen: s.setRevShellModalOpen,
      globalVars: s.globalVars,
      setGlobalVars: s.setGlobalVars,
    }))
  );

  const labelCls = 'block text-[11px] text-muted font-medium mb-1';
  const inputCls =
    'w-full px-2.5 py-1.5 rounded-lg bg-surface-base border border-subtle text-primary text-xs font-mono tabular-nums placeholder:text-muted focus:border-accent focus:outline-none';

  return (
    <Modal
      open={revShellModalOpen}
      onClose={() => setRevShellModalOpen(false)}
      labelledBy="revshell-modal-title"
      size="2xl"
      zIndex="modalNested"
    >
      <div data-testid="revshell-modal" className="flex flex-col max-h-[88dvh] min-h-0">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 bg-surface-sunken border-b border-subtle">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-accent" />
            <span id="revshell-modal-title" className="font-semibold text-sm text-primary tracking-tight">
              Reverse shell generator
            </span>
            <kbd className="text-[11px] px-1.5 py-0.5 rounded bg-surface-card border border-subtle text-muted font-mono">
              Alt+R
            </kbd>
          </div>
          <button
            type="button"
            onClick={() => setRevShellModalOpen(false)}
            aria-label="Close Reverse Shell Generator"
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live variable sync */}
        <div data-tour="revshell-details" className="flex-shrink-0 px-5 py-3 border-b border-subtle bg-surface-card grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label htmlFor="revshell-lhost" className={labelCls}>
              LHOST (Tun0 / Attacker)
            </label>
            <input
              id="revshell-lhost"
              name="lhost"
              type="text"
              value={globalVars.lhost || ''}
              onChange={(e) => setGlobalVars({ lhost: e.target.value })}
              placeholder="10.10.14.X"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="revshell-lport" className={labelCls}>
              LPORT (Listener)
            </label>
            <input
              id="revshell-lport"
              name="lport"
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={globalVars.lport || ''}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                if (!digits) {
                  setGlobalVars({ lport: '' });
                } else {
                  const num = parseInt(digits, 10);
                  if (num <= 65535) {
                    setGlobalVars({ lport: String(num) });
                  }
                }
              }}
              placeholder="4444"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="revshell-rhost" className={labelCls}>
              RHOST (Active Target)
            </label>
            <input
              id="revshell-rhost"
              name="rhost"
              type="text"
              value={globalVars.targetIp || ''}
              onChange={(e) => setGlobalVars({ targetIp: e.target.value })}
              placeholder="10.10.10.X"
              className={inputCls}
            />
          </div>
        </div>

        {/* Unified Full ReverseShellGenerator */}
        <div data-tour="revshell-list" className="flex-1 min-h-0 overflow-y-auto p-5">
          <ReverseShellGenerator />
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 bg-surface-sunken border-t border-subtle text-xs text-muted">
          <span>Variables auto-interpolated from active engagement context</span>
          <button
            type="button"
            onClick={() => {
              setRevShellModalOpen(false);
              navigate('/reverse-shell');
            }}
            data-tour="revshell-full"
            className="flex items-center gap-1 text-accent hover:underline text-xs font-medium cursor-pointer"
          >
            <span>Full RevShell arsenal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Modal>
  );
};

