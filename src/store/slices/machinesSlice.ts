import type { StateCreator } from 'zustand';
import {
  Machine,
  PipelineStatus,
  MachineTombstone,
  PortTriageEntry,
  LabFinding,
  NewLabFindingInput,
  LabFindingPatch,
  SolveIndependence,
} from '../../types';
import { isDueForReview } from '../../utils/spacedRepetition';
import { addMachineTombstone, normalizeMachineTombstones } from '../../utils/machineTombstones';
import { STARTER_MACHINES } from '../../data/starterMachines';
import { loadMachinesCatalog } from '../../data/loadMachinesCatalog';
import { deleteMachineDeepData } from '../../utils/indexedDbDeepStorage';
import { isSchemaWriteGated } from '../../utils/schemaWriteGate';
import { whenPreMigrationBackupSettled } from '../preMigrationBackup';
import { toLocalDateKey } from '../../utils/analyticsHeatmap';
import { DEMO_SOLVED_ROSTER } from '../../data/demoSolvedRoster';
import { isKnownActiveByName, mergeMachinesWithCatalog } from '../ctfCatalog';
import {
  foldActiveTimer,
  deletedMachineSessionReset,
  sanitizeActiveMachine,
  newLabId,
  appendTimeline,
  logProgressTimeline,
  patchLabMachine,
  MAX_FINDINGS,
  PORT_TRIAGE_STATUSES,
  SOLVE_INDEPENDENCE_VALUES,
  normalizeVhosts,
  sameList,
  cleanFindingFields,
  scheduleReview,
} from '../ctfMachineHelpers';
import { saveCustomMachinesToStorage, pruneMisstampedCustomMachines } from '../ctfStorage';
import { flushProfileSave } from '../ctfStore';
import { entersRootStage } from '../../utils/pipeline';
import { CtfStoreState, CtfBootData } from '../ctfStoreTypes';
import { broadcastCrossTabMessage } from '../ctfVaultNotes';

/** Workspace store slice: machines (catalog merge, status, flags, lab study data, checklist) and solve progress. */

