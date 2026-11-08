/** Routes that render the field manual as a full-screen workspace (no app chrome). */
export function isFullscreenNotesPath(pathname: string): boolean {
  return /^\/(field-manual|notes)\/?$/i.test(pathname);
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
  return {
    header: chromeOn,
    sidebar: chromeOn,
    mobileNav: chromeOn,
    payloadBar: true,
    onboarding: true,
    backupReminder: true,
    backupPlacement: 'default',
    notesDock: true,
    zenBanner: i.focusMode,
    zenEscape: true,
    mainLayout: 'default',
  };
}
