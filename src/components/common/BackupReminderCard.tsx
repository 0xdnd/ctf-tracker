import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Database } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useExamStore } from '../../store/examStore';
import { toast } from '../../store/useToastStore';
import { useAnyModalOpen } from '../../onboarding/useAnyModalOpen';
import { useOnboardingStore } from '../../onboarding/useOnboardingStore';
import {
  formatBackupAge,
  hasMeaningfulData,
  isBackupDue,
  useBackupReminderStore,
} from '../../utils/backupReminder';

/** Calm, non-modal reminder to export a backup. Waits for tours, guides, modals and exams. */
export const BackupReminderCard: React.FC<{ placement?: 'default' | 'notes' }> = ({ placement = 'default' }) => {
  const reduceMotion = useReducedMotion();
  const lastBackupAt = useBackupReminderStore((s) => s.lastBackupAt);
  const snoozeUntil = useBackupReminderStore((s) => s.snoozeUntil);
  const firstActivityAt = useBackupReminderStore((s) => s.firstActivityAt);
  const markActivity = useBackupReminderStore((s) => s.markActivity);
  const snooze = useBackupReminderStore((s) => s.snooze);
  const hasData = useCtfStore((s) => hasMeaningfulData(s));
  const modalOpen = useAnyModalOpen();
  const examStatus = useExamStore((s) => s.status);
  const tourActive = useOnboardingStore((s) => s.tourActive);
  const guideRunning = useOnboardingStore((s) => s.guide !== null);
  const hintShowing = useOnboardingStore((s) => s.hintShowing);
  const [busy, setBusy] = useState(false);

  // The first time real progress exists, remember when, so the first reminder can wait a few days.
  useEffect(() => {
    if (hasData) markActivity();
  }, [hasData, markActivity]);

  const examLive = examStatus === 'running' || examStatus === 'paused';
  const blocked = modalOpen || tourActive || guideRunning || hintShowing || examLive;
  const due = isBackupDue({ lastBackupAt, snoozeUntil, firstActivityAt }, Date.now(), hasData);
  if (blocked || !due) return null;

  const backUpNow = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // The store export records lastBackupAt itself once the download starts.
      await useCtfStore.getState().exportWorkspace();
      toast.success('Your workspace backup was downloaded.', 'Backed up');
    } catch (err) {
      // A failed export records nothing, so the reminder stays due.
      console.error('Backup from the reminder failed:', err);
      toast.error('Backup failed. Try again from Settings.');
    } finally {
      setBusy(false);
    }
  };

  const btn =
    'cursor-pointer rounded-lg text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:min-h-11';

  return (
    <motion.section
      role="region"
      aria-labelledby="backup-reminder-title"
      data-testid="backup-reminder"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed z-popover rounded-xl border border-subtle bg-surface-card p-5 font-sans shadow-xl ${
        placement === 'notes'
          ? 'bottom-8 left-3 right-3 md:left-auto md:right-4 md:w-[26rem]'
          : 'bottom-20 left-3 right-3 md:bottom-4 md:left-auto md:right-4 md:w-[26rem]'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-subtle bg-surface-sunken text-accent">
          <Database className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="backup-reminder-title" className="text-base font-semibold leading-snug tracking-tight text-primary">
            Your progress only lives in this browser.
          </h2>
          <p className="mt-1.5 text-sm leading-[1.6] text-secondary">
            {lastBackupAt ? `Last backup: ${formatBackupAge(lastBackupAt, Date.now())}` : 'You have not made a backup yet.'}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => snooze()}
          className={`${btn} px-2 py-2 text-muted hover:text-primary`}
        >
          Remind me in 7 days
        </button>
        <button
          type="button"
          onClick={backUpNow}
          disabled={busy}
          className={`${btn} bg-accent px-4 py-2 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60`}
        >
          Back up now
        </button>
      </div>
    </motion.section>
  );
};
