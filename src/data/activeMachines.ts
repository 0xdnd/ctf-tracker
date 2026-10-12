import raw from './activeMachines.json';
import type { Difficulty, OperatingSystem } from '../types';

/** One currently-active HTB machine: public listing metadata only (HTB AUP §8.2). */
export interface ActiveMachineEntry {
  name: string;
  os: OperatingSystem;
  difficulty: Difficulty;
  /** ISO date (YYYY-MM-DD) the machine was released. */
  releasedAt: string;
  season?: string;
}

export interface ActiveMachinesList {
  /** ISO date (YYYY-MM-DD) the list was last checked against the HTB Active tab. */
  asOf: string;
  source: string;
  note?: string;
  machines: ActiveMachineEntry[];
}

/** Single source of truth for which HTB machines are active (see scripts/check-active-machines.mjs). */
export const ACTIVE_MACHINES = raw as ActiveMachinesList;
