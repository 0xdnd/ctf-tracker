import { useCtfStore } from '../store/useCtfStore';
import { useExamStore } from '../store/examStore';
import { useNotesWorkspaceStore } from '../store/useNotesWorkspaceStore';
import { stripTrailingSlash } from '../utils/pathUtils';
import { GUIDE_META } from './guideMeta';

export type GuideAvailability = { available: true } | { available: false; reason: string };

/** What opening a guide needs from the onboarding store, passed in to keep this module free of it. */
export interface GuideOpenContext {
  requestBackupTab: (tab: 'backup' | 'bulk_pwn') => void;
}

export type GuideArea = 'reference' | 'records' | 'exams' | 'machines' | 'data' | 'anywhere';

export interface GuideEntry {
  id: string;
  /** The Guide Center group it is listed under. */
  area: GuideArea;
  /** Page the guide runs on. Omitted when it runs over whatever page is open. */
  route?: () => string | null;
  /** Opens the panel or modal the guide is about, once any route change has been asked for. */
  open?: (ctx: GuideOpenContext) => void;
  /** When the guide can run. Omitted means always. */
  availability?: () => GuideAvailability;
  /** Selector to wait for when the guide has no first anchor of its own. */
  ready?: string;
}

const AVAILABLE: GuideAvailability = { available: true };
// Not Guide Center or a runner still animating out: the wait is for the guide's own host, so that its
// focus trap is in place before the guide's goes on top of it.
const ANY_DIALOG = '[role="dialog"][aria-modal="true"]:not([data-guide-surface])';

const examLive = () => {
  const status = useExamStore.getState().status;
  return status === 'running' || status === 'paused';
};

const activeTarget = () => useCtfStore.getState().activeTargetId ?? null;

const needsTarget = (): GuideAvailability =>
  activeTarget()
    ? AVAILABLE
    : { available: false, reason: 'Pick a machine first: open one in the tracker and press Engage.' };

/** Display order in Guide Center. Guides within an area keep the order of the list below. */
const AREAS: { id: GuideArea; title: string }[] = [
  { id: 'reference', title: 'Plans and commands' },
  { id: 'records', title: 'Your records' },
  { id: 'exams', title: 'Practice exams' },
  { id: 'machines', title: 'Machines' },
  { id: 'data', title: 'Import and backup' },
  { id: 'anywhere', title: 'On every page' },
];

/** The app only offers focus mode on machines that have retired. */
const focusAvailable = (): GuideAvailability => {
  const needs = needsTarget();
  if (!needs.available) return needs;
  const { machines } = useCtfStore.getState();
  return machines.find((m) => m.id === activeTarget())?.isActive
    ? { available: false, reason: 'Not for active machines. Engage a retired machine first.' }
    : AVAILABLE;
};

const entries: GuideEntry[] = [
  { id: 'methodology', area: 'reference', route: () => '/methodology' },
  { id: 'reverse-shells', area: 'reference', route: () => '/reverse-shell' },
  { id: 'cheatsheets', area: 'reference', route: () => '/cheatsheets' },
  { id: 'field-manual', area: 'reference', route: () => '/notes' },
  { id: 'writeup', area: 'records', route: () => '/writeup' },
  { id: 'vault', area: 'records', route: () => '/vault' },
  { id: 'analytics', area: 'records', route: () => '/analytics' },
  {
    id: 'exam',
    area: 'exams',
    route: () => '/exam',
    availability: () => (examLive() ? { available: false, reason: 'Finish your running exam first.' } : AVAILABLE),
  },
  {
    // Only ever joins an exam that is already running. Nothing here may start one.
    id: 'exam-room',
    area: 'exams',
    route: () => '/exam',
    availability: () =>
      examLive() ? AVAILABLE : { available: false, reason: 'Opens while an exam is running. Start one from the Exam page.' },
  },
  {
    id: 'machine',
    area: 'machines',
    route: () => {
      const id = activeTarget();
      return id ? `/target/${id}` : null;
    },
    availability: needsTarget,
  },
  {
    id: 'focus',
    area: 'machines',
    route: () => {
      const id = activeTarget();
      return id ? `/target/${id}/focus` : null;
    },
    availability: focusAvailable,
  },
  {
    id: 'machine-quick',
    area: 'machines',
    open: () => useCtfStore.getState().setSelectedMachineId(activeTarget()),
    availability: needsTarget,
  },
  {
    id: 'graph',
    area: 'machines',
    route: () => '/tracker',
    open: () => useCtfStore.getState().setViewMode('graph'),
  },
  { id: 'new-machine', area: 'machines', open: () => useCtfStore.getState().setNewMachineModalOpen(true) },
  {
    id: 'backup',
    area: 'data',
    open: ({ requestBackupTab }) => {
      requestBackupTab('backup');
      useCtfStore.getState().setBackupModalOpen(true);
    },
  },
  {
    id: 'bulk-import',
    area: 'data',
    open: ({ requestBackupTab }) => {
      requestBackupTab('bulk_pwn');
      useCtfStore.getState().setBackupModalOpen(true);
    },
  },
  { id: 'notes-import', area: 'data', open: () => useCtfStore.getState().setNotesImportModalOpen(true) },
  { id: 'notes', area: 'anywhere', open: () => useNotesWorkspaceStore.getState().setIsOpen(true) },
  { id: 'snippets-drawer', area: 'anywhere', open: () => useCtfStore.getState().setSnippetsDrawerOpen(true) },
  { id: 'revshell', area: 'anywhere', open: () => useCtfStore.getState().setRevShellModalOpen(true) },
  // CommandPalette has no anchors of its own, so this one waits for the dialog instead.
  { id: 'palette', area: 'anywhere', open: () => useCtfStore.getState().setCommandPaletteOpen(true), ready: ANY_DIALOG },
  { id: 'settings', area: 'anywhere', open: () => useCtfStore.getState().setSettingsModalOpen(true) },
];

export const GUIDE_REGISTRY: Record<string, GuideEntry> = Object.fromEntries(entries.map((e) => [e.id, e]));

export const GUIDE_GROUPS: { id: GuideArea; title: string; guides: string[] }[] = AREAS.map((area) => ({
  ...area,
  guides: entries.filter((e) => e.area === area.id).map((e) => e.id),
}));

/** Display order in Guide Center, and the order guides are suggested in. */
export const GUIDE_ORDER: string[] = GUIDE_GROUPS.flatMap((g) => g.guides);

export const GUIDE_COUNT = GUIDE_ORDER.length;

export function guideAvailability(id: string): GuideAvailability {
  const entry = GUIDE_REGISTRY[id];
  if (!entry || !GUIDE_META[id]) return { available: false, reason: 'This guide is not available.' };
  return entry.availability?.() ?? AVAILABLE;
}

/** The next unfinished guide that can run now, walking forward from the one just finished. */
export function suggestNextGuide(afterId: string, completed: string[]): string | null {
  const start = GUIDE_ORDER.indexOf(afterId);
  for (let step = 1; step <= GUIDE_ORDER.length; step++) {
    const id = GUIDE_ORDER[(start + step) % GUIDE_ORDER.length];
    if (id !== afterId && !completed.includes(id) && guideAvailability(id).available) return id;
  }
  return null;
}

export const samePath = (a: string, b: string) => stripTrailingSlash(a) === stripTrailingSlash(b);
