import React, { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Network, Plus, Server, X } from 'lucide-react';
import { useExamStore, type ExamCustomHost } from '../../store/examStore';
import { useCtfStore } from '../../store/useCtfStore';
import { isActiveDirectoryBox, type ExamBox } from '../../utils/examComplianceUtils';
import type { Machine, OperatingSystem } from '../../types';
import type { AttackGraphEdge, AttackNodePosition } from '../../types/graph';
import type { GraphHistoryBackend, GraphNodeCred, GraphViewAdapter } from '../tracker/GraphView';
import { Modal } from '../common/Modal';

const GraphView = lazy(() => import('../tracker/GraphView').then((m) => ({ default: m.GraphView })));

const EMPTY_POSITIONS: Record<string, AttackNodePosition> = {};
const EMPTY_EDGES: AttackGraphEdge[] = [];
const EMPTY_CUSTOM_NODES: ExamCustomHost[] = [];

const OS_OPTIONS: OperatingSystem[] = ['Windows', 'Linux', 'BSD', 'Other'];

const ROLE_PRESETS = ['DC01 / Domain Controller', 'Internal Pivot', 'Member Server', 'File / DB Server', 'DMZ Host'];

function examBoxToMachine(box: ExamBox, activeBoxId: string | null): Machine {
  const status = box.rootPwned
    ? 'root'
    : box.userPwned
      ? 'foothold'
      : activeBoxId === box.id
        ? 'recon'
        : 'backlog';
  const tags = [isActiveDirectoryBox(box) ? 'AD-Set' : 'Standalone'];
  if (box.adRole) tags.push(box.adRole.toUpperCase());
  else if (box.type) tags.push(box.type);

  return {
    id: box.id,
    name: box.name,
    ip: box.ip || '10.10.x.x',
    os: box.os,
    platform: 'Custom',
    difficulty: box.difficulty,
    status,
    tags,
    certifications: [],
    isCustom: false,
    timeSpentSeconds: 0,
    quickNotes: box.label,
    createdAt: box.initialAccessAt || new Date().toISOString(),
    updatedAt: box.privEscAt || box.initialAccessAt || new Date().toISOString(),
  };
}

function customHostToMachine(host: ExamCustomHost): Machine {
  const tags = [host.role || 'Internal Pivot'];
  if (host.subnet?.trim()) tags.push(host.subnet.trim());
  return {
    id: host.id,
    name: host.name,
    ip: host.ip || '172.16.x.x',
    os: host.os,
    platform: 'Custom',
    difficulty: 'Medium',
    status: host.compromised ? 'root' : 'recon',
    tags,
    certifications: [],
    isCustom: true,
    domain: host.domain,
    quickNotes: host.notes,
    timeSpentSeconds: 0,
    createdAt: host.createdAt,
    updatedAt: host.createdAt,
  };
}

const examGraphBackend: GraphHistoryBackend = {
  getSnapshot: () => {
    const s = useExamStore.getState();
    return {
      edges: s.examGraphEdges ?? EMPTY_EDGES,
      positions: s.examGraphPositions ?? EMPTY_POSITIONS,
    };
  },
  addEdge: (edge) => useExamStore.getState().addExamGraphEdge(edge),
  updateEdge: (id, updates) => useExamStore.getState().updateExamGraphEdge(id, updates),
  deleteEdge: (id) => useExamStore.getState().deleteExamGraphEdge(id),
  setNodePosition: (id, pos) => useExamStore.getState().setExamGraphNodePosition(id, pos),
  batchSetNodePositions: (positions) => useExamStore.getState().batchSetExamGraphNodePositions(positions),
  resetLayout: () => useExamStore.getState().resetExamGraphLayout(),
};

interface AddInternalHostModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (host: Omit<ExamCustomHost, 'id' | 'createdAt'>) => void;
}