export interface MachinesSliceState {
  machines: Machine[];
  // Machine Actions
  updateMachineStatus: (id: string, status: PipelineStatus) => void;
  batchUpdateMachineStatus: (updates: { machineId: string; status: PipelineStatus }[]) => void;
  updateMachine: (id: string, updates: Partial<Machine>) => void;
  addCustomMachine: (machine: Omit<Machine, 'id' | 'createdAt' | 'updatedAt'>) => void;
  addCustomMachines: (machines: Omit<Machine, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  deleteMachine: (id: string) => void;
  toggleUserFlag: (id: string, flagValue?: string) => void;
  toggleRootFlag: (id: string, flagValue?: string) => void;
  // Per-lab study data (no-ops on active HTB machines; every change stamps the machine's updatedAt)
  setMachineDomain: (id: string, domain: string) => void;
  /** Trims, lowercases, de-duplicates and drops empty entries. */
  setMachineVhosts: (id: string, vhosts: string[]) => void;
  addMachineVhost: (id: string, vhost: string) => void;
  removeMachineVhost: (id: string, vhost: string) => void;
  /** A new entry starts as { status: 'untested' } before the patch is applied. */
  setPortTriage: (id: string, port: number | string, patch: Partial<PortTriageEntry>) => void;
  clearPortTriage: (id: string, port: number | string) => void;
  /** Returns the new finding id, or '' when the machine is unknown or active. Logs a 'finding_added' event. */
  addFinding: (id: string, input: NewLabFindingInput) => string;
  updateFinding: (id: string, findingId: string, patch: LabFindingPatch) => void;
  removeFinding: (id: string, findingId: string) => void;
  /** Records how independently the lab was solved and (re)schedules its next review. */
  setSolveIndependence: (id: string, value: SolveIndependence) => void;
  /** Completes a review: reviewCount + 1 and the next (longer) interval. */
  markReviewed: (id: string, independence?: SolveIndependence) => void;
  /** Re-runs mergeMachinesWithCatalog over the current machines (no-op while the schema write gate is engaged). */
  syncCatalog: () => void;
  // Attack Methodology Checklist Actions
  setMachineOpenPorts: (machineId: string, ports: number[]) => void;
  setChecklistItemStatus: (machineId: string, itemId: string, status: import('../../types').ChecklistItemStatus) => void;
  setChecklistItemNotes: (machineId: string, itemId: string, notes: string) => void;
  setActiveChecklistItem: (machineId: string, itemId: string | null) => void;
  resetMachineChecklist: (machineId: string) => void;
  /** Tombstones of hard-deleted machines (sync merge must not resurrect them). Pruned after 180 days. */
  deletedMachineIds: MachineTombstone[];
  userSolvesReset: boolean;
  resetSolvesToZero: () => void;
  restoreDanielSolves: () => void;
  // Asynchronous Catalog Hydration
  isCatalogLoaded: boolean;
  isCatalogLoading: boolean;
  loadCatalog: () => Promise<void>;
}

// pruneMisstampedCustomMachines runs once per session, after the first full-catalog merge
let customStoragePruned = false;
/** The catalog load in flight, shared by every concurrent loadCatalog() caller. */
let catalogLoadInFlight: Promise<void> | null = null;

export const createMachinesSlice = (boot: CtfBootData): StateCreator<CtfStoreState, [['zustand/persist', unknown]], [], MachinesSliceState> => (set, get) => ({
  machines: mergeMachinesWithCatalog(boot.initialProfileData?.machines, boot.bootUserSolvesReset),

  deletedMachineIds: normalizeMachineTombstones(boot.initialProfileData?.deletedMachineIds),

  userSolvesReset: boot.bootUserSolvesReset,

  isCatalogLoaded: false,

  isCatalogLoading: false,

  loadCatalog: () => {
    if (get().isCatalogLoaded) return Promise.resolve();
    // Concurrent callers (the idle scheduler, a backup export, a merge) all wait on the one load in flight.
    if (catalogLoadInFlight) return catalogLoadInFlight;
    if (get().isCatalogLoading) return Promise.resolve();
    // Transient flag: not part of partialize(), so this set() never re-serializes the machines.
    set({ isCatalogLoading: true });
    const run = (async () => {
      try {
        const INITIAL_MACHINES = await loadMachinesCatalog();
        const state = get();
        const merged = mergeMachinesWithCatalog(state.machines, state.userSolvesReset, INITIAL_MACHINES);
        const unchanged =
          merged.length === state.machines.length && merged.every((m, i) => m === state.machines[i]);
        // Single atomic set() with the FULL catalog: never merge in slices, because mergeMachinesWithCatalog
        // drops unmatched stored rows when it is handed a partial catalog. Keep the existing machines
        // reference when the merge changed nothing so subscribers and the persist layer see no change.
        set({
          ...(unchanged ? {} : { machines: merged }),
          isCatalogLoaded: true,
          isCatalogLoading: false,
        });
        // Full catalog is in: every mis-stamped catalog row is now normalized, so drop their stale custom copies once.
        // Never before the pre-migration snapshot exists; a failed/unconfirmed prune is retried next session.
        if (!customStoragePruned && (await whenPreMigrationBackupSettled()) !== 'failed') {
          const removed = pruneMisstampedCustomMachines(get().machines, get().currentProfileId || 'guest', flushProfileSave);
          if (removed >= 0) customStoragePruned = true;
        }
      } catch (err) {
        console.error('Failed to lazy load machinesCatalog:', err);
        set({ isCatalogLoading: false });
      } finally {
        catalogLoadInFlight = null;
      }
    })();
    catalogLoadInFlight = run;
    return run;
  },

  updateMachineStatus: (id, status) => {
    set((state) => {
      const now = new Date().toISOString();
      const today = toLocalDateKey(new Date());
      const isNowRoot = status === 'root' || status === 'completed';
      const isNowFoothold = status === 'foothold' || isNowRoot;
      
      // Automatically stop the stopwatch timer when machine is rooted or completed
      const shouldStopTimer = isNowRoot && (state.activeTargetId === id || state.isTimerRunning);
      const base = shouldStopTimer ? foldActiveTimer(state) : state.machines;

      const updated = base.map((m) => {
        if (m.id !== id) return m;

        // The live timer may be ahead of the last checkpoint stored on the machine: keep the larger one.
        const elapsed = state.activeTargetId === id ? state.activeTimerSeconds : 0;
        const finalTime = Math.max(m.timeSpentSeconds || 0, elapsed);

        const hasUserFlag = Boolean(m.userFlag?.trim());
        const hasRootFlag = Boolean(m.rootFlag?.trim());

        return logProgressTimeline(m, {
          ...m,
          status,
          timeSpentSeconds: finalTime > 0 ? finalTime : m.timeSpentSeconds,
          userPwnedAt: isNowFoothold ? (m.userPwnedAt || now) : (hasUserFlag ? m.userPwnedAt : undefined),
          rootPwnedAt: isNowRoot ? (m.rootPwnedAt || now) : (hasRootFlag ? m.rootPwnedAt : undefined),
          timeToUserSeconds: isNowFoothold ? (m.timeToUserSeconds || finalTime) : undefined,
          timeToRootSeconds: isNowRoot ? (m.timeToRootSeconds || finalTime) : undefined,
          updatedAt: now,
        });
      });

      // Log activity session if root or completed
      let sessions = state.activitySessions;
      const prevMachine = state.machines.find(x => x.id === id);
      if (entersRootStage(prevMachine?.status, status)) {
        const m = prevMachine;
        const duration = (state.activeTargetId === id && state.activeTimerSeconds > 0)
          ? state.activeTimerSeconds
          : (m?.timeSpentSeconds || 0);

        sessions = [
          ...sessions,
          {
            id: 'sess-' + Date.now(),
            machineId: id,
            machineName: m?.name || 'Unknown',
            date: today,
            durationSeconds: duration,
            type: 'root',
          }
        ];
      }

      // Auto-sync active target and RHOST (targetIp) when entering Active Recon or Foothold Obtained
      let activeId = state.activeTargetId;
      let newGlobalVars = state.globalVars;
      let assignIpId = state.assignIpMachineId;
      const shouldStartTimer = state.isTimerRunning;

      if (status === 'recon' || status === 'foothold') {
        activeId = id;
        const targetM = state.machines.find((x) => x.id === id);
        if (targetM) {
          const isPlaceholder = !targetM.ip || targetM.ip.toLowerCase().includes('x') || targetM.ip === '10.10.10.X';
          if (isPlaceholder) {
            assignIpId = id;
          } else {
            newGlobalVars = {
              ...state.globalVars,
              targetIp: targetM.ip,
            };
          }
        }
      }

      return { 
        machines: updated, 
        activitySessions: sessions,
        isTimerRunning: shouldStopTimer ? false : shouldStartTimer,
        activeTargetId: activeId,
        globalVars: newGlobalVars,
        assignIpMachineId: assignIpId,
        unexportedChangesCount: (state.unexportedChangesCount || 0) + 1,
      };
    });
  },

  batchUpdateMachineStatus: (updates) => {
    if (!updates || updates.length === 0) return;
    const updateMap = new Map(updates.map(u => [u.machineId, u.status]));
    const now = new Date().toISOString();
    set((state) => {
      const updated = state.machines.map((m) => {
        const targetStatus = updateMap.get(m.id);
        if (!targetStatus) return m;

        // Invariant: Never downgrade Daniel Dayan's existing completed machines unless user started fresh
        if (!state.userSolvesReset && m.status === 'completed' && targetStatus !== 'completed') return m;

        const isPwned = targetStatus === 'root' || targetStatus === 'completed';
        const isFoothold = targetStatus === 'foothold' || isPwned;
        const hasUserFlag = Boolean(m.userFlag?.trim());
        const hasRootFlag = Boolean(m.rootFlag?.trim());

        return logProgressTimeline(m, {
          ...m,
          status: targetStatus,
          rootPwnedAt: isPwned ? (m.rootPwnedAt || now) : (hasRootFlag ? m.rootPwnedAt : undefined),
          userPwnedAt: isFoothold ? (m.userPwnedAt || now) : (hasUserFlag ? m.userPwnedAt : undefined),
          timeToUserSeconds: isFoothold ? m.timeToUserSeconds : undefined,
          timeToRootSeconds: isPwned ? m.timeToRootSeconds : undefined,
          updatedAt: now,
        });
      });
      return { machines: updated };
    });
  },

  updateMachine: (id, updates) => {
    set((state) => {
      const isNowCompleted = updates.status === 'root' || updates.status === 'completed';
      const shouldStopTimer = isNowCompleted && (state.activeTargetId === id || state.isTimerRunning);
      const syncTargetIp = Boolean(state.activeTargetId === id && updates.ip);
      const editsActiveTime = state.activeTargetId === id && typeof updates.timeSpentSeconds === 'number';
      // Stopping the timer folds its seconds into the active machine first; explicit updates still win.
      const base = shouldStopTimer ? foldActiveTimer(state) : state.machines;

      return {
        ...(editsActiveTime ? { activeTimerSeconds: updates.timeSpentSeconds } : {}),
        machines: base.map((m) => {
          if (m.id !== id) return m;
          const merged = logProgressTimeline(m, { ...m, ...updates, updatedAt: new Date().toISOString() });
          if (isKnownActiveByName(merged)) {
            merged.isActive = true;
          }
          if (merged.isActive) {
            return sanitizeActiveMachine(merged);
          }
          return merged;
        }),
        globalVars: syncTargetIp
          ? { ...state.globalVars, targetIp: updates.ip! }
          : state.globalVars,
        isTimerRunning: shouldStopTimer ? false : state.isTimerRunning,
        unexportedChangesCount: (state.unexportedChangesCount || 0) + 1,
      };
    });
    const profileId = get().currentProfileId || 'guest';
    get().saveProfileData(profileId);
    saveCustomMachinesToStorage(get().machines, profileId);
  },

  addCustomMachine: (data) => get().addCustomMachines([data]),

  // One state write and one save for the whole list (a CSV import must not re-save the profile per row).
  addCustomMachines: (drafts) => {
    if (drafts.length === 0) return;
    const stamp = Date.now();
    const now = new Date().toISOString();
    const usedIds = new Set(get().machines.map((m) => m.id));
    const added = drafts.map((data) => {
      const base = 'custom-' + stamp + '-' + data.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      let id = base;
      for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
      usedIds.add(id);
      // Customs are never flagged by name alone; only an explicit isActive makes them name-only.
      const isActive = Boolean(data.isActive);
      const baseMachine: Machine = {
        ...data,
        id,
        isCustom: true,
        isActive,
        timeSpentSeconds: 0,
        createdAt: now,
        updatedAt: now,
      };
      return isActive ? sanitizeActiveMachine(baseMachine) : baseMachine;
    });
    set((state) => ({
      machines: [...added, ...state.machines],
      unexportedChangesCount: (state.unexportedChangesCount || 0) + added.length,
    }));
    const profileId = get().currentProfileId || 'guest';
    get().saveProfileData(profileId);
    saveCustomMachinesToStorage(get().machines, profileId);
    for (const machine of added) broadcastCrossTabMessage('MACHINE_ADDED', { machine, profileId });
  },

  deleteMachine: (id) => {
    const profileId = get().currentProfileId || 'guest';
    const deletedAt = new Date().toISOString();
    deleteMachineDeepData(profileId, id).catch(() => {});
    broadcastCrossTabMessage('MACHINE_DELETED', { id, profileId, deletedAt });
    set((state) => ({
      machines: state.machines.filter((m) => m.id !== id),
      // Tombstone: a later sync merge must not bring the machine back from an older copy.
      deletedMachineIds: addMachineTombstone(state.deletedMachineIds, id, Date.parse(deletedAt)),
      ...deletedMachineSessionReset(state, id),
      unexportedChangesCount: (state.unexportedChangesCount || 0) + 1,
    }));
    get().saveProfileData(profileId);
    saveCustomMachinesToStorage(get().machines, profileId);
  },

  toggleUserFlag: (id, flagValue) => {
    set((state) => {
      const now = new Date().toISOString();
      const currentElapsed = id === state.activeTargetId ? state.activeTimerSeconds : undefined;
      const updated = state.machines.map((m) => {
        if (m.id !== id) return m;
        const hadUser = Boolean(m.userPwnedAt);
        const userPwnedAt = hadUser ? undefined : now;
        let status = m.status;
        if (!hadUser && (status === 'backlog' || status === 'recon')) status = 'foothold';
        const totalSeconds = currentElapsed !== undefined ? Math.max(m.timeSpentSeconds, currentElapsed) : m.timeSpentSeconds;
        return logProgressTimeline(m, {
          ...m,
          userFlag: flagValue !== undefined ? flagValue : m.userFlag,
          userPwnedAt,
          status,
          timeSpentSeconds: totalSeconds,
          timeToUserSeconds: !hadUser ? totalSeconds : m.timeToUserSeconds,
          updatedAt: now,
        });
      });
      return { machines: updated };
    });
  },

  toggleRootFlag: (id, flagValue) => {
    set((state) => {
      const now = new Date().toISOString();
      const currentElapsed = id === state.activeTargetId ? state.activeTimerSeconds : undefined;
      const updated = state.machines.map((m) => {
        if (m.id !== id) return m;
        const hadRoot = Boolean(m.rootPwnedAt);
        const rootPwnedAt = hadRoot ? undefined : now;
        let status = m.status;
        if (!hadRoot) status = 'root';
        const totalSeconds = currentElapsed !== undefined ? Math.max(m.timeSpentSeconds, currentElapsed) : m.timeSpentSeconds;
        return logProgressTimeline(m, {
          ...m,
          rootFlag: flagValue !== undefined ? flagValue : m.rootFlag,
          rootPwnedAt,
          status,
          timeSpentSeconds: totalSeconds,
          timeToRootSeconds: !hadRoot ? totalSeconds : m.timeToRootSeconds,
          updatedAt: now,
        });
      });
      return { machines: updated };
    });
  },

  setMachineDomain: (id, domain) => {
    const value = typeof domain === 'string' ? domain.trim().slice(0, 253) : '';
    set((state) => {
      const machines = patchLabMachine(state.machines, id, (m) =>
        (m.domain || '') === value ? m : { ...m, domain: value || undefined }
      );
      return machines === state.machines ? state : { machines, unexportedChangesCount: (state.unexportedChangesCount || 0) + 1 };
    });
  },

  setMachineVhosts: (id, vhosts) => {
    const list = normalizeVhosts(vhosts);
    set((state) => {
      const machines = patchLabMachine(state.machines, id, (m) =>
        sameList(m.vhosts, list) ? m : { ...m, vhosts: list.length ? list : undefined }
      );
      return machines === state.machines ? state : { machines, unexportedChangesCount: (state.unexportedChangesCount || 0) + 1 };
    });
  },

  addMachineVhost: (id, vhost) => {
    const m = get().machines.find((x) => x.id === id);
    if (!m) return;
    get().setMachineVhosts(id, [...(m.vhosts || []), vhost]);
  },

  removeMachineVhost: (id, vhost) => {
    const m = get().machines.find((x) => x.id === id);
    if (!m) return;
    const target = typeof vhost === 'string' ? vhost.trim().toLowerCase() : '';
    get().setMachineVhosts(id, (m.vhosts || []).filter((v) => v !== target));
  },

  setPortTriage: (id, port, patch) => {
    const raw = String(port ?? '').trim();
    if (!raw) return;
    // Protocol-aware normalization: an explicit "port/proto" key (from PortTriageTable)
    // or an explicit patch.protocol stores under the composite key; legacy numeric
    // callers keep their numeric key so older rows stay valid (reads fall back to it).
    // Tcp composites also mirror the legacy key so old readers stay in step; udp never
    // touches the legacy key, giving tcp/udp independent rows.
    let compositeKey: string | null = null;
    let legacyKey: string | null = null;
    if (raw.includes('/')) {
      const slash = raw.indexOf('/');
      const portPart = raw.slice(0, slash).trim().slice(0, 16);
      const protoPart = (raw.slice(slash + 1).trim().toLowerCase() || 'tcp').slice(0, 16);
      if (!portPart) return;
      compositeKey = `${portPart}/${protoPart}`.slice(0, 32);
      if (protoPart === 'tcp') legacyKey = portPart.slice(0, 32);
    } else {
      const protoRaw = (patch as { protocol?: unknown } | null | undefined)?.protocol;
      if (typeof protoRaw === 'string' && protoRaw.trim()) {
        const protoPart = protoRaw.trim().toLowerCase().slice(0, 16);
        const portPart = raw.slice(0, 16);
        compositeKey = `${portPart}/${protoPart}`.slice(0, 32);
        if (protoPart === 'tcp') legacyKey = portPart.slice(0, 32);
      } else {
        legacyKey = raw.slice(0, 32);
      }
    }
    const keys: string[] = compositeKey
      ? (legacyKey ? [compositeKey, legacyKey] : [compositeKey])
      : [legacyKey as string];
    set((state) => {
      const machines = patchLabMachine(state.machines, id, (m) => {
        const primary = compositeKey ?? (legacyKey as string);
        const prev: PortTriageEntry =
          m.portTriage?.[primary] ||
          (compositeKey && legacyKey ? m.portTriage?.[legacyKey] : undefined) || { status: 'untested' };
        const merged = { ...prev, ...(patch || {}) };
        const entry: PortTriageEntry = {
          status: PORT_TRIAGE_STATUSES.includes(merged.status) ? merged.status : 'untested',
        };
        if (typeof merged.note === 'string' && merged.note.trim()) entry.note = merged.note.slice(0, 2000);
        if (keys.every((k) => {
          const existing = m.portTriage?.[k];
          return existing !== undefined && existing.status === entry.status && existing.note === entry.note;
        })) return m;
        const nextTriage = { ...(m.portTriage || {}) };
        for (const k of keys) nextTriage[k] = entry;
        return { ...m, portTriage: nextTriage };
      });
      return machines === state.machines ? state : { machines, unexportedChangesCount: (state.unexportedChangesCount || 0) + 1 };
    });
  },

  clearPortTriage: (id, port) => {
    const raw = String(port ?? '').trim();
    if (!raw) return;
    let doomed: string[];
    if (raw.includes('/')) {
      const slash = raw.indexOf('/');
      const portPart = raw.slice(0, slash).trim().slice(0, 16);
      const protoPart = (raw.slice(slash + 1).trim().toLowerCase() || 'tcp').slice(0, 16);
      if (!portPart) return;
      const composite = `${portPart}/${protoPart}`.slice(0, 32);
      doomed = protoPart === 'tcp' ? [composite, portPart.slice(0, 32)] : [composite];
    } else {
      const legacy = raw.slice(0, 32);
      doomed = [legacy, `${legacy}/tcp`.slice(0, 32)];
    }
    set((state) => {
      const machines = patchLabMachine(state.machines, id, (m) => {
        const triage = m.portTriage;
        if (!triage || !doomed.some((k) => k in triage)) return m;
        const rest = { ...triage };
        for (const k of doomed) delete rest[k];
        return { ...m, portTriage: Object.keys(rest).length ? rest : undefined };
      });
      return machines === state.machines ? state : { machines, unexportedChangesCount: (state.unexportedChangesCount || 0) + 1 };
    });
  },

  addFinding: (id, input) => {
    const findingId = newLabId('finding');
    let added = false;
    set((state) => {
      const machines = patchLabMachine(state.machines, id, (m, nowMs) => {
        const list = Array.isArray(m.findings) ? m.findings : [];
        if (list.length >= MAX_FINDINGS) return m;
        const finding: LabFinding = { ...cleanFindingFields(input || ({} as LabFindingPatch)), id: findingId, createdAt: nowMs, updatedAt: nowMs };
        added = true;
        return appendTimeline(
          { ...m, findings: [...list, finding] },
          {
            kind: 'finding_added',
            label: `Finding added: ${finding.title}`,
            meta: { findingId, severity: finding.severity },
            at: nowMs,
          }
        );
      });
      return machines === state.machines ? state : { machines, unexportedChangesCount: (state.unexportedChangesCount || 0) + 1 };
    });
    return added ? findingId : '';
  },

  updateFinding: (id, findingId, patch) => {
    set((state) => {
      const machines = patchLabMachine(state.machines, id, (m, nowMs) => {
        const list = m.findings || [];
        const idx = list.findIndex((f) => f.id === findingId);
        if (idx === -1) return m;
        const current = list[idx];
        const next: LabFinding = { ...cleanFindingFields(patch || {}, current), id: current.id, createdAt: current.createdAt, updatedAt: nowMs };
        const findings = [...list];
        findings[idx] = next;
        return { ...m, findings };
      });
      return machines === state.machines ? state : { machines, unexportedChangesCount: (state.unexportedChangesCount || 0) + 1 };
    });
  },

  removeFinding: (id, findingId) => {
    set((state) => {
      const machines = patchLabMachine(state.machines, id, (m) => {
        const list = m.findings || [];
        const findings = list.filter((f) => f.id !== findingId);
        if (findings.length === list.length) return m;
        return { ...m, findings: findings.length ? findings : undefined };
      });
      return machines === state.machines ? state : { machines, unexportedChangesCount: (state.unexportedChangesCount || 0) + 1 };
    });
  },

  setSolveIndependence: (id, value) => {
    if (!SOLVE_INDEPENDENCE_VALUES.includes(value)) return;
    set((state) => {
      const machines = patchLabMachine(state.machines, id, (m, nowMs) => {
        // First rating schedules review #0. Re-rating a due machine counts as completing that review;
        // re-rating before it is due only corrects the rating and reschedules from now.
        const prevCount = m.reviewCount || 0;
        const count = m.solveIndependence && isDueForReview(m, nowMs) ? prevCount + 1 : prevCount;
        return scheduleReview(m, value, count, nowMs);
      });
      return machines === state.machines ? state : { machines, unexportedChangesCount: (state.unexportedChangesCount || 0) + 1 };
    });
  },

  markReviewed: (id, independence) => {
    if (independence !== undefined && !SOLVE_INDEPENDENCE_VALUES.includes(independence)) return;
    set((state) => {
      const machines = patchLabMachine(state.machines, id, (m, nowMs) =>
        scheduleReview(m, independence || m.solveIndependence || 'nudged', (m.reviewCount || 0) + 1, nowMs)
      );
      return machines === state.machines ? state : { machines, unexportedChangesCount: (state.unexportedChangesCount || 0) + 1 };
    });
  },

  syncCatalog: () => {
    // Re-applies the loaded catalog (or STARTER_MACHINES before it loads) to the current machines.
    // NOTE: tags and certifications are UNIONED (catalog + stored), so a tag the catalog has since removed
    // stays on the machine; only additions propagate. All operator fields survive (both branches spread `...m`).
    if (isSchemaWriteGated()) return;
    set((state) => {
      const merged = mergeMachinesWithCatalog(state.machines, state.userSolvesReset);
      const unchanged =
        merged.length === state.machines.length && merged.every((m, i) => m === state.machines[i]);
      return unchanged ? state : { machines: merged };
    });
  },

  setMachineOpenPorts: (machineId, ports) => {
    const validPorts = Array.isArray(ports)
      ? Array.from(new Set(
          ports
            .map((p) => (typeof p === 'string' ? parseInt(p, 10) : Number(p)))
            .filter((n) => Number.isInteger(n) && n >= 1 && n <= 65535)
        )).sort((a, b) => a - b)
      : [];

    set((state) => {
      let modified = false;
      const machines = state.machines.map((m) => {
        if (m.id !== machineId || m.isActive) return m;
        const currentPorts = m.openPorts || [];
        if (
          currentPorts.length === validPorts.length &&
          currentPorts.every((p, idx) => p === validPorts[idx])
        ) {
          return m;
        }
        modified = true;
        return {
          ...m,
          openPorts: validPorts,
          checklist: {
            openPorts: validPorts,
            activeItemId: m.checklist?.activeItemId || null,
            itemsState: m.checklist?.itemsState || {},
          },
          updatedAt: new Date().toISOString(),
        };
      });
      return modified ? { machines } : state;
    });
  },

  setChecklistItemStatus: (machineId, itemId, status) => {
    set((state) => {
      const now = new Date().toISOString();
      return {
        machines: state.machines.map((m) => {
          if (m.id !== machineId || m.isActive) return m;

          const existingChecklist = m.checklist || {
            openPorts: m.openPorts || [],
            activeItemId: null,
            itemsState: {},
          };

          const currentItem = existingChecklist.itemsState[itemId] || { status: 'todo' };
          const startedAt = status === 'in_progress' ? (currentItem.startedAt || now) : currentItem.startedAt;
          const completedAt = status === 'done' ? now : (status === 'todo' ? undefined : currentItem.completedAt);
          const activeItemId = status === 'in_progress' ? itemId : (existingChecklist.activeItemId === itemId ? null : existingChecklist.activeItemId);

          return {
            ...m,
            checklist: {
              ...existingChecklist,
              activeItemId,
              itemsState: {
                ...existingChecklist.itemsState,
                [itemId]: {
                  ...currentItem,
                  status,
                  startedAt,
                  completedAt,
                },
              },
            },
            updatedAt: now,
          };
        }),
      };
    });
  },

  setChecklistItemNotes: (machineId, itemId, notes) => {
    set((state) => ({
      machines: state.machines.map((m) => {
        if (m.id !== machineId || m.isActive) return m;
        const existingChecklist = m.checklist || {
          openPorts: m.openPorts || [],
          activeItemId: null,
          itemsState: {},
        };
        const currentItem = existingChecklist.itemsState[itemId] || { status: 'todo' };

        return {
          ...m,
          checklist: {
            ...existingChecklist,
            itemsState: {
              ...existingChecklist.itemsState,
              [itemId]: {
                ...currentItem,
                notes,
              },
            },
          },
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  },

  setActiveChecklistItem: (machineId, itemId) => {
    set((state) => ({
      machines: state.machines.map((m) =>
        m.id === machineId && !m.isActive
          ? {
              ...m,
              checklist: {
                openPorts: m.openPorts || [],
                activeItemId: itemId,
                itemsState: m.checklist?.itemsState || {},
              },
              updatedAt: new Date().toISOString(),
            }
          : m
      ),
    }));
  },

  resetMachineChecklist: (machineId) => {
    set((state) => ({
      machines: state.machines.map((m) =>
        m.id === machineId && !m.isActive
          ? {
              ...m,
              checklist: {
                openPorts: m.openPorts || [],
                activeItemId: null,
                itemsState: {},
              },
              updatedAt: new Date().toISOString(),
            }
          : m
      ),
    }));
  },

  resetSolvesToZero: () => {
    const targetId = get().currentProfileId || 'guest';
    set((state) => {
      const now = new Date().toISOString();
      const fresh: Machine[] = state.machines.map((m) => ({
        ...m,
        updatedAt: now,
        status: 'backlog' as PipelineStatus,
        userFlag: undefined,
        rootFlag: undefined,
        userPwnedAt: undefined,
        rootPwnedAt: undefined,
        timeSpentSeconds: 0,
        timeToUserSeconds: undefined,
        timeToRootSeconds: undefined,
      }));
      return {
        machines: fresh,
        activeTargetId: null,
        isTimerRunning: false,
        activeTimerSeconds: 0,
        activitySessions: [],
        userSolvesReset: true,
      };
    });
    get().saveProfileData(targetId);
  },

  restoreDanielSolves: async () => {
    let catalog: Machine[];
    try {
      catalog = await loadMachinesCatalog();
    } catch {
      catalog = STARTER_MACHINES;
    }
    const targetId = get().currentProfileId || 'guest';
    const customMachines = get().machines.filter(
      (m) => m.isCustom || m.platform === 'Custom' || (m.id && m.id.startsWith('custom-'))
    );
    const combined = [...customMachines, ...DEMO_SOLVED_ROSTER];
    const merged = mergeMachinesWithCatalog(combined as Machine[], false, catalog);
    set(() => ({
      machines: merged,
      userSolvesReset: false,
      isCatalogLoaded: true,
    }));
    get().saveProfileData(targetId);
    saveCustomMachinesToStorage(customMachines, targetId);
  },
});
