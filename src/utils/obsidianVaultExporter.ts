/**
 * obsidianVaultExporter.ts
 * Browser-native generator that compiles the entire ZeroBox database
 * into a complete, standalone, ready-to-open Obsidian Vault (.zip).
 */

import JSZip from 'jszip';
import { Machine, CheatsheetCommand } from '../types';
import { MASTER_METHODOLOGY_FRAMEWORK } from '../data/methodologyFramework';

export async function generateObsidianVaultZip(
  machines: Machine[],
  cheatsheets: CheatsheetCommand[]
): Promise<Blob> {
  const zip = new JSZip();

  // 1. Obsidian Vault Configuration (.obsidian/app.json)
  const obsidianConfig = {
    useMarkdownLinks: false,
    showLineNumber: true,
    livePreview: true,
    strictLineBreaks: false,
  };
  zip.file('.obsidian/app.json', JSON.stringify(obsidianConfig, null, 2));

  // 2. 00 - ZEROBOX INDEX & DASHBOARD.md
  const completedSolves = machines.filter((m) => m.status === 'completed');
  const htbSolves = completedSolves.filter((m) => m.platform === 'HTB');
  const thmSolves = completedSolves.filter((m) => m.platform === 'THM');
  const inProgress = machines.filter((m) => m.status === 'recon' || m.status === 'foothold' || m.status === 'root');

  const categories = Array.from(new Set(cheatsheets.map((c) => c.category)));

  let indexContent = `---
title: "ZeroBox Tactical CTF Vault // Operator Dashboard"
callsign: "0xdnd"
operator: "Daniel Dayan"
solves: ${completedSolves.length}
htb_solves: ${htbSolves.length}
thm_solves: ${thmSolves.length}
date: "${new Date().toISOString().split('T')[0]}"
tags:
  - ctf/index
  - zerobox/vault
  - offensive-security
---

# ⚡ ZEROBOX // TACTICAL CTF FIELD VAULT
> **Operator:** Daniel Dayan (\`0xdnd\`)  
> **Operational Track Record:** **${completedSolves.length} Pwns** (${htbSolves.length} Hack The Box + ${thmSolves.length} TryHackMe)  
> **Export Date:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

---

## 📊 Operational Telemetry
- **Total Tracked Targets:** ${machines.length}
- **Completed Solves:** ${completedSolves.length} (100% Frozen History)
- **Active Operations:** ${inProgress.length}
- **Master Methodology Phases:** ${MASTER_METHODOLOGY_FRAMEWORK.length}
- **Curated Cheatsheets:** ${cheatsheets.length}

---

## 🏆 Completed Solves (${completedSolves.length})

| Target | Platform | OS | Difficulty | Flags Captured | Solve Date | Writeup |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

  completedSolves.forEach((m) => {
    const fileBaseName = `${m.platform}-${m.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const flagsCaptured = [m.userFlag ? 'USER' : '', m.rootFlag ? 'ROOT' : ''].filter(Boolean).join(' + ') || 'PWNED';
    const solveDate = m.rootPwnedAt ? m.rootPwnedAt.split('T')[0] : m.updatedAt ? m.updatedAt.split('T')[0] : 'Historical';
    indexContent += `| [[${fileBaseName}|${m.name}]] | ${m.platform} | ${m.os} | ${m.difficulty} | \`${flagsCaptured}\` | ${solveDate} | ${m.writeupUrl ? `[Notes](${m.writeupUrl})` : 'Archived'} |
`;
  });

  indexContent += `
---

## ⚔️ Active Engagements & In-Progress Targets (${inProgress.length})

`;
  indexContent += `| Target | Platform | OS | Difficulty | Status | IP |
`;
  indexContent += `| :--- | :--- | :--- | :--- | :--- | :--- |
`;

  inProgress.forEach((m) => {
    const fileBaseName = `${m.platform}-${m.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    indexContent += `| [[${fileBaseName}|${m.name}]] | ${m.platform} | ${m.os} | ${m.difficulty} | \`${m.status.toUpperCase()}\` | \`${m.ip}\` |
`;
  });

  indexContent += `
---

## 📚 Master Methodology Framework (8 Phases)
`;
  MASTER_METHODOLOGY_FRAMEWORK.forEach((phase) => {
    const cleanTitle = phase.title.replace(/^Phase\s*\d+:\s*/i, '').replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
    const phaseFileName = `Phase ${String(phase.phaseNumber).padStart(2, '0')} - ${cleanTitle}`;
    indexContent += `- [[${phaseFileName}|${phase.title}]] — *${phase.subtitle}*
`;
  });

  indexContent += `
---

## ⚡ Tactical Command Cheatsheets
`;
  indexContent += `- [[Cheatsheet Index|Tactical Cheatsheet Master Index]]
`;
  categories.forEach((cat) => {
    const catSafe = cat.replace(/[^a-zA-Z0-9_-]/g, '_');
    indexContent += `  - [[${catSafe}|${cat} Cheatsheet]]
`;
  });

  zip.file('00 - ZEROBOX DASHBOARD.md', indexContent);

  // 3. Targets Folder: Target Markdown Files
  const targetsFolder = zip.folder('Targets');

  machines.forEach((m) => {
    const tags = Array.from(
      new Set([
        'ctf/target',
        `platform/${m.platform.toLowerCase()}`,
        `os/${m.os.toLowerCase().replace(/\s+/g, '-')}`,
        `difficulty/${m.difficulty.toLowerCase().replace(/\s+/g, '-')}`,
        `status/${m.status}`,
        ...(m.tags || []).map((t) => `tag/${t.toLowerCase().replace(/[^a-z0-9]/g, '-')}`),
      ])
    );

    let doc = `---
title: "${m.name}"
aliases:
  - "${m.name}"
platform: "${m.platform}"
os: "${m.os}"
difficulty: "${m.difficulty}"
status: "${m.status}"
ip: "${m.ip}"
user_flag: "${m.userFlag || ''}"
root_flag: "${m.rootFlag || ''}"
time_spent_minutes: ${Math.round((m.timeSpentSeconds || 0) / 60)}
tags:
${tags.map((t) => `  - ${t}`).join('\n')}
---

# ${m.name} (${m.platform} - ${m.os})
> **IP:** \`${m.ip}\` | **Difficulty:** ${m.difficulty} | **Status:** \`${m.status.toUpperCase()}\`  
${m.roomUrl ? `> **Room URL:** [${m.roomUrl}](${m.roomUrl})  \n` : ''}${m.writeupUrl ? `> **Writeup URL:** [${m.writeupUrl}](${m.writeupUrl})  \n` : ''}

---

## 🚩 Flag Vault
- **User Flag:** \`${m.userFlag || 'UNCAPTURED'}\`
- **Root / SYSTEM Flag:** \`${m.rootFlag || 'UNCAPTURED'}\`
${m.userPwnedAt ? `- **User Foothold Achieved:** \`${m.userPwnedAt}\`\n` : ''}${m.rootPwnedAt ? `- **Root Access Captured:** \`${m.rootPwnedAt}\`\n` : ''}
`;

    // Discovered Open Ports
    if (m.openPorts && m.openPorts.length > 0) {
      doc += `\n## 🔌 Discovered Open Ports\n`;
      doc += `${m.openPorts.map((p) => `- \`Port ${p}\``).join('\n')}\n`;
    }

    // Official Synopsis
    if (m.officialSynopsis) {
      doc += `\n---\n\n## 🛡️ Official Threat Synopsis\n${m.officialSynopsis}\n`;
    }

    // Core Skills Learned
    if (m.skillsLearned && m.skillsLearned.length > 0) {
      doc += `\n## 🧠 Core Skills & Attack Vectors Learned\n`;
      doc += `${m.skillsLearned.map((s) => `- **${s}**`).join('\n')}\n`;
    }

    // Official Walkthrough
    if (m.officialWalkthrough) {
      doc += `\n---\n\n## 📖 Official Exploitation Walkthrough\n\n${m.officialWalkthrough}\n`;
    }

    // Quick Field Notes
    if (m.quickNotes) {
      doc += `\n---\n\n## 📝 Operator Field Notes\n\n${m.quickNotes}\n`;
    }

    // Writeup Markdown
    if (m.writeupMarkdown) {
      doc += `\n---\n\n## 📑 Complete Penetration Testing Report & Writeup\n\n${m.writeupMarkdown}\n`;
    }

    // Checklist State
    if (m.checklist?.itemsState) {
      const items = Object.entries(m.checklist.itemsState);
      if (items.length > 0) {
        doc += `\n---\n\n## ✅ Tactical Methodology Checklist Progress\n\n`;
        items.forEach(([itemId, state]) => {
          const isDone = state.status === 'done';
          doc += `- [${isDone ? 'x' : ' '}] **${itemId}** (${state.status.toUpperCase()})${state.notes ? `\n  - *Note:* ${state.notes}` : ''}\n`;
        });
      }
    }

    const filename = `${m.platform}-${m.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    targetsFolder?.file(filename, doc);
  });

  // 4. Methodology Folder
  const methFolder = zip.folder('Methodology');
  MASTER_METHODOLOGY_FRAMEWORK.forEach((phase) => {
    let pDoc = `---
