// ZeroBox Master Target Catalog
// 100% Pure CTF Challenges (TryHackMe & Hack The Box)
// Daniel Dayan's Solved Roster: 45 HTB + 18 THM = 63 Pwned Targets
// Enriched with Official Hack The Box Walkthroughs & Intelligence
// Synchronized as of October 2026 (Live HTB 20 Active Machines + Full TJ_Null Roadmap)
import { Machine } from '../types';
import rawMachines from './machinesCatalog.json';

export const INITIAL_MACHINES: Machine[] = rawMachines as Machine[];
