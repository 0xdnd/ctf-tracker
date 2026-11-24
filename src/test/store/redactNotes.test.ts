import { describe, it, expect, beforeEach } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import type { Machine } from '../../types';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';

// Sample strings taken from the masker's own tests.
const MD5 = '5f4dcc3b5aa765d61d8327deb882cf99';
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const GH = 'ghp_' + 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8';
const AWS = 'AKIAIOSFODNN7EXAMPLE';
const LM_NT = 'aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0';
const KEY = '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAA\n-----END OPENSSH PRIVATE KEY-----';
const SECRETS = [MD5, JWT, GH, AWS, LM_NT, 'b3BlbnNzaC1rZXktdjEAAAAA', 'hunter2', 'Summer2020!'];

const note = (id: string, md: string): CptsNoteEntry =>
  ({
    id,
    title: `Note ${id}`,
    titleEn: `Note ${id}`,
    category: 'web',
    rawCategory: 'web',
    subCategory: '',
    tags: [],
    difficulty: 'easy',
    summary: `summary password=hunter2 ${MD5}`,
    commands: [`smbclient --password=Summer2020! //10.0.0.1/share`],
    relPath: `${id}.md`,
    rawMarkdown: md,
  }) as CptsNoteEntry;

const machine = (): Machine =>
  ({
    id: 'custom-n1',
    name: 'Notes Box',
    ip: '10.10.10.9',
    os: 'Linux',
    platform: 'Custom',
    difficulty: 'Easy',
    status: 'recon',
    tags: [],
    certifications: [],
    timeSpentSeconds: 0,
    isCustom: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    findings: [
      {
        id: 'f1',
        title: `Leaked key ${GH}`,
        severity: 'high',
        repro: `1. curl -H "Authorization: Bearer abc123.def456-ghi789"\n2. password=hunter2\n${AWS}`,
        remediation: `Rotate ${JWT}`,
        affectedService: 'ssh',
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    checklist: {
      openPorts: [22],
      activeItemId: null,
      itemsState: { a: { status: 'done', notes: `cracked ${MD5} and ${LM_NT}` } },
    },
    portTriage: { '22': { status: 'checking', note: 'token=abcdef123456' } },
  }) as unknown as Machine;

describe('exportBackup with hide-sensitive-data masks note text everywhere', () => {
  beforeEach(() => {
    useCtfStore.setState({
      machines: [machine()],
      customNotes: [note('c1', `# Mine\npassword=hunter2\n${KEY}\nhash ${MD5} and ${GH}\nkeep me readable`)],
      userNotes: [note('u1', `imported ${JWT}\n${AWS}\n${LM_NT}\nplain prose stays`)],
    });
  });

  it('leaves no sample secret anywhere in the exported JSON', () => {
    const json = useCtfStore.getState().exportBackup({ redactSecrets: true });
    for (const s of SECRETS) expect(json).not.toContain(s);
    expect(json).not.toContain('abc123.def456-ghi789');
    expect(json).not.toContain('abcdef123456');
  });

  it('keeps the notes themselves and their ordinary text', () => {
    const data = JSON.parse(useCtfStore.getState().exportBackup({ redactSecrets: true })) as {
      customNotes: CptsNoteEntry[];
      userNotes: CptsNoteEntry[];
    };
    expect(data.customNotes).toHaveLength(1);
    expect(data.userNotes).toHaveLength(1);
    expect(data.customNotes[0].rawMarkdown).toContain('keep me readable');
    expect(data.customNotes[0].rawMarkdown).toContain('password=[REDACTED]');
    expect(data.userNotes[0].rawMarkdown).toContain('plain prose stays');
    expect(data.userNotes[0].title).toBe('Note u1');
  });

  it('does not alter the live store', () => {
    useCtfStore.getState().exportBackup({ redactSecrets: true });
    expect(useCtfStore.getState().customNotes[0].rawMarkdown).toContain(MD5);
  });

  it('exports notes unchanged when the option is off', () => {
    const json = useCtfStore.getState().exportBackup({ redactSecrets: false });
    expect(json).toContain(MD5);
    expect(json).toContain('hunter2');
  });
});
