import { describe, it, expect, beforeEach } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import { exportWorkspaceToJson, validateWorkspacePayload } from '../../utils/workspaceStorage';
import type { Machine, ActivitySession, Difficulty, OperatingSystem, Platform } from '../../types';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';

const initialSnapshot = useCtfStore.getState();

describe('Layer 8: 3-Year Operational Scale & Historical Data Simulation (500 Machines & Note Graph)', () => {
  beforeEach(() => {
    useCtfStore.setState(initialSnapshot, true);
    localStorage.clear();
  });

  it('SCALE-1: High-Volume Ingestion (500 machines, 500 notes, 2,500 wikilinks, 10,000 sessions)', () => {
    const platforms: Platform[] = ['HTB', 'THM', 'Custom'];
    const oss: OperatingSystem[] = ['Linux', 'Windows', 'Android', 'BSD', 'Other'];
    const diffs: Difficulty[] = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane'];

    // 1. Generate 500 Machines
    const massiveMachines: Machine[] = [];
    for (let i = 0; i < 500; i++) {
      massiveMachines.push({
        id: `scale-machine-${i}`,
        name: `ScaleBox-${i}`,
        ip: `10.10.${Math.floor(i / 256)}.${i % 256}`,
        os: oss[i % oss.length],
        platform: platforms[i % platforms.length],
        difficulty: diffs[i % diffs.length],
        status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'foothold' : 'backlog',
        tags: [`tag-${i % 20}`, `cve-202${i % 6}`, 'privesc', 'scale'],
        certifications: ['CPTS', 'OSCP'],
        timeSpentSeconds: (i + 1) * 360,
        userFlag: i % 2 === 0 ? `flag{user_${i}}` : undefined,
        rootFlag: i % 3 === 0 ? `flag{root_${i}}` : undefined,
        quickNotes: `Quick recon notes for target ${i}. Discovered open ports and web services.`,
        writeupMarkdown: `## Writeup for ScaleBox-${i}\nTarget executed in scale test environment.\n` + 'Detailed findings and steps.'.repeat(10),
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // 2. Generate 500 Field Notes with 2,500 Cross-Referenced Wikilinks
    const massiveNotes: CptsNoteEntry[] = [];
    const massiveWikilinkMap: Record<string, string> = {};

    for (let n = 0; n < 500; n++) {
      const noteId = `scale-note-${n}`;
      const noteTitle = `Field Technique ${n}`;
      massiveWikilinkMap[noteTitle.toLowerCase()] = noteId;

      // Cross-link to 5 other notes
      const linkedNotes = [
        `[[Field Technique ${(n + 1) % 500}]]`,
        `[[Field Technique ${(n + 2) % 500}]]`,
        `[[Field Technique ${(n + 3) % 500}]]`,
        `[[Field Technique ${(n + 4) % 500}]]`,
        `[[Field Technique ${(n + 5) % 500}]]`,
      ];

      const category = n % 4 === 0 ? 'ad' : n % 4 === 1 ? 'web' : n % 4 === 2 ? 'privesc' : 'pwn';
      const noteContent = `# ${noteTitle}\nDetailed technical reference. Cross-references: ${linkedNotes.join(' ')}\n` + 'Code snippets and exploitation commands.'.repeat(8);

      massiveNotes.push({
        id: noteId,
        title: noteTitle,
        titleEn: noteTitle,
        category,
        rawCategory: category,
        subCategory: 'general',
        difficulty: 'Medium',
        summary: noteContent,
        rawMarkdown: noteContent,
        commands: [],
        relPath: `${category}/${noteId}.md`,
        tags: ['scale', `category-${n % 4}`],
        dateModified: new Date(Date.now() - n * 3600000).toISOString(),
      });
    }

    // 3. Generate 10,000 Historical Activity Sessions (3-year log)
    const massiveSessions: ActivitySession[] = [];
    const nowTs = Date.now();
    for (let s = 0; s < 10000; s++) {
      const start = new Date(nowTs - s * 900000).toISOString();
      massiveSessions.push({
        id: `session-${s}`,
        machineId: `scale-machine-${s % 500}`,
        machineName: `ScaleBox-${s % 500}`,
        date: start.split('T')[0],
        durationSeconds: 600,
        type: 'session',
      });
    }

    // Load into Zustand store
    useCtfStore.setState({
      machines: massiveMachines,
      userNotes: massiveNotes,
      userWikilinkMap: massiveWikilinkMap,
      activitySessions: massiveSessions,
    });

    const loadedState = useCtfStore.getState();
    expect(loadedState.machines.length).toBe(500);
    expect(loadedState.userNotes.length).toBe(500);
    expect(Object.keys(loadedState.userWikilinkMap).length).toBe(500);
    expect(loadedState.activitySessions.length).toBe(10000);

    // 4. Benchmark: Full-text Search & Filter Latency Across 500 Targets (<16ms 60FPS target)
    const searchQueries = ['ScaleBox-49', 'cve-2023', 'Windows', 'Insane'];
    for (const q of searchQueries) {
      const start = performance.now();
      const filtered = loadedState.machines.filter((m) =>
        m.name.toLowerCase().includes(q.toLowerCase()) ||
        m.os.toLowerCase().includes(q.toLowerCase()) ||
        m.difficulty.toLowerCase().includes(q.toLowerCase()) ||
        m.tags.some((t) => t.toLowerCase().includes(q.toLowerCase()))
      );
      const latency = performance.now() - start;
      expect(latency).toBeLessThan(16); // Must execute within 1 frame (<16ms)
      expect(filtered.length).toBeGreaterThan(0);
    }

    // 5. Benchmark: Sorting Latency Across 500 Targets (<50ms target)
    const sortStart = performance.now();
    const sorted = [...loadedState.machines].sort((a, b) => b.timeSpentSeconds - a.timeSpentSeconds);
    const sortLatency = performance.now() - sortStart;
    expect(sortLatency).toBeLessThan(50);
    expect(sorted[0].timeSpentSeconds).toBeGreaterThan(sorted[sorted.length - 1].timeSpentSeconds);

    // 6. Benchmark: Full Workspace Serialization (<500ms and well within V8 string limit)
    const exportStart = performance.now();
    const serializedJson = exportWorkspaceToJson({
      machines: loadedState.machines,
      globalVars: loadedState.globalVars,
      cheatsheets: loadedState.cheatsheets,
      activitySessions: loadedState.activitySessions,
      userNotes: loadedState.userNotes,
      userWikilinkMap: loadedState.userWikilinkMap,
    });
    const exportLatency = performance.now() - exportStart;

    expect(exportLatency).toBeLessThan(500);
    expect(typeof serializedJson).toBe('string');
    expect(serializedJson.length).toBeGreaterThan(100000); // Verify rich payload serialized

    // 7. Validate Payload Schema Integrity Roundtrip
    const parsed = JSON.parse(serializedJson);
    const validationResult = validateWorkspacePayload(parsed);
    expect(validationResult.success).toBe(true);
    expect(validationResult.restoredCount).toBe(500);
  });
});
