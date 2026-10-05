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
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-inverse/70 font-sans"
      onClick={handleStartClean}
    >
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.12 } }}
        transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-2xl flex flex-col rounded-2xl border border-subtle bg-surface-card shadow-xl overflow-hidden relative z-10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-subtle bg-surface-card">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-sunken border border-subtle flex items-center justify-center text-secondary">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 id="onboarding-modal-title" className="text-sm font-semibold text-primary tracking-tight">
                Set up your workspace
              </h2>
              <p className="text-[11px] text-muted">
                Choose how to start tracking on this machine
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          <div className="text-xs text-secondary leading-relaxed">
            Welcome to ZeroBox. Select how you would like to initialize your workspace on this machine.
            You can seamlessly toggle between tracking your clean progress and exploring reference demo solves at any time from Settings or the Backup manager.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Start Clean Workspace (Recommended) */}
            <div className="p-4 rounded-xl border border-accent bg-surface-sunken transition-interactive flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-surface-card border border-subtle flex items-center justify-center text-secondary">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium border border-accent/30">
                    Recommended
                  </span>
                </div>
                <div className="font-semibold text-sm text-primary">Start clean</div>
                <p className="text-[11px] text-secondary leading-relaxed">
                  Track your own personal CTF journey from 0%. All 929 Hack The Box & TryHackMe machines start in your Backlog with empty flags and clean metrics.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartClean}
                className="w-full py-2.5 px-3 rounded-lg bg-accent text-on-accent font-medium text-xs hover:bg-accent-hover active:scale-[0.97] transition-interactive flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <span>Start Clean Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 2: Load Demo Solves */}
            <div className="p-4 rounded-xl border border-subtle bg-surface-sunken hover:border-strong transition-interactive flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-surface-card border border-subtle flex items-center justify-center text-secondary">
                    <Database className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-card text-muted font-medium border border-subtle">
                    Demo data
                  </span>
                </div>
                <div className="font-semibold text-sm text-primary">Explore demo solves</div>
                <p className="text-[11px] text-secondary leading-relaxed">
                  Load Daniel Dayan&apos;s 63 verified completed targets (45 HTB + 18 THM) with flags, timestamps, and notes to preview walkthroughs and reports.
                </p>
              </div>

              <button
                type="button"
                onClick={handleLoadDemo}
                className="w-full py-2.5 px-3 rounded-lg bg-surface-card border border-subtle text-primary font-medium text-xs hover:border-strong hover:bg-surface-hover active:scale-[0.97] transition-interactive flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
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