const AddInternalHostModal: React.FC<AddInternalHostModalProps> = ({ open, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [os, setOs] = useState<OperatingSystem>('Windows');
  const [role, setRole] = useState('Internal Pivot');
  const [domain, setDomain] = useState('');
  const [username, setUsername] = useState('');
  const [secret, setSecret] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onAdd({
      name: trimmedName,
      ip: ip.trim() || '172.16.x.x',
      os,
      role: role.trim() || 'Internal Pivot',
      domain: domain.trim() || undefined,
      username: username.trim() || undefined,
      secret: secret.trim() || undefined,
      notes: notes.trim() || undefined,
      compromised: false,
    });
    setName('');
    setIp('');
    setDomain('');
    setUsername('');
    setSecret('');
    setNotes('');
    onClose();
  };

  const fieldCls =
    'h-9 w-full rounded-lg border border-subtle bg-surface-sunken px-2.5 text-xs text-primary placeholder:text-muted focus:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

  return (
    <Modal open={open} onClose={onClose} labelledBy="add-internal-host-title" size="md" panelClassName="text-primary">
      <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-subtle bg-surface-card px-4 py-3">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-accent" aria-hidden="true" />
            <h2 id="add-internal-host-title" className="text-sm font-semibold text-primary">
              Add discovered internal host
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close add internal host dialog"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3 p-4 text-xs">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="font-medium text-secondary">Hostname *</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="DC01 / MS01 / PIVOT-01"
                className={fieldCls}
              />
            </label>
            <label className="space-y-1">
              <span className="font-medium text-secondary">Internal IP / Subnet</span>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="172.16.1.10"
                className={`${fieldCls} font-mono`}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="font-medium text-secondary">Operating system</span>
              <select value={os} onChange={(e) => setOs(e.target.value as OperatingSystem)} className={fieldCls}>
                {OS_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-medium text-secondary">Role / Segment</span>
              <input
                type="text"
                list="exam-host-role-presets"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Internal Pivot"
                className={fieldCls}
              />
              <datalist id="exam-host-role-presets">
                {ROLE_PRESETS.map((preset) => (
                  <option key={preset} value={preset} />
                ))}
              </datalist>
            </label>
          </div>

          <div className="rounded-xl border border-subtle bg-surface-card p-3 space-y-2">
            <div className="text-[11px] font-semibold text-muted">
              Optional host credentials (shown in graph flyout &amp; 1-click Session HUD)
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-secondary">Domain</span>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="corp.local"
                  className={`${fieldCls} font-mono`}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-secondary">Username</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="svc_sql"
                  className={`${fieldCls} font-mono`}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-secondary">Password / Hash</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Optional"
                  className={`${fieldCls} font-mono`}
                />
              </label>
            </div>
          </div>

          <label className="block space-y-1">
            <span className="font-medium text-secondary">Pivot notes (ports, tunnel, subnet)</span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ligolo tun0 route 172.16.1.0/24 via MS01; SMB 445 + WinRM 5985 open"
              className="w-full rounded-lg border border-subtle bg-surface-sunken px-2.5 py-2 text-xs text-primary placeholder:text-muted focus:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent resize-none"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-subtle bg-surface-card px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 cursor-pointer rounded-lg border border-subtle bg-surface-sunken px-3.5 text-xs font-medium text-secondary hover:bg-surface-hover hover:text-primary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-4 text-xs font-semibold text-on-accent hover:brightness-110 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add to pivot graph</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

interface ExamPivotGraphPanelProps {
  onFocusBox?: (boxId: string) => void;
}

/**
 * Isolated Exam Pivot Attack Graph inside ExamSimulatorPage.
 * Reuses the lazy GraphView canvas to map exam targets + discovered internal hosts,
 * pivot tunnels, credential reuse, and SVG / Obsidian Canvas export.
 */
export const ExamPivotGraphPanel: React.FC<ExamPivotGraphPanelProps> = ({ onFocusBox }) => {
  const {
    track,
    boxes,
    activeBoxId,
    examGraphPositions,
    examGraphEdges,
    examCustomNodes,
    setActiveBox,
    setQuickDrawerOpen,
    addExamCustomNode,
    deleteExamCustomNode,
  } = useExamStore(
    useShallow((s) => ({
      track: s.track,
      boxes: s.boxes,
      activeBoxId: s.activeBoxId,
      examGraphPositions: s.examGraphPositions ?? EMPTY_POSITIONS,
      examGraphEdges: s.examGraphEdges ?? EMPTY_EDGES,
      examCustomNodes: s.examCustomNodes ?? EMPTY_CUSTOM_NODES,
      setActiveBox: s.setActiveBox,
      setQuickDrawerOpen: s.setQuickDrawerOpen,
      addExamCustomNode: s.addExamCustomNode,
      deleteExamCustomNode: s.deleteExamCustomNode,
    })),
  );

  const vaultCredentials = useCtfStore((s) => s.credentials);
  const setGlobalVars = useCtfStore((s) => s.setGlobalVars);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const graphMachines = useMemo<Machine[]>(
    () => [
      ...boxes.map((box) => examBoxToMachine(box, activeBoxId)),
      ...examCustomNodes.map(customHostToMachine),
    ],
    [boxes, activeBoxId, examCustomNodes],
  );

  const boxMap = useMemo(() => new Map(boxes.map((b) => [b.id, b])), [boxes]);
  const customMap = useMemo(() => new Map(examCustomNodes.map((n) => [n.id, n])), [examCustomNodes]);

  const getNodeCreds = useCallback(
    (nodeId: string): GraphNodeCred[] => {
      const out: GraphNodeCred[] = [];
      const customHost = customMap.get(nodeId);
      if (customHost && (customHost.username || customHost.secret)) {
        out.push({
          id: `custom-cred-${customHost.id}`,
          domain: customHost.domain,
          username: customHost.username || '',
          secret: customHost.secret || '',
          type: 'password',
        });
      }
      const box = boxMap.get(nodeId);
      const linkedMachineId = box?.machineId;
      if (linkedMachineId) {
        vaultCredentials
          .filter((c) => c.sourceMachineId === linkedMachineId || Boolean(c.verifications?.[linkedMachineId]))
          .forEach((c) => {
            out.push({
              id: c.id,
              domain: c.domain,
              username: c.username,
              secret: c.secret,
              type: c.type,
            });
          });
      }
      return out;
    },
    [boxMap, customMap, vaultCredentials],
  );

  const handleActivateNode = useCallback(
    (machine: Machine) => {
      if (machine.ip && !/x/i.test(machine.ip)) {
        setGlobalVars({ targetIp: machine.ip });
      }
      if (boxMap.has(machine.id)) {
        setActiveBox(machine.id);
        onFocusBox?.(machine.id);
      }
    },
    [boxMap, setActiveBox, setGlobalVars, onFocusBox],
  );

  const handleOpenNodeDetails = useCallback(
    (machine: Machine) => {
      if (boxMap.has(machine.id)) {
        setActiveBox(machine.id);
        setQuickDrawerOpen(true);
      }
    },
    [boxMap, setActiveBox, setQuickDrawerOpen],
  );

  const adapter = useMemo<GraphViewAdapter>(
    () => ({
      title: `${track} Pivot Graph`,
      positions: examGraphPositions,
      edges: examGraphEdges,
      historyBackend: examGraphBackend,
      disableHubCollapse: true,
      activateNodeLabel: 'Focus target',
      onActivateNode: handleActivateNode,
      onOpenNodeDetails: handleOpenNodeDetails,
      onDeleteNode: (machine) => {
        if (customMap.has(machine.id)) deleteExamCustomNode(machine.id);
      },
      getNodeCreds,
    }),
    [
      track,
      examGraphPositions,
      examGraphEdges,
      handleActivateNode,
      handleOpenNodeDetails,
      customMap,
      deleteExamCustomNode,
      getNodeCreds,
    ],
  );

  return (
    <div className="space-y-3" data-testid="exam-pivot-graph-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-subtle bg-surface-card px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-2 text-secondary">
          <Network className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <span>
            Map lateral movement, Ligolo/Chisel pivots, and credential reuse. Drag cards, link hops, or export to SVG / Obsidian Canvas.
          </span>
        </div>
        <button
          type="button"
          data-testid="exam-add-internal-host-btn"
          onClick={() => setAddModalOpen(true)}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-on-accent transition-[filter,transform] hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-10"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Add internal host</span>
        </button>
      </div>

      <Suspense
        fallback={
          <div className="flex h-[480px] items-center justify-center rounded-2xl border border-subtle bg-surface-card text-xs text-muted">
            Loading pivot graph…
          </div>
        }
      >
        <GraphView filteredMachines={graphMachines} adapter={adapter} />
      </Suspense>

      <AddInternalHostModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={(host) => {
          addExamCustomNode(host);
        }}
      />
    </div>
  );
};
