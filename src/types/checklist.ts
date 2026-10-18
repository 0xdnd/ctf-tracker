export type ChecklistItemStatus = 'todo' | 'in_progress' | 'done' | 'na';

export interface ChecklistItem {
  id: string;
  title: string;
  commandSnippet?: string;
  description?: string;
  serviceBranch?: ServiceBranchType;
}

export interface ChecklistSubcategory {
  id: string;
  title: string;
  serviceBranch?: ServiceBranchType;
  requiredPorts?: number[];
  requiredOs?: ('Linux' | 'Windows' | 'BSD' | 'Android' | 'Other')[];
  items: ChecklistItem[];
}

export interface MethodologyPhase {
  phaseNumber: number;
  id: string;
  title: string;
  subtitle: string;
  description: string;
  subcategories: ChecklistSubcategory[];
}

export type ServiceBranchType =
  | 'universal'
  | 'web'
  | 'file_sharing'
  | 'remote_access'
  | 'database'
  | 'network_mgmt'
  | 'linux_privesc'
  | 'windows_privesc';

export interface MachineChecklistState {
  openPorts: number[];
  activeItemId: string | null;
  itemsState: Record<
    string,
    {
      status: ChecklistItemStatus;
      notes?: string;
      startedAt?: string;
      completedAt?: string;
      timeSpentSeconds?: number;
    }
  >;
}
