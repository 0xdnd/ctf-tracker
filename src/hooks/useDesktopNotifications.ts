import { useEffect, useState } from 'react';
import { useCtfStore } from '../store/useCtfStore';
import { useExamStore } from '../store/examStore';
import { countDueReviews } from '../utils/spacedRepetition';
import { NOTIF_PREF_EVENT, canNotify } from '../utils/notificationPrefs';

const EXAM_POLL_MS = 5000;
const REVIEW_POLL_MS = 30 * 60 * 1000;

/** Mounts the lazy notification engine only while the user has opted in. Never requests permission. */
export function useDesktopNotifications(): void {
  const [on, setOn] = useState(canNotify);
  useEffect(() => {
    const sync = () => setOn(canNotify());
    window.addEventListener(NOTIF_PREF_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(NOTIF_PREF_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (!on) return;
    let cancelled = false;
    let cleanup = () => {};
    void import('../utils/notificationEngine').then((engine) => {
      if (cancelled) return;
      const exam = () => {
        engine.checkExamAlerts(useExamStore.getState());
      };
      const review = () => {
        engine.checkReviewAlert(countDueReviews(useCtfStore.getState().machines, Date.now()));
      };
      exam();
      review();
      // Wall-clock based (end timestamp), so a throttled background tab catches up on the next poll.
      const a = window.setInterval(exam, EXAM_POLL_MS);
      const b = window.setInterval(review, REVIEW_POLL_MS);
      const onVisible = () => {
        if (document.visibilityState === 'visible') {
          exam();
          review();
        }
      };
      document.addEventListener('visibilitychange', onVisible);
      cleanup = () => {
        window.clearInterval(a);
        window.clearInterval(b);
        document.removeEventListener('visibilitychange', onVisible);
      };
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [on]);
}
