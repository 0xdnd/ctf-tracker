import { MASTER_METHODOLOGY_FRAMEWORK } from '../data/methodologyFramework';
import type { MethodologyPhase } from '../types/checklist';

export interface HiddenItemsSummary {
  total: number;
  shown: number;
  hidden: number;
  /** True when every hidden item is hidden by the target's OS alone (no port-based branch is hidden). */
  osOnly: boolean;
}

const OS_BRANCHES = new Set(['linux_privesc', 'windows_privesc']);

const countItems = (phases: MethodologyPhase[]) =>
  phases.reduce((n, p) => n + p.subcategories.reduce((m, s) => m + s.items.length, 0), 0);

/** Compares a target's applicable phases with the full framework. */
export function summarizeHiddenItems(applicable: MethodologyPhase[]): HiddenItemsSummary {
  const shownIds = new Set(applicable.flatMap((p) => p.subcategories.map((s) => s.id)));
  let osOnly = true;
  for (const phase of MASTER_METHODOLOGY_FRAMEWORK) {
    for (const s of phase.subcategories) {
      if (!shownIds.has(s.id) && !OS_BRANCHES.has(s.serviceBranch ?? '')) osOnly = false;
    }
  }
  const total = countItems(MASTER_METHODOLOGY_FRAMEWORK);
  const shown = countItems(applicable);
  return { total, shown, hidden: total - shown, osOnly };
}

/** One line for the checklist header, or null when nothing is filtered. */
export function hiddenItemsMessage(applicable: MethodologyPhase[], os?: string): string | null {
  const { total, shown, hidden, osOnly } = summarizeHiddenItems(applicable);
  if (hidden <= 0) return null;
  const noun = hidden === 1 ? 'item is' : 'items are';
  const article = os && /^[aeiou]/i.test(os) ? 'an' : 'a';
  const cause = osOnly && os ? `${article} ${os} target` : "this target's OS or open ports";
  return `Showing ${shown} of ${total} items. ${hidden} ${noun} hidden because ${hidden === 1 ? 'it doesn\'t' : "they don't"} apply to ${cause}.`;
}
