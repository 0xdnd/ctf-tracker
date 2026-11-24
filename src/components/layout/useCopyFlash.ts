import { useCallback, useEffect, useRef, useState } from 'react';
import { useCtfStore } from '../../store/useCtfStore';
import { playCyberSound, safeCopyToClipboard } from '../../utils/helpers';

export type CopyKey = 'lhost' | 'lport' | 'target' | 'domain' | 'dcIp' | 'user' | 'cred';

/** Copies a header variable and keeps its "copied" tick for 1.5 s. Empty values are ignored. */
export function useCopyFlash() {
  const soundEnabled = useCtfStore((s) => s.soundEnabled);
  const [copied, setCopied] = useState<CopyKey | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => clearTimer, []);

  const copy = useCallback(
    (value: string | undefined, key: CopyKey) => {
      if (!value || !value.trim()) return;
      void safeCopyToClipboard(value.trim());
      setCopied(key);
      if (soundEnabled) playCyberSound('copy');
      clearTimer();
      timer.current = setTimeout(() => setCopied((prev) => (prev === key ? null : prev)), 1500);
    },
    [soundEnabled],
  );

  /** Drops the tick for a field once its value is being edited. */
  const reset = useCallback((key: CopyKey) => {
    setCopied((prev) => {
      if (prev !== key) return prev;
      clearTimer();
      return null;
    });
  }, []);

  return { copied, copy, reset };
}
