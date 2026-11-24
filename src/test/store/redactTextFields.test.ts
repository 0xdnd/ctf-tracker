import { describe, it, expect, beforeEach } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import type { Machine } from '../../types';

const HASH = '5f4dcc3b5aa765d61d8327deb882cf99';

const box = (extra: Partial<Machine>): Machine =>
  ({
    id: 'custom-r1',
    name: 'Redact Me',
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
    ...extra,
  }) as Machine;

const exported = (redactSecrets: boolean) => {
  const data = JSON.parse(useCtfStore.getState().exportBackup({ redactSecrets })) as { machines: Machine[] };
  return data.machines.find((m) => m.id === 'custom-r1') as Machine;
};

describe('exportBackup with hide-sensitive-data', () => {
  beforeEach(() => {
    useCtfStore.setState({
      machines: [
        box({
          quickNotes: `admin hash ${HASH}\npassword=hunter2\nport 445 open`,
          writeupMarkdown: `# Writeup\n\nCracked ${HASH} offline.\nUse Bearer abcdef1234567890 for the API.\nPlain step: run nmap.`,
          rawScanOutput: 'PORT 22/tcp open ssh\nkey: token=abcdef123456\n80/tcp open http',
        }),
      ],
    });
  });

  it('masks only the secret-looking parts of quickNotes, writeupMarkdown and rawScanOutput', () => {
    const m = exported(true);
    expect(m.quickNotes).toBe('admin hash [REDACTED]\npassword=[REDACTED]\nport 445 open');
    expect(m.writeupMarkdown).toBe(
      '# Writeup\n\nCracked [REDACTED] offline.\nUse Bearer [REDACTED] for the API.\nPlain step: run nmap.'
    );
    expect(m.rawScanOutput).toBe('PORT 22/tcp open ssh\nkey: token=[REDACTED]\n80/tcp open http');
  });

  it('leaves the text fields untouched when the option is off', () => {
    const m = exported(false);
    expect(m.quickNotes).toContain(HASH);
    expect(m.quickNotes).toContain('password=hunter2');
    expect(m.writeupMarkdown).toContain('Bearer abcdef1234567890');
  });

  it('does not add the fields to a machine that has none', () => {
    useCtfStore.setState({ machines: [box({})] });
    const m = exported(true);
    expect('quickNotes' in m).toBe(false);
    expect('writeupMarkdown' in m).toBe(false);
    expect('rawScanOutput' in m).toBe(false);
  });
});
