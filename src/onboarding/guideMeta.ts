/**
 * The eager half of the onboarding copy: what the first paint and the one-time page tips need.
 * Spotlight steps live in ./content, which only loads with the runner.
 */
export type TourIconName =
  | 'sparkles'
  | 'compass'
  | 'layout'
  | 'pointer'
  | 'search'
  | 'save'
  | 'check'
  | 'notes'
  | 'target'
  | 'terminal'
  | 'file'
  | 'exam'
  | 'vault'
  | 'chart'
  | 'list'
  | 'timer'
  | 'menu'
  | 'edit'
  | 'download'
  | 'key'
  | 'settings'
  | 'focus'
  | 'plus'
  | 'flag'
  | 'code'
  | 'shell';

/** What the visitor does on a hands-on step; the tour advances when they do it. */
export type HandsOn = 'layout' | 'machine' | 'palette' | 'import';

export type TourActionId = 'add-machine' | 'import-notes' | 'try-exam' | 'import-solved';

export interface TourAction {
  id: TourActionId;
  label: string;
}

export interface TourStep {
  id: string;
  /** data-tour value to spotlight. Omit for a centered card. */
  anchor?: string;
  /** Spotlight this at once when `anchor` is not on the page, e.g. an empty state in place of its charts. */
  altAnchor?: string;
  /** Copy for when `altAnchor` is standing in, where the main copy would describe something not on the page. */
  altTitle?: string;
  altBody?: string;
  title: string;
  body: string;
  /** Phone width: spotlight this instead, because `anchor` is hidden there. */
  phoneAnchor?: string;
  /** Phone width: no spotlight, for a control that has no equivalent there. */
  phoneCentered?: boolean;
  /** Phone width: copy for a step whose wording only fits a mouse or a keyboard. */
  phoneTitle?: string;
  phoneBody?: string;
  icon: TourIconName;
  /** The step is non-modal and clicks reach the anchor. */
  handsOn?: HandsOn;
  /** Large centered welcome screen with Start tour / Skip. */
  welcome?: boolean;
  /** Buttons shown on the step (closing steps). */
  actions?: TourAction[];
  /** Makes the action buttons the filled primary buttons and the Next button a plain secondary one. */
  actionsPrimary?: boolean;
  /** Replaces the label of the Next button, e.g. "Skip for now". */
  nextLabel?: string;
  /** Where the card docks when it cannot sit beside, below or above the anchor. Defaults to 'bottom'. */
  overlapDock?: 'top' | 'bottom';
}

export const WELCOME_ROWS: { icon: TourIconName; title: string; body: string }[] = [
  { icon: 'target', title: 'Track machines', body: 'Keep a list of the practice labs you try and how far you got.' },
  { icon: 'notes', title: 'Take notes', body: 'Write notes and writeups, and keep your favorite commands handy.' },
  { icon: 'exam', title: 'Practice exams', body: 'Run timed practice sessions for certification exams.' },
];

export const WELCOME_STEP: TourStep = {
  id: 'welcome',
  icon: 'sparkles',
  welcome: true,
  title: 'Welcome to ZeroBox',
  body: 'A free prep tracker for CTFs and hacking labs. It runs in your browser and keeps everything on this device.',
};

/** Which tour runs: the short first-visit list, or the full tour replayed from Settings and the palette. */
export type TourKind = 'first-run' | 'full';

/** Step ids of each tour, kept here so the welcome card can advance before the steps have loaded. */
export const FIRST_RUN_STEP_IDS: readonly string[] = ['welcome', 'sidebar', 'machine', 'import', 'final'];
export const FULL_TOUR_STEP_IDS: readonly string[] = ['welcome', 'sidebar', 'layouts', 'machine', 'palette', 'backup', 'import', 'final'];

export interface GuideMeta {
  id: string;
  icon: TourIconName;
  title: string;
  /** One or two lines shown on the offer card and in Guide Center, at any screen size. */
  intro: string;
  /** Name in Guide Center, for a title that only makes sense on its own page. */
  listTitle?: string;
  /** Heading of the finish moment, for a title that does not read well with "done" after it. */
  doneTitle?: string;
}

