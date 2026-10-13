export type Platform = 'HTB' | 'THM' | 'Custom';

export type OperatingSystem = 'Linux' | 'Windows' | 'BSD' | 'Android' | 'macOS' | 'Other';

export type Difficulty = 'Very Easy' | 'Easy' | 'Medium' | 'Hard' | 'Insane';

export type PipelineStatus = 'backlog' | 'recon' | 'foothold' | 'root' | 'completed';

export interface TargetServicePort {
  port: number;
  protocol: 'tcp' | 'udp';
  state: string;
  service: string;
  version?: string;
  cveNotes?: string;
  suggestedTools?: string[];
}

export interface Machine {
  id: string;
  name: string;
  ip: string;
  os: OperatingSystem;
  platform: Platform;
  difficulty: Difficulty;
  status: PipelineStatus;
  tags: string[];
  certifications: ('OSCP' | 'CPTS' | 'CRTO' | 'HTB-Starting-Point')[];
  roomUrl?: string;
  writeupUrl?: string;
  hint?: string;
  userFlag?: string;
  rootFlag?: string;
  userPwnedAt?: string;
  rootPwnedAt?: string;
  timeSpentSeconds: number;
  timeToUserSeconds?: number;
  timeToRootSeconds?: number;
  perceivedDifficulty?: Difficulty;
  rating?: number; // 1 to 5 stars
  quickNotes?: string;
  writeupMarkdown?: string;
  skillsLearned?: string[];
  officialPdf?: string;
  officialSynopsis?: string;
  officialWalkthrough?: string;
  isCustom?: boolean;
  openPorts?: number[];
  services?: TargetServicePort[];
  scanSummary?: string;
  rawScanOutput?: string;
  isActive?: boolean;
  checklist?: import('./checklist').MachineChecklistState;
  // Optional per-lab study data (see ./labStudy). Absent on rows written by older builds.
  domain?: string;
  vhosts?: string[];
  /** Keyed by port number as a string (JSON object keys are always strings). */
  portTriage?: Record<string, import('./labStudy').PortTriageEntry>;
  findings?: import('./labStudy').LabFinding[];
  timeline?: import('./labStudy').TimelineEvent[];
  solveIndependence?: import('./labStudy').SolveIndependence;
  /** Epoch ms of the next spaced-repetition review. */
  nextReviewAt?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** Record of a hard-deleted machine, so a sync merge does not bring it back. */
export interface MachineTombstone {
  id: string;
  deletedAt: string;
}

export * from './checklist';
export * from './graph';
export * from './loot';
export * from './labStudy';

export interface CheatsheetCommand {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  description: string;
  commandTemplate: string;
  tags: string[];
  isCustom?: boolean;
  isStarred?: boolean;
  platform?: 'Linux' | 'Windows' | 'Both';
}

export interface GlobalVariables {
  lhost: string;
  lport: string;
  targetIp: string;
  interface: string;
  domain?: string;
  dcIp?: string;
  user?: string;
  cred?: string;
  wordlist?: string;
  customVars: Record<string, string>;
}

export interface ActivitySession {
  id: string;
  machineId: string;
  machineName: string;
  date: string; // YYYY-MM-DD
  durationSeconds: number;
  type: 'recon' | 'foothold' | 'root' | 'session';
}

export type ViewMode = 'kanban' | 'table' | 'grid' | 'graph';
