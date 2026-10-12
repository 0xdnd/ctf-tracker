import { describe, it, expect } from 'vitest';
import { INITIAL_MACHINES } from '../../data/machinesCatalog';
import { ACTIVE_MACHINES, appendActiveMachines } from '../../data/activeMachines';

type Os = 'Linux' | 'Windows';
type Diff = 'Easy' | 'Medium' | 'Hard' | 'Insane';

// Retired HTB machines added as lean metadata-only rows (name, OS, difficulty, room link),
// newest-retired first. OS and difficulty come from 0xdf's per-machine cards.
const RETIRED_METADATA_ONLY: Array<[string, Os, Diff]> = [
  ['DevHub', 'Linux', 'Medium'],
  ['Reactor', 'Linux', 'Easy'],
  ['SmartHire', 'Linux', 'Medium'],
  ['Silentium', 'Linux', 'Easy'],
  ['Hercules', 'Windows', 'Insane'],
  ['Pirate', 'Windows', 'Hard'],
  ['Cobblestone', 'Linux', 'Insane'],
  ['Helix', 'Linux', 'Medium'],
  ['Fries', 'Windows', 'Hard'],
  ['Logging', 'Windows', 'Medium'],
  ['CCTV', 'Linux', 'Easy'],
  ['DevArea', 'Linux', 'Medium'],
  ['WingData', 'Linux', 'Easy'],
  ['Ghostlink', 'Windows', 'Hard'],
  ['Nexus', 'Linux', 'Easy'],
  ['Orion', 'Linux', 'Easy'],
  ['NanoCorp', 'Windows', 'Hard'],
  ['VariaType', 'Linux', 'Medium'],
  ['Facts', 'Linux', 'Easy'],
  ['Abducted', 'Linux', 'Medium'],
  ['Interpreter', 'Linux', 'Medium'],
  ['MonitorsFour', 'Windows', 'Easy'],
  ['Pterodactyl', 'Linux', 'Medium'],
  ['Overwatch', 'Windows', 'Medium'],
  ['Sorcery', 'Linux', 'Insane'],
  ['AirTouch', 'Linux', 'Medium'],
  ['Eighteen', 'Windows', 'Easy'],
  ['DarkZero', 'Windows', 'Hard'],
  ['Browsed', 'Linux', 'Medium'],
  ['Snapped', 'Linux', 'Hard'],
  ['Conversor', 'Linux', 'Easy'],
  ['Gavel', 'Linux', 'Medium'],
  ['Principal', 'Linux', 'Medium'],
  ['Expressway', 'Linux', 'Easy'],
  ['Guardian', 'Linux', 'Hard'],
  ['Giveback', 'Linux', 'Medium'],
  ['Barrier', 'Linux', 'Medium'],
  ['Signed', 'Windows', 'Medium'],
  ['CodePartTwo', 'Linux', 'Easy'],
  ['Imagery', 'Linux', 'Medium'],
  ['HackNet', 'Linux', 'Medium'],
  ['Previous', 'Linux', 'Medium'],
  ['WhiteRabbit', 'Linux', 'Insane'],
  ['Editor', 'Linux', 'Easy'],
  ['Era', 'Linux', 'Medium'],
  ['Mirage', 'Windows', 'Hard'],
  ['Outbound', 'Linux', 'Easy'],
  ['RustyKey', 'Windows', 'Hard'],
  ['JobTwo', 'Windows', 'Hard'],
  ['Voleur', 'Windows', 'Medium'],
  ['Dump', 'Linux', 'Hard'],
  ['Store', 'Linux', 'Hard'],
  ['Artificial', 'Linux', 'Easy'],
  ['Bruno', 'Windows', 'Medium'],
  ['DarkCorp', 'Windows', 'Insane'],
  ['Slonik', 'Linux', 'Medium'],
  ['TombWatcher', 'Windows', 'Medium'],
  ['Breach', 'Windows', 'Medium'],
  ['Bamboo', 'Linux', 'Medium'],
  ['Certificate', 'Windows', 'Hard'],
  ['Watcher', 'Linux', 'Medium'],
  ['Job', 'Windows', 'Medium'],
  ['Puppy', 'Windows', 'Medium'],
  ['BabyTwo', 'Windows', 'Medium'],
  ['Fluffy', 'Windows', 'Easy'],
  ['Baby', 'Windows', 'Easy'],
  ['Forgotten', 'Linux', 'Easy'],
  ['Planning', 'Linux', 'Easy'],
  ['Delegate', 'Windows', 'Medium'],
  ['Environment', 'Linux', 'Medium'],
  ['Soulmate', 'Linux', 'Easy'],
  ['Media', 'Windows', 'Medium'],
  ['Race', 'Linux', 'Hard'],
  ['Eureka', 'Linux', 'Hard'],
  ['Sendai', 'Windows', 'Medium'],
  ['Reaper', 'Windows', 'Insane'],
  ['TheFrizz', 'Windows', 'Medium'],
  ['Lock', 'Windows', 'Easy'],
  ['Phantom', 'Windows', 'Medium'],
  ['Nocturnal', 'Linux', 'Easy'],
  ['Zero', 'Linux', 'Insane'],
  ['University', 'Windows', 'Insane'],
  ['Rainbow', 'Windows', 'Medium'],
  ['Build', 'Linux', 'Medium'],
  ['Code', 'Linux', 'Easy'],
  ['LustrousTwo', 'Windows', 'Hard'],
  ['Manage', 'Linux', 'Easy'],
  ['Cypher', 'Linux', 'Medium'],
  ['Ten', 'Linux', 'Hard'],
  ['RetroTwo', 'Windows', 'Easy'],
  ['Scepter', 'Windows', 'Hard'],
  ['Redelegate', 'Windows', 'Hard'],
  ['Reset', 'Linux', 'Easy'],
  ['Dog', 'Linux', 'Easy'],
  ['VulnEscape', 'Windows', 'Easy'],
  ['Cat', 'Linux', 'Medium'],
  ['VulnCicada', 'Windows', 'Medium'],
  ['Data', 'Linux', 'Easy'],
  ['Haze', 'Windows', 'Hard'],
  ['Retro', 'Windows', 'Easy'],
  ['Titanic', 'Linux', 'Easy'],
  ['Shibuya', 'Windows', 'Hard'],
  ['Down', 'Linux', 'Easy'],
  ['Infiltrator', 'Windows', 'Insane'],
  ['Backfire', 'Linux', 'Medium'],
  ['Checker', 'Linux', 'Hard'],
  ['Heal', 'Linux', 'Medium'],
  ['BigBang', 'Linux', 'Hard'],
  ['Vintage', 'Windows', 'Hard'],
  ['LinkVortex', 'Linux', 'Easy'],
  ['Ghost', 'Windows', 'Insane'],
  ['BlockBlock', 'Linux', 'Hard'],
  ['Certified', 'Windows', 'Medium'],
  ['Yummy', 'Linux', 'Hard'],
  ['Cicada', 'Windows', 'Easy'],
  ['MagicGardens', 'Linux', 'Insane'],
  ['Trickster', 'Linux', 'Medium'],
  ['Caption', 'Linux', 'Hard'],
  ['Strutted', 'Linux', 'Medium'],
  ['MonitorsThree', 'Linux', 'Medium'],
  ['Compiled', 'Windows', 'Medium'],
  ['GreenHorn', 'Linux', 'Easy'],
  ['Unrested', 'Linux', 'Medium'],
  ['Lantern', 'Linux', 'Hard'],
  ['Resource', 'Linux', 'Hard'],
  ['Axlle', 'Windows', 'Hard'],
  ['Blazorized', 'Windows', 'Hard'],
  ['PermX', 'Linux', 'Easy'],
  ['Mist', 'Windows', 'Insane'],
  ['Editorial', 'Linux', 'Easy'],
  ['Freelancer', 'Windows', 'Hard'],
  ['EvilCUPS', 'Linux', 'Medium'],
  ['BoardLight', 'Linux', 'Easy'],
  ['SolarLab', 'Windows', 'Medium'],
  ['FormulaX', 'Linux', 'Hard'],
  ['IClean', 'Linux', 'Medium'],
  ['WifineticTwo', 'Linux', 'Medium'],
  ['Headless', 'Linux', 'Easy'],
  ['Jab', 'Windows', 'Medium'],
  ['Office', 'Windows', 'Hard'],
  ['Builder', 'Linux', 'Medium'],
];

