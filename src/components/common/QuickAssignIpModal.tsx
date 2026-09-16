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
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm font-mono overflow-y-auto"
      onClick={handleClose}
      onKeyDown={handleKeyDown}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        data-testid="quick-assign-ip-modal"
        className="w-full max-w-lg rounded-2xl border border-cyber-cyan/50 bg-cyber-card/95 shadow-2xl overflow-hidden shadow-glow-cyan/20 relative"
      >
        {/* Header Strip */}
        <div className="flex items-center justify-between border-b border-cyber-border p-4 bg-cyber-bg/90">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan">
              <Crosshair className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>ASSIGN SPAWNED TARGET IP</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyber-cyan/20 text-cyber-cyan font-semibold border border-cyber-cyan/30">
                  LIVE INSTANCE
                </span>
              </h3>
              <div className="text-[11px] text-cyber-muted">
                Each spawned CTF box receives a unique dynamic IP address.
              </div>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1 rounded text-cyber-muted hover:text-white transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Profile Card */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="p-3 rounded-xl bg-cyber-bg border border-cyber-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <PlatformBadge platform={machine.platform} size="md" />
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{machine.name}</span>
                  <OsBadge os={machine.os} size="xs" />
                </div>
                <div className="text-[11px] text-cyber-muted mt-0.5">
                  Current Placeholder: <code className="text-cyber-amber font-mono">{machine.ip}</code>
                </div>
              </div>
            </div>

            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
              machine.difficulty === 'Easy' ? 'bg-cyber-emerald/10 text-cyber-emerald border border-cyber-emerald/30' :
              machine.difficulty === 'Medium' ? 'bg-cyber-amber/10 text-cyber-amber border border-cyber-amber/30' :
              'bg-cyber-crimson/10 text-cyber-crimson border border-cyber-crimson/30'
            }`}>
              {machine.difficulty}
            </span>
          </div>

          {/* Input Field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-cyber-cyan uppercase tracking-wider flex items-center justify-between">
              <span>Enter Spawned Target IP:</span>
              <button
                type="button"
                onClick={handlePaste}
                className="text-cyber-muted hover:text-cyber-cyan flex items-center gap-1 text-[10px] normal-case"
              >
                <Clipboard className="w-3 h-3" /> Paste from Clipboard
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
                className="w-full bg-cyber-bg px-3.5 py-2.5 rounded-xl border border-cyber-border focus:border-cyber-cyan text-white text-base font-mono font-bold focus:outline-none shadow-inner pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-muted text-xs">
                <Globe className="w-4 h-4 text-cyber-cyan/70" />
              </div>
            </div>

            {errorMsg && (
              <div className="text-[11px] text-cyber-crimson font-semibold">
                {errorMsg}
              </div>
            )}
          </div>

          {/* Quick Subnet Prefills */}
          <div className="space-y-1.5">
            <div className="text-[10px] text-cyber-muted uppercase font-semibold">
              Quick Subnet Prefix:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {machine.platform === 'HTB' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handlePreFill('10.10.11.')}
                    className="px-2 py-1 rounded bg-cyber-bg border border-cyber-border hover:border-cyber-cyan text-cyber-muted hover:text-white text-xs transition-colors"
                  >
                    10.10.11. (Modern)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreFill('10.129.')}
                    className="px-2 py-1 rounded bg-cyber-bg border border-cyber-border hover:border-cyber-cyan text-cyber-muted hover:text-white text-xs transition-colors"
                  >
                    10.129. (Starting Point / Labs)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreFill('10.10.10.')}
                    className="px-2 py-1 rounded bg-cyber-bg border border-cyber-border hover:border-cyber-cyan text-cyber-muted hover:text-white text-xs transition-colors"
                  >
                    10.10.10. (Retired Classic)
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handlePreFill('10.10.')}
                    className="px-2 py-1 rounded bg-cyber-bg border border-cyber-border hover:border-cyber-cyan text-cyber-muted hover:text-white text-xs transition-colors"
                  >
                    10.10. (TryHackMe Subnet)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-cyber-border p-3.5 sm:p-4 bg-cyber-bg/95 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 rounded-lg border border-cyber-border text-cyber-muted hover:text-white text-xs transition-colors"
          >
            Keep {machine.ip}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyber-emerald text-black font-extrabold text-xs hover:bg-cyber-emerald/90 transition-all shadow-glow-emerald"
            >
              <span>Save & Engage Target</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