export const GUIDE_META: Record<string, GuideMeta> = {
  notes: {
    id: 'notes',
    icon: 'notes',
    title: 'Notes panel',
    intro: 'Your notes open in a panel next to whatever page you are on, so you can read them while you work.',
  },
  machine: {
    id: 'machine',
    icon: 'target',
    title: 'Machine page',
    intro: 'This page holds everything for one practice machine.',
  },
  methodology: {
    id: 'methodology',
    icon: 'compass',
    title: 'Methodology',
    intro: 'Follow a step-by-step plan for one machine, from the first look to full access.',
  },
  cheatsheets: {
    id: 'cheatsheets',
    icon: 'code',
    title: 'Snippets and payloads',
    intro: 'Ready-made commands for common jobs, with your own details filled in. Reverse shells have their own page.',
  },
  'reverse-shells': {
    id: 'reverse-shells',
    icon: 'shell',
    title: 'Reverse shells',
    intro: 'Build the command that makes a target connect back to your machine, so you can control it.',
  },
  'field-manual': {
    id: 'field-manual',
    icon: 'notes',
    title: 'Field manual',
    intro: 'Your field manual shows your own Markdown notes, for example an Obsidian vault. It is empty until you import some.',
  },
  writeup: {
    id: 'writeup',
    icon: 'file',
    title: 'Writeup studio',
    intro: 'A writeup is a report of how you solved a machine. Write it here with a live preview.',
  },
  exam: {
    id: 'exam',
    icon: 'exam',
    title: 'Exam simulator',
    intro: 'Practice a certification exam with a real countdown, scoring and rules.',
  },
  'exam-room': {
    id: 'exam-room',
    icon: 'timer',
    title: 'Your exam is running',
    listTitle: 'Exam room',
    doneTitle: 'Exam room guide done',
    intro: 'This is your exam room. The clock is counting down, so take a quick look around first.',
  },
  vault: {
    id: 'vault',
    icon: 'vault',
    title: 'Vault',
    intro: 'The vault keeps what you find in one place: passwords, flags, hashes and keys.',
  },
  analytics: {
    id: 'analytics',
    icon: 'chart',
    title: 'Analytics',
    intro: 'Charts of your progress: your totals, a skill radar and an activity calendar.',
  },
  backup: {
    id: 'backup',
    icon: 'save',
    title: 'Backup',
    intro: 'A backup is a file that holds your whole workspace. This window saves one, restores one, and imports machines you already solved.',
  },
  'bulk-import': {
    id: 'bulk-import',
    icon: 'flag',
    title: 'Bulk import',
    intro: 'Mark machines you already solved in one go. Paste a list of names and ZeroBox finds them.',
  },
  palette: {
    id: 'palette',
    icon: 'search',
    title: 'Command palette',
    intro: 'Search your notes, writeups and vault from one box, or type an action to run it.',
  },
  'new-machine': {
    id: 'new-machine',
    icon: 'plus',
    title: 'Add a machine',
    doneTitle: 'Adding a machine: done',
    intro: 'Add your own machine or lab to the tracker, even if it is not in the built-in list.',
  },
  'notes-import': {
    id: 'notes-import',
    icon: 'notes',
    title: 'Import notes',
    doneTitle: 'Importing notes: done',
    intro: 'Bring your own notes into ZeroBox. They stay in this browser and are never uploaded.',
  },
  'machine-quick': {
    id: 'machine-quick',
    icon: 'target',
    title: 'Quick view',
    intro: 'A quick look at one machine. Open its full page when you want more room.',
  },
  graph: {
    id: 'graph',
    icon: 'layout',
    title: 'Graph view',
    intro: 'The graph draws your machines as a map you can move around and arrange.',
  },
  focus: {
    id: 'focus',
    icon: 'focus',
    title: 'Focus mode',
    intro: 'Focus mode keeps this one machine in front of you while you work on it.',
  },
  settings: {
    id: 'settings',
    icon: 'settings',
    title: 'Settings',
    intro: 'Change how ZeroBox looks and set your default details.',
  },
  revshell: {
    id: 'revshell',
    icon: 'shell',
    title: 'Reverse shell crafter',
    intro: 'A reverse shell is when a target connects back to your machine. This tool builds the command for you, using your LHOST and LPORT.',
  },
  'snippets-drawer': {
    id: 'snippets-drawer',
    icon: 'code',
    title: 'Snippets drawer',
    intro: 'Your saved commands, available from any page without leaving what you are doing.',
  },
};

/** Maps a route path to the section guide offered the first time it is opened. */
export function guideIdForPath(rawPath: string, examActive = false): string | null {
  const path = rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : rawPath;
  if (path === '/methodology') return 'methodology';
  if (path === '/reverse-shell') return 'reverse-shells';
  if (path === '/cheatsheets' || path === '/cheatsheet') return 'cheatsheets';
  if (path === '/notes' || path === '/field-manual') return 'field-manual';
  if (path === '/writeup' || path.startsWith('/writeup/')) return 'writeup';
  if (path === '/analytics') return 'analytics';
  if (path === '/exam' || path === '/exam-simulator') return examActive ? 'exam-room' : 'exam';
  if (['/vault', '/evidence', '/loot'].includes(path)) return 'vault';
  if (/^\/targets?\/[^/]+\/focus$/.test(path)) return 'focus';
  if (/^\/targets?\/[^/]+$/.test(path)) return 'machine';
  return null;
}
