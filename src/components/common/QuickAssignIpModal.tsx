import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Check, X, Clipboard, Globe, Shield, Terminal, ArrowRight } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound } from '../../utils/helpers';
import { PlatformBadge } from './PlatformBadge';
import { OsBadge } from './OsBadge';

export const QuickAssignIpModal: React.FC = () => {
  const {
    assignIpMachineId,
    setAssignIpMachineId,
    machines,
    updateMachine,
    setGlobalVars,
    soundEnabled,
    setActiveTarget,
    startTimer,
  } = useCtfStore(
    useShallow((s) => ({
      assignIpMachineId: s.assignIpMachineId,
      setAssignIpMachineId: s.setAssignIpMachineId,
      machines: s.machines,
      updateMachine: s.updateMachine,
      setGlobalVars: s.setGlobalVars,
      soundEnabled: s.soundEnabled,
      setActiveTarget: s.setActiveTarget,
      startTimer: s.startTimer,
    }))
  );

  const machine = machines.find((m) => m.id === assignIpMachineId);
  const [ipInput, setIpInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (machine) {
      setIpInput(machine.ip && !machine.ip.includes('x') ? machine.ip : '');
      setErrorMsg('');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [machine?.id]);

  if (!assignIpMachineId || !machine) return null;

  const handleClose = () => {
    setAssignIpMachineId(null);
  };

  const handleConfirm = () => {
    const cleanIp = ipInput
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .trim();

    if (!cleanIp) {
      setErrorMsg('Please enter a target IP or click Skip.');
      return;
    }

    // Update machine IP
    updateMachine(machine.id, { ip: cleanIp });
    
    // Synchronize to global payload variable TARGET
    setGlobalVars({ targetIp: cleanIp });

    // Ensure it is active target and timer is ready
    setActiveTarget(machine.id);
    startTimer();

    if (soundEnabled) playCyberSound('engage');
    setAssignIpMachineId(null);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const clean = text.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
      if (clean) {
        setIpInput(clean);
        setErrorMsg('');
        if (soundEnabled) playCyberSound('copy');
      }
    } catch {}
  };

  const handlePreFill = (prefix: string) => {
    setIpInput(prefix);
    setErrorMsg('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };

  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-surface-inverse/70 font-sans overflow-y-auto"
      onClick={handleClose}
      onKeyDown={handleKeyDown}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8, transition: { duration: 0.12 } }}
        transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
        onClick={(e) => e.stopPropagation()}
        data-testid="quick-assign-ip-modal"
        className="w-full max-w-lg rounded-2xl border border-subtle bg-surface-card shadow-xl overflow-hidden relative"
      >
        {/* Header Strip */}
        <div className="flex items-center justify-between border-b border-subtle p-4 bg-surface-card">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-card border border-subtle flex items-center justify-center text-secondary">
              <Crosshair className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <span>Assign spawned target IP</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-sunken text-secondary font-medium border border-subtle">
                  Live instance
                </span>
              </h3>
              <div className="text-[11px] text-muted">
                Each spawned CTF box gets its own IP address.
              </div>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 flex items-center justify-center"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Profile Card */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="p-3 rounded-xl bg-surface-sunken border border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <PlatformBadge platform={machine.platform} size="md" />
              <div>
                <div className="text-sm font-semibold text-primary flex items-center gap-2">
                  <span>{machine.name}</span>
                  <OsBadge os={machine.os} size="xs" />
                </div>
                <div className="text-[11px] text-muted mt-0.5">
                  Current placeholder: <code className="text-secondary font-mono tabular-nums">{machine.ip}</code>
                </div>
              </div>
            </div>

            <span className="text-[11px] text-muted">
              {machine.difficulty}
            </span>
          </div>

          {/* Input Field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-secondary flex items-center justify-between">
              <span>Spawned target IP</span>
              <button
                type="button"
                onClick={handlePaste}
                className="text-muted hover:text-primary flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <Clipboard className="w-3 h-3" /> Paste from clipboard
              </button>
            </label>

            <div className="relative">
              <input
                ref={inputRef}
                id="quick-assign-ip-input"
                name="quick-assign-ip"
                aria-label="Target IP Address"
                type="text"
                value={ipInput}
                onChange={(e) => {
                  setIpInput(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder={machine.platform === 'HTB' ? 'e.g. 10.10.11.234 or 10.129.x.x' : 'e.g. 10.10.185.92'}
                className="w-full bg-surface-sunken px-3.5 py-2.5 rounded-xl border border-subtle focus:border-accent text-primary text-base font-mono tabular-nums font-semibold focus:outline-none pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">
                <Globe className="w-4 h-4 text-muted" />
              </div>
            </div>

            {errorMsg && (
              <div className="text-[11px] text-callout-danger-fg font-medium" role="alert">
                {errorMsg}
              </div>
            )}
          </div>

          {/* Quick Subnet Prefills */}
          <div className="space-y-1.5">
            <div className="text-[11px] text-muted font-medium">
              Quick subnet prefix
            </div>
            <div className="flex flex-wrap gap-1.5">
              {machine.platform === 'HTB' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handlePreFill('10.10.11.')}
                    className="px-2 py-1 rounded bg-surface-sunken border border-subtle hover:border-strong text-secondary hover:text-primary text-xs font-mono tabular-nums transition-colors cursor-pointer"
                  >
                    10.10.11.
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreFill('10.129.')}
                    className="px-2 py-1 rounded bg-surface-sunken border border-subtle hover:border-strong text-secondary hover:text-primary text-xs font-mono tabular-nums transition-colors cursor-pointer"
                  >
                    10.129.
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreFill('10.10.10.')}
                    className="px-2 py-1 rounded bg-surface-sunken border border-subtle hover:border-strong text-secondary hover:text-primary text-xs font-mono tabular-nums transition-colors cursor-pointer"
                  >
                    10.10.10.
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handlePreFill('10.10.')}
                    className="px-2 py-1 rounded bg-surface-sunken border border-subtle hover:border-strong text-secondary hover:text-primary text-xs font-mono tabular-nums transition-colors cursor-pointer"
                  >
                    10.10.
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-subtle p-3 sm:p-3.5 bg-surface-card flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="px-3.5 py-1.5 rounded-lg border border-subtle text-secondary hover:text-primary hover:bg-surface-hover text-xs transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer"
          >
            Keep <span className="font-mono tabular-nums">{machine.ip}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-on-accent font-medium text-xs hover:bg-accent-hover transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer"
            >
              <span>Save and engage target</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
