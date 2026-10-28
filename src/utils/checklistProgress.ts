import { Machine } from '../types';
import { MachineChecklistState, MethodologyPhase } from '../types/checklist';
import { generateApplicablePhases } from '../data/methodologyFramework';

export interface ChecklistProgress {
  total: number;
  completed: number;
  inProgress: number;
  na: number;
  activeTotal: number;
  percentage: number;
}

type ItemsState = MachineChecklistState['itemsState'];

export function computeChecklistProgress(
  phases: MethodologyPhase[],
  itemsState: ItemsState | undefined
): ChecklistProgress {
  let total = 0;
  let completed = 0;
  let inProgress = 0;
  let na = 0;

  phases.forEach((phase) => {
    phase.subcategories.forEach((subcat) => {
      subcat.items.forEach((item) => {
        const status = itemsState?.[item.id]?.status || 'todo';
        if (status === 'done') completed++;
        else if (status === 'in_progress') inProgress++;
        else if (status === 'na') na++;
        total++;
      });
    });
  });

  const activeTotal = total - na;
  const percentage = activeTotal > 0 ? Math.round((completed / activeTotal) * 100) : 0;

  return { total, completed, inProgress, na, activeTotal, percentage };
}

export function computeChecklistProgressForMachine(machine: Machine): ChecklistProgress {
  const phases = generateApplicablePhases(machine, machine.openPorts || []);
  return computeChecklistProgress(phases, machine.checklist?.itemsState);
}
