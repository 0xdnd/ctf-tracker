import { Machine } from '../types';
import { MethodologyPhase, ChecklistItem } from '../types/checklist';
import { generateApplicablePhases } from '../data/methodologyFramework';

export interface RabbitHoleWarning {
  isRabbitHole: boolean;
  activeItem?: ChecklistItem;
  elapsedMinutes: number;
  message: string;
  recommendedFallback?: ChecklistItem;
  fallbackPhaseTitle?: string;
}

/**
 * Evaluates active item time and suggests fallback tasks if the tester is stuck.
 */
export function evaluateRabbitHoleStatus(
  machine: Machine,
  thresholdMinutes: number = 30
): RabbitHoleWarning {
  const checklist = machine.checklist;
  const activeItemId = checklist?.activeItemId;
  const itemsState = checklist?.itemsState || {};
  const openPorts = machine.openPorts || [];
  const applicablePhases = generateApplicablePhases(machine, openPorts);

  // Find the active item object
  let activeItem: ChecklistItem | undefined;
  for (const phase of applicablePhases) {
    for (const subcat of phase.subcategories) {
      const found = subcat.items.find((i) => i.id === activeItemId);
      if (found) {
        activeItem = found;
        break;
      }
    }
    if (activeItem) break;
  }

  if (!activeItem || !activeItemId) {
    return {
      isRabbitHole: false,
      elapsedMinutes: 0,
      message: '',
    };
  }

  const activeRecord = itemsState[activeItemId];
  const timeSpentSeconds = activeRecord?.timeSpentSeconds || 0;
  const elapsedMinutes = Math.floor(timeSpentSeconds / 60);

  // Find next logical fallback item (first unchecked item in earlier or parallel phase)
  let fallbackItem: ChecklistItem | undefined;
  let fallbackPhaseTitle: string | undefined;

  for (const phase of applicablePhases) {
    for (const subcat of phase.subcategories) {
      for (const item of subcat.items) {
        if (item.id !== activeItemId) {
          const status = itemsState[item.id]?.status || 'todo';
          if (status === 'todo') {
            fallbackItem = item;
            fallbackPhaseTitle = phase.title;
            break;
          }
        }
      }
      if (fallbackItem) break;
    }
    if (fallbackItem) break;
  }

  const isRabbitHole = elapsedMinutes >= thresholdMinutes;

  return {
    isRabbitHole,
    activeItem,
    elapsedMinutes,
    message: isRabbitHole
      ? `Potential Rabbit Hole detected! You have spent ${elapsedMinutes}m on "${activeItem.title}" without completion. Have you verified default services and uninspected ports first?`
      : '',
    recommendedFallback: fallbackItem,
    fallbackPhaseTitle,
  };
}
