import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Database, CheckCircle2, Terminal, ArrowRight } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { playCyberSound } from '../../utils/helpers';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface StartCleanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StartCleanModal: React.FC<StartCleanModalProps> = ({ isOpen, onClose }) => {
  const resetSolvesToZero = useCtfStore((s) => s.resetSolvesToZero);
  const restoreDanielSolves = useCtfStore((s) => s.restoreDanielSolves);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);

  const modalRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onClose,
  });

  if (!isOpen) return null;

  const handleStartClean = () => {
    localStorage.setItem('zerobox_onboarding_completed', 'true');
    resetSolvesToZero();
    if (soundEnabled) playCyberSound('root');
    onClose();
  };

  const handleLoadDemo = () => {
    localStorage.setItem('zerobox_onboarding_completed', 'true');
    restoreDanielSolves();
    if (soundEnabled) playCyberSound('flag');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-mono"
      onClick={handleStartClean}
    >
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-2xl flex flex-col rounded-2xl border border-cyber-border bg-cyber-card shadow-2xl overflow-hidden relative z-10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyber-border bg-cyber-bg">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyber-cyan/15 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="onboarding-modal-title" className="text-sm font-bold text-white tracking-wide">
                  ZEROBOX MISSION CONTROL
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyber-card border border-cyber-border text-cyber-cyan font-bold">
                  WORKSPACE SETUP
                </span>
              </div>
              <p className="text-[11px] text-cyber-muted">
                Configure your tactical offensive operations tracking database
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          <div className="text-xs text-slate-300 leading-relaxed">
            Welcome to ZeroBox. Select how you would like to initialize your workspace on this machine.
            You can seamlessly toggle between tracking your clean progress and exploring reference demo solves at any time from Settings or the Backup manager.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Start Clean Workspace (Recommended) */}
            <div className="p-4 rounded-xl border-2 border-cyber-emerald/60 bg-emerald-950/20 hover:border-cyber-emerald transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-cyber-emerald">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-cyber-emerald font-bold border border-emerald-500/40">
                    RECOMMENDED
                  </span>
                </div>
                <div className="font-bold text-sm text-white">Start Clean Journey</div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Track your own personal CTF journey from 0%. All 929 Hack The Box & TryHackMe machines start in your Backlog with empty flags and clean metrics.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartClean}
                className="w-full py-2.5 px-3 rounded-lg bg-cyber-emerald text-black font-bold text-xs hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-glow-emerald cursor-pointer"
              >
                <span>Start Clean Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 2: Load Demo Solves */}
            <div className="p-4 rounded-xl border border-cyber-border bg-cyber-bg/70 hover:border-cyber-cyan/50 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-cyber-cyan/15 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan">
                    <Database className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyber-card text-cyber-muted font-bold border border-cyber-border">
                    DEMO DATA
                  </span>
                </div>
                <div className="font-bold text-sm text-white">Explore Demo Solves</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Load Daniel Dayan&apos;s 63 verified completed targets (45 HTB + 18 THM) with flags, timestamps, and notes to preview walkthroughs and reports.
                </p>
              </div>

              <button
                type="button"
                onClick={handleLoadDemo}
                className="w-full py-2.5 px-3 rounded-lg bg-cyber-card border border-cyber-border text-white font-bold text-xs hover:border-cyber-cyan hover:text-cyber-cyan active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Load Demo Baseline (63 Solves)</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