const SPOILER_FIELDS = [
  'hint',
  'officialSynopsis',
  'officialPdf',
  'officialWalkthrough',
  'writeupUrl',
  'writeupMarkdown',
  'skillsLearned',
  'userFlag',
  'rootFlag',
  'openPorts',
  'services',
] as const;

/** "Active (2018 Retired)" -> "active": the name without any trailing parenthetical, letters and digits only. */
const baseName = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, '').toLowerCase().replace(/[^a-z0-9]/g, '');

describe('metadata-only retired HTB rows', () => {
  it('covers 141 machines with no duplicates in the list', () => {
    expect(RETIRED_METADATA_ONLY).toHaveLength(141);
    expect(new Set(RETIRED_METADATA_ONLY.map(([n]) => n.toLowerCase())).size).toBe(141);
  });

  it.each(RETIRED_METADATA_ONLY)('%s is a single lean, non-active HTB row', (name, os, difficulty) => {
    const rows = INITIAL_MACHINES.filter((m) => m.platform === 'HTB' && m.name.toLowerCase() === name.toLowerCase());
    expect(rows).toHaveLength(1);
    const m = rows[0];
    expect(m.id).toBe(`htb-${name.toLowerCase()}`);
    expect(m.os).toBe(os);
    expect(m.difficulty).toBe(difficulty);
    expect(m.status).toBe('backlog');
    expect(m.isActive).toBe(false);
    expect(m.tags).toEqual([]);
    expect(m.certifications).toEqual([]);
    expect(m.roomUrl).toBe(`https://app.hackthebox.com/machines/${name}`);
    for (const f of SPOILER_FIELDS) expect(m[f], `${name}.${f}`).toBeUndefined();
  });

  it('every catalog id is unique, including after active rows are appended', () => {
    const ids = appendActiveMachines(INITIAL_MACHINES).map((m) => m.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('no two HTB rows share a base name (trailing parenthetical stripped)', () => {
    const names = INITIAL_MACHINES.filter((m) => m.platform === 'HTB').map((m) => baseName(m.name));
    expect(names.filter((n, i) => names.indexOf(n) !== i)).toEqual([]);
  });

  it('none of them is on the active list, so merging keeps them retired', () => {
    const active = new Set(ACTIVE_MACHINES.machines.map((a) => a.name.toLowerCase()));
    const merged = appendActiveMachines(INITIAL_MACHINES);
    for (const [name] of RETIRED_METADATA_ONLY) {
      expect(active.has(name.toLowerCase()), name).toBe(false);
      expect(merged.filter((m) => m.platform === 'HTB' && m.name === name).map((m) => m.isActive)).toEqual([false]);
    }
  });
});
