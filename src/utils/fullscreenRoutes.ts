/** Routes that render the field manual as a full-screen workspace (no app chrome). */
export function isFullscreenNotesPath(pathname: string): boolean {
  return /^\/(field-manual|notes)\/?$/i.test(pathname);
}

/** The single-target focus page: /target/:id/focus. */
export function isTargetFocusPath(pathname: string): boolean {
  return /^\/targets?\/[^/]+\/focus\/?$/i.test(pathname);
}

export interface ShellChrome {
  header: boolean;
  sidebar: boolean;
  mobileNav: boolean;
  payloadBar: boolean;
  onboarding: boolean;
  backupReminder: boolean;
  backupPlacement: 'default' | 'notes';
  notesDock: boolean;
  zenBanner: boolean;
  zenEscape: boolean;
  mainLayout: 'default' | 'bare' | 'fullscreen';
}

/** Single source of truth for which app chrome shows on a route. */
export function getShellChrome(i: { pathname: string; isPopout: boolean; focusMode: boolean }): ShellChrome {
  if (i.isPopout) {
    return {
      header: false,
      sidebar: false,
      mobileNav: false,
      payloadBar: false,
      onboarding: false,
      backupReminder: false,
      backupPlacement: 'default',
      notesDock: false,
      zenBanner: i.focusMode,
      zenEscape: true,
      mainLayout: 'bare',
    };
  }
  if (isFullscreenNotesPath(i.pathname)) {
    return {
      header: false,
      sidebar: false,
      mobileNav: false,
      payloadBar: false,
      // Section guides, Guide Center and page hints stay available; only the first-run tour is skipped.
      onboarding: true,
      backupReminder: true,
      backupPlacement: 'notes',
      notesDock: false,
      zenBanner: false,
      zenEscape: false,
      mainLayout: 'fullscreen',
    };
  }
  const chromeOn = !i.focusMode;
  // The focus page drops the module sidebar and the bottom tab bar; its own Exit focus control stays.
  const navChrome = chromeOn && !isTargetFocusPath(i.pathname);
  // Hide the floating payload chip on pages that already show an inline "Your details" variable bar
  // (methodology, reverse-shell) or have no payload context (calculator, analytics) so it never blocks bottom-right buttons.
  const hidePayloadBar = /^\/(methodology|reverse-shell|oscp-points-calculator|analytics)\/?$/i.test(i.pathname);
  return {
    header: chromeOn,
    sidebar: navChrome,
    mobileNav: navChrome,
    payloadBar: !hidePayloadBar,
    onboarding: true,
    backupReminder: true,
    backupPlacement: 'default',
    notesDock: true,
    zenBanner: i.focusMode,
    zenEscape: true,
    mainLayout: 'default',
  };
}
