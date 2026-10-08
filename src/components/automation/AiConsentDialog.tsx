import React, { useId, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Send, X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { CyberButton } from '../common/CyberButton';
import { TACTICAL_SPRING } from '../../utils/motionTokens';

export interface AiConsentDialogProps {
  isOpen: boolean;
  /** True when the outgoing payload is redacted; false means it is NOT redacted. */
  redacted: boolean;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  destinationHost?: string;
  onCancel: () => void;
  /** rememberRedacted is only ever true when `redacted` is also true. */
  onSend: (rememberRedacted: boolean) => void;
}

/**
 * Consent dialog shown before any scan data is sent to Anthropic. Displays the
 * EXACT request payload (post-redaction, when redaction is on) so the operator
 * can verify what leaves the browser before approving.
 */
export const AiConsentDialog: React.FC<AiConsentDialogProps> = ({
  isOpen,
  redacted,
  model,
  systemPrompt,
  userPrompt,
  destinationHost = 'api.anthropic.com',
  onCancel,
  onSend
}) => {
  const titleId = useId();
  const bodyId = useId();
  const [remember, setRemember] = useState(true);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const trapRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onClose: onCancel,
    autoFocusFirst: false
  });

  React.useEffect(() => {
    if (isOpen) cancelRef.current?.focus();
  }, [isOpen]);

  const payloadPreview = JSON.stringify(
    {
      destination: `https://${destinationHost}/v1/messages`,
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    },
    null,
    2
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[320] flex items-center justify-center p-4 bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
        >
          <motion.div
            ref={trapRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-subtle bg-surface-elevated p-5 shadow-xl"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: TACTICAL_SPRING }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className={`w-5 h-5 ${redacted ? 'text-accent' : 'text-callout-warn-fg'}`} />
                <h2 id={titleId} className="text-base font-semibold text-primary">
                  Send scan data to Anthropic?
                </h2>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="text-muted hover:text-primary rounded p-1"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p id={bodyId} className="mt-2 text-xs text-secondary">
              No telemetry. AI is optional and uses your own key. This request will be sent directly from your
              browser to <strong className="text-primary font-mono">{destinationHost}</strong> using model{' '}
              <strong className="text-primary font-mono">{model}</strong>.{' '}
              {redacted ? (
                <span className="text-callout-success-fg font-medium">
                  Redaction is ON - IPs, hostnames, AD domains, and usernames below have been replaced with
                  placeholders.
                </span>
              ) : (
                <span className="text-callout-warn-fg font-medium">
                  Redaction is OFF - the exact payload below, including real IPs/hostnames/usernames, will be sent
                  as-is.
                </span>
              )}
            </p>

            <div className="mt-3 flex-1 overflow-y-auto rounded-xl bg-surface-sunken border border-subtle p-3">
              <pre className="text-[11px] font-mono text-primary whitespace-pre-wrap break-words">
                {payloadPreview}
              </pre>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              {redacted ? (
                <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-3.5 w-3.5 accent-accent"
                  />
                  <span>Remember this consent for future redacted requests on this device</span>
                </label>
              ) : (
                <span className="text-[11px] text-muted">Unredacted sends always require confirmation.</span>
              )}

              <div className="flex items-center gap-2 flex-shrink-0">
                <CyberButton ref={cancelRef} variant="secondary" onClick={onCancel}>
                  Cancel
                </CyberButton>
                <CyberButton
                  variant={redacted ? 'primary' : 'danger'}
                  iconLeft={<Send className="w-3.5 h-3.5" />}
                  onClick={() => onSend(redacted && remember)}
                >
                  Send
                </CyberButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
