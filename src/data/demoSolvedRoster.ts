import { Machine } from '../types';

/**
 * Reference/demo solved machine pack (63 targets: 45 HTB + 18 THM).
 * Contains Daniel Dayan's solved roster, flag captures, and timing metrics.
 * Available on-demand via "Load Demo Solves" in Settings or Command Palette.
 */
export const DEMO_SOLVED_ROSTER: Partial<Machine>[] = [
  {
    id: "thm-rootme",
    status: "completed",
    timeSpentSeconds: 2700,
    timeToUserSeconds: 1080,
    timeToRootSeconds: 2700,
    userFlag: "THM{flag_captured_demo_rootme}",
    rootFlag: "THM{system_pwned_demo_rootme}",
    userPwnedAt: "2026-08-15T14:20:00.000Z",
    rootPwnedAt: "2026-08-15T15:10:00.000Z"
  },
  {
    id: "thm-pickle-rick",
    status: "completed",
    timeSpentSeconds: 1800,
    timeToUserSeconds: 720,
    timeToRootSeconds: 1800,
    userFlag: "THM{flag_captured_demo_picklerick}",
    rootFlag: "THM{system_pwned_demo_picklerick}",
    userPwnedAt: "2026-08-15T14:20:00.000Z",
    rootPwnedAt: "2026-08-15T15:10:00.000Z"
  },
  {
    id: "thm-cowboyhacker",
    status: "completed",
    timeSpentSeconds: 2700,
    timeToUserSeconds: 1080,
    timeToRootSeconds: 2700,
    userFlag: "THM{flag_captured_demo_bountyhacker}",
    rootFlag: "THM{system_pwned_demo_bountyhacker}",
    userPwnedAt: "2026-08-15T14:20:00.000Z",
    rootPwnedAt: "2026-08-15T15:10:00.000Z"
  },
  {
    id: "htb-lame",
    status: "completed",
    timeSpentSeconds: 2100,
    timeToUserSeconds: 900,
    timeToRootSeconds: 2100,
    userFlag: "HTB{lame_user_flag_captured}",
    rootFlag: "HTB{lame_root_flag_captured}",
    userPwnedAt: "2026-08-15T14:20:00.000Z",
    rootPwnedAt: "2026-08-15T15:10:00.000Z"
  },
  {
    id: "htb-legacy",
    status: "completed",
    timeSpentSeconds: 1500,
    timeToUserSeconds: 600,
    timeToRootSeconds: 1500,
    userFlag: "HTB{legacy_user_flag_captured}",
    rootFlag: "HTB{legacy_root_flag_captured}",
    userPwnedAt: "2026-08-15T14:20:00.000Z",
    rootPwnedAt: "2026-08-15T15:10:00.000Z"
  },
  {
    id: "htb-blue",
    status: "completed",
    timeSpentSeconds: 1200,
    timeToUserSeconds: 400,
    timeToRootSeconds: 1200,
    userFlag: "HTB{blue_user_flag_captured}",
    rootFlag: "HTB{blue_root_flag_captured}",
    userPwnedAt: "2026-08-15T14:20:00.000Z",
    rootPwnedAt: "2026-08-15T15:10:00.000Z"
  },
  {
    id: "htb-sau",
    status: "completed",
    timeSpentSeconds: 3200,
    timeToUserSeconds: 1200,
    timeToRootSeconds: 3200,
    userFlag: "HTB{sau_user_flag_captured}",
    rootFlag: "HTB{sau_root_flag_captured}",
    userPwnedAt: "2026-08-15T14:20:00.000Z",
    rootPwnedAt: "2026-08-15T15:10:00.000Z"
  },
  {
    id: "htb-forest",
    status: "completed",
    timeSpentSeconds: 3600,
    timeToUserSeconds: 1500,
    timeToRootSeconds: 3600,
    userFlag: "HTB{forest_user_flag_captured}",
    rootFlag: "HTB{forest_root_flag_captured}",
    userPwnedAt: "2026-08-15T14:20:00.000Z",
    rootPwnedAt: "2026-08-15T15:10:00.000Z"
  }
];
