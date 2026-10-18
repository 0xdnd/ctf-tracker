/**
 * proLabsData.ts
 * Official Hack The Box Pro Labs Presets for ZeroBox
 *
 * Strict Compliance Notice (Hack The Box Acceptable Use Policy §8.2):
 * Pro Labs are active enterprise simulation networks. ZeroBox bundles ONLY public metadata:
 * lab names, host counts, flag counts, difficulty tiers, exam alignment, and official HTB links.
 * ZeroBox contains ZERO walkthroughs, ZERO flags, ZERO exploit chains, and ZERO internal host details.
 */

import type { Difficulty } from '../types';
import type { ExamTrack } from '../utils/examComplianceUtils';

export interface ProLabPreset {
  id: string;
  name: string;
  difficulty: Difficulty;
  hostCount: number;
  flagCount: number;
  examAlignment: ExamTrack[];
  description: string;
  roomUrl: string;
  tags: string[];
}

export const OFFICIAL_HTB_PRO_LABS: ProLabPreset[] = [
  {
    id: 'prolab-genesis',
    name: 'Genesis',
    difficulty: 'Easy',
    hostCount: 6,
    flagCount: 13,
    examAlignment: ['CPTS'],
    description: 'Foundational enterprise network and beginner Active Directory penetration testing environment.',
    roomUrl: 'https://app.hackthebox.com/pro-labs/Genesis',
    tags: ['pro-lab', 'Active-Directory', 'CPTS', '6-hosts', '13-flags'],
  },
  {
    id: 'prolab-dante',
    name: 'Dante',
    difficulty: 'Medium',
    hostCount: 14,
    flagCount: 27,
    examAlignment: ['CPTS', 'OSCP', 'CRTO'],
    description: 'Intermediate enterprise Active Directory with multi-subnet pivoting, Linux and Windows mixed infrastructure.',
    roomUrl: 'https://app.hackthebox.com/pro-labs/Dante',
    tags: ['pro-lab', 'Active-Directory', 'Pivoting', 'CPTS', 'OSCP', 'CRTO', '14-hosts', '27-flags'],
  },
  {
    id: 'prolab-zephyr',
    name: 'Zephyr',
    difficulty: 'Hard',
    hostCount: 18,
    flagCount: 32,
    examAlignment: ['CRTO', 'CPTS', 'OSCP'],
    description: 'Advanced Active Directory exploitation, Kerberos delegation attacks, and red team network pivoting.',
    roomUrl: 'https://app.hackthebox.com/pro-labs/Zephyr',
    tags: ['pro-lab', 'Active-Directory', 'Kerberos', 'CRTO', 'CPTS', 'OSCP', '18-hosts', '32-flags'],
  },
  {
    id: 'prolab-offshore',
    name: 'Offshore',
    difficulty: 'Hard',
    hostCount: 18,
    flagCount: 38,
    examAlignment: ['CRTO', 'OSCP', 'CRTP'],
    description: 'Multi-forest enterprise Active Directory environment with trust relationships, defense evasion, and deep lateral movement.',
    roomUrl: 'https://app.hackthebox.com/pro-labs/Offshore',
    tags: ['pro-lab', 'Multi-Forest', 'Domain-Trusts', 'CRTO', 'OSCP', 'CRTP', '18-hosts', '38-flags'],
  },
  {
    id: 'prolab-rastalabs',
    name: 'RastaLabs',
    difficulty: 'Hard',
    hostCount: 19,
    flagCount: 26,
    examAlignment: ['CRTP', 'CRTO'],
    description: 'Premier red teaming simulation created by Rastamouse focusing on enterprise domain dominance and stealth operations.',
    roomUrl: 'https://app.hackthebox.com/pro-labs/RastaLabs',
    tags: ['pro-lab', 'Red-Team', 'Domain-Dominance', 'CRTP', 'CRTO', '19-hosts', '26-flags'],
  },
  {
    id: 'prolab-cybernetics',
    name: 'Cybernetics',
    difficulty: 'Insane',
    hostCount: 27,
    flagCount: 40,
    examAlignment: ['OSEP', 'CRTO'],
    description: 'Comprehensive enterprise red team simulation with advanced EDR evasion, segmented networks, and complex attack paths.',
    roomUrl: 'https://app.hackthebox.com/pro-labs/Cybernetics',
    tags: ['pro-lab', 'Enterprise-Red-Team', 'EDR-Evasion', 'OSEP', 'CRTO', '27-hosts', '40-flags'],
  },
  {
    id: 'prolab-aptlabs',
    name: 'AptLabs',
    difficulty: 'Insane',
    hostCount: 21,
    flagCount: 35,
    examAlignment: ['OSEP'],
    description: 'Advanced Persistent Threat (APT) simulation focusing on modern defense evasion, C2 infrastructure, and enterprise compromise.',
    roomUrl: 'https://app.hackthebox.com/pro-labs/AptLabs',
    tags: ['pro-lab', 'APT-Simulation', 'C2', 'OSEP', '21-hosts', '35-flags'],
  },
  {
    id: 'prolab-halcyon',
    name: 'Halcyon',
    difficulty: 'Hard',
    hostCount: 15,
    flagCount: 20,
    examAlignment: ['CPTS', 'CRTO'],
    description: 'Modern hybrid cloud and on-premises enterprise Active Directory simulation featuring Azure AD / Entra ID attack vectors.',
    roomUrl: 'https://app.hackthebox.com/pro-labs/Halcyon',
    tags: ['pro-lab', 'Hybrid-Cloud', 'Azure-AD', 'Entra-ID', 'CPTS', 'CRTO', '15-hosts', '20-flags'],
  },
  {
    id: 'prolab-mayhem',
    name: 'Mayhem',
    difficulty: 'Hard',
    hostCount: 16,
    flagCount: 25,
    examAlignment: ['CPTS', 'OSCP'],
    description: 'Hardened Windows and Linux dual-infrastructure enterprise environment with multi-tier network segregation.',
    roomUrl: 'https://app.hackthebox.com/pro-labs/Mayhem',
    tags: ['pro-lab', 'Enterprise-Infrastructure', 'Linux-Windows', 'CPTS', 'OSCP', '16-hosts', '25-flags'],
  },
  {
    id: 'prolab-blizzard',
    name: 'Blizzard',
    difficulty: 'Insane',
    hostCount: 16,
    flagCount: 24,
    examAlignment: ['OSEP', 'CRTO'],
    description: 'Adversary emulation and red team infrastructure simulation in an enterprise environment protected by modern defensive controls.',
    roomUrl: 'https://app.hackthebox.com/pro-labs/Blizzard',
    tags: ['pro-lab', 'Adversary-Emulation', 'Stealth', 'OSEP', 'CRTO', '16-hosts', '24-flags'],
  },
];

/** Lookup a preset by name (case-insensitive) */
export function findProLabPreset(name: string): ProLabPreset | undefined {
  const norm = name.trim().toLowerCase();
  return OFFICIAL_HTB_PRO_LABS.find((p) => p.name.toLowerCase() === norm || p.id.toLowerCase() === norm);
}
