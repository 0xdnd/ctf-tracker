/**
 * aiConsent.ts
 * Per-device consent persistence for sending (redacted) scan data to Anthropic.
 *
 * Only redacted-mode consent is ever remembered. Unredacted sends always
 * require a fresh confirmation, every time redaction is turned off.
 */

const STORAGE_KEY_CONSENT_REDACTED = 'zerobox_ai_consent_redacted';

export function hasRememberedRedactedConsent(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_CONSENT_REDACTED) === 'true';
  } catch {
    return false;
  }
}

export function rememberRedactedConsent(): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONSENT_REDACTED, 'true');
  } catch {
    // Ignore storage errors
  }
}

export function clearRememberedConsent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_CONSENT_REDACTED);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Whether the consent dialog can be skipped for this attempt.
 * Unredacted requests are never pre-approved - they always need the dialog.
 */
export function canSkipConsentDialog(redact: boolean): boolean {
  return redact && hasRememberedRedactedConsent();
}