phase: ${phase.phaseNumber}
title: "${phase.title}"
aliases:
  - "${phase.title}"
subtitle: "${phase.subtitle}"
tags:
  - ctf/methodology
  - cpts/phase-${phase.phaseNumber}
---

# ${phase.title}
### ${phase.subtitle}

> ${phase.description}

---

`;

    phase.subcategories.forEach((sub) => {
      pDoc += `## ${sub.title} [Branch: \`${sub.serviceBranch || 'Universal'}\`]\n\n`;
      sub.items.forEach((item) => {
        pDoc += `### ${item.title}\n`;
        if (item.description) pDoc += `${item.description}\n\n`;
        if (item.commandSnippet) {
          pDoc += `\`\`\`bash\n${item.commandSnippet}\n\`\`\`\n\n`;
        }
      });
    });

    const cleanTitle = phase.title.replace(/^Phase\s*\d+:\s*/i, '').replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
    const phaseFileName = `Phase ${String(phase.phaseNumber).padStart(2, '0')} - ${cleanTitle}.md`;
    methFolder?.file(phaseFileName, pDoc);
  });

  // 5. Cheatsheets Folder
  const cheatFolder = zip.folder('Cheatsheets');

  let indexCheatDoc = `---
title: "Cheatsheet Master Index"
aliases:
  - "Cheatsheets"
  - "Tactical Cheatsheet Master Index"
tags:
  - ctf/cheatsheet
---

# ⚡ Tactical Cheatsheet & Command Matrix

| Category | Commands Count | Note Link |
| :--- | :--- | :--- |
`;

  categories.forEach((cat) => {
    const catSafe = cat.replace(/[^a-zA-Z0-9_-]/g, '_');
    const catItems = cheatsheets.filter((c) => c.category === cat);
    indexCheatDoc += `| **${cat}** | ${catItems.length} commands | [[${catSafe}|${cat}]] |
`;

    let cDoc = `---
category: "${cat}"
aliases:
  - "${cat}"
  - "${cat} Cheatsheet"
tags:
  - ctf/cheatsheet
---

# ${cat} Cheatsheet & Command Matrix

| Command / Tool | Description | Syntax |
| :--- | :--- | :--- |
`;
    catItems.forEach((c) => {
      cDoc += `| **${c.title}** | ${c.description} | \`${c.commandTemplate.replace(/\|/g, '\\|')}\` |
`;
    });

    const catFileName = `${catSafe}.md`;
    cheatFolder?.file(catFileName, cDoc);
  });

  cheatFolder?.file('Cheatsheet Index.md', indexCheatDoc);

  // Generate ZIP Blob
  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}
