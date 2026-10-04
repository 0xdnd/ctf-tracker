import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { confirmAction } from '../../store/useConfirmStore';
import { 
  X, 
  Terminal, 
  Copy, 
  Check, 
  Trash2, 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  Radio, 
  Server, 
  Network, 
  ExternalLink,
  Info
} from 'lucide-react';
import { 
  AttackGraphEdge, 
  AttackEdgeType, 
  AttackEdgeStatus, 
  ATTACK_EDGE_TYPES, 
  ATTACK_EDGE_META 
} from '../../types/graph';
import { Machine } from '../../types';
import { useCtfStore } from '../../store/useCtfStore';
import { generatePivotCommands } from '../../utils/pivotCommandUtils';
import { safeCopyToClipboard, playCyberSound } from '../../utils/helpers';
import { OsBadge } from '../common/OsBadge';
import { SyntaxHighlightedCommand } from '../common/SyntaxHighlightedCommand';
import { DRAWER_SLIDE_TRANSITION, DRAWER_RIGHT_VARIANTS } from '../../utils/motionTokens';

export interface GraphEdgeInspectorDrawerProps {
  edge: AttackGraphEdge | null;
  sourceMachine?: Machine;
  targetMachine?: Machine;
  isOpen: boolean;
  onClose: () => void;
  onUpdateEdge: (edgeId: string, updates: Partial<AttackGraphEdge>) => void;
  onDeleteEdge: (edgeId: string) => void;
}

export const GraphEdgeInspectorDrawer: React.FC<GraphEdgeInspectorDrawerProps> = ({
  edge,
  sourceMachine,
  targetMachine,
  isOpen,
  onClose,
  onUpdateEdge,
  onDeleteEdge,
}) => {
  const globalVars = useCtfStore((s) => s.globalVars);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [customPort, setCustomPort] = useState<string>('');
  const [edgeNotes, setEdgeNotes] = useState<string>('');

  useEffect(() => {
    if (edge) {
      setCustomPort(edge.port ? String(edge.port) : '');
      setEdgeNotes(edge.notes || '');
    }
  }, [edge]);

  // Trap Escape key to close drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const meta = edge ? (ATTACK_EDGE_META[edge.type] || ATTACK_EDGE_META['pivot-ssh']) : ATTACK_EDGE_META['pivot-ssh'];
  const srcIp = sourceMachine?.ip || edge?.sourceId || '';
  const tgtIp = targetMachine?.ip || edge?.targetId || '';

  // Generate dynamic live commands reactive to active HUD variables
  const commands = edge ? generatePivotCommands(
    edge,
    srcIp,
    tgtIp,
    globalVars.lhost,
    globalVars.lport
  ) : { listenerCommand: '', clientCommand: '', proxychainsSnippet: '', verificationCommand: '', quickCopyText: '' };

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    safeCopyToClipboard(text);
    setCopiedKey(key);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1600);
  };

  const handleTypeChange = (newType: AttackEdgeType) => {
    if (!edge) return;
    const newMeta = ATTACK_EDGE_META[newType];
    onUpdateEdge(edge.id, {
      type: newType,
      port: newMeta?.defaultPort || edge.port,
      protocol: newMeta?.defaultProtocol || edge.protocol,
    });
    if (soundEnabled) playCyberSound('click');
  };

  const handleStatusToggle = () => {
    if (!edge) return;
    const nextStatus: AttackEdgeStatus = edge.status === 'compromised' ? 'potential' : 'compromised';
    onUpdateEdge(edge.id, { status: nextStatus });
    if (soundEnabled) playCyberSound(nextStatus === 'compromised' ? 'root' : 'toggle');
  };

  const handlePortBlur = () => {
    if (!edge) return;
    const num = parseInt(customPort, 10);
    if (!isNaN(num) && num > 0 && num <= 65535) {
      onUpdateEdge(edge.id, { port: num });
    } else if (customPort.trim() === '') {
      onUpdateEdge(edge.id, { port: undefined });
    }
  };

  const handleNotesBlur = () => {
    if (!edge) return;
    onUpdateEdge(edge.id, { notes: edgeNotes });
  };

  const handleDelete = async () => {
    if (!edge) return;
    const ok = await confirmAction({
      title: 'Delete this attack edge?',
      body: 'This attack vector / pivot edge will be permanently removed.',
      confirmLabel: 'Delete edge',
      tone: 'danger',
    });
    if (ok) {
      onDeleteEdge(edge.id);
      if (soundEnabled) playCyberSound('toggle');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && edge && (
        <motion.div 
          key={`edge-drawer-${edge.id}`}
          variants={DRAWER_RIGHT_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed inset-y-0 right-0 z-[120] w-full max-w-md bg-surface-elevated border-l border-subtle shadow-2xl flex flex-col font-sans machined-edge"
          role="dialog"
          aria-label="Attack Vector Inspector"
        >
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-cyber-border/80 flex items-center justify-between bg-slate-50/90 dark:bg-cyber-card/70 backdrop-blur-sm machined-edge">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
            style={{ backgroundColor: `${meta.color}20`, border: `1px solid ${meta.color}60`, color: meta.color }}
          >
            <Network className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {meta.label}
              </h3>
              <span 
                className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase"
                style={{ 
                  backgroundColor: edge.status === 'compromised' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: edge.status === 'compromised' ? '#10B981' : '#F59E0B',
                  border: `1px solid ${edge.status === 'compromised' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
                }}
              >
                {edge.status === 'compromised' ? 'Active / Established' : 'Potential Vector'}
              </span>
            </div>
            <p className="text-[11px] text-tertiary dark:text-cyber-muted">
              {meta.description}
            </p>
          </div>
        </div>

        <button aria-label="Close inspector"
          onClick={onClose}
          className="p-1.5 rounded-lg text-tertiary hover:text-slate-900 dark:hover:text-primary hover:bg-slate-100 dark:hover:bg-cyber-bg transition-colors active:scale-[0.97] cursor-pointer"
          title="Close Inspector (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Topology Route Visualizer */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border/70 flex items-center justify-between gap-2 machined-edge">
          {/* Source Box */}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase font-bold text-tertiary dark:text-cyber-muted mb-1 flex items-center gap-1">
              <span>Pivot Origin</span>
              {sourceMachine?.status === 'root' && (
                <span className="text-callout-success-fg font-bold">🎯 Root</span>
              )}
            </div>
            <div className="font-bold text-slate-900 dark:text-white text-xs truncate">
              {sourceMachine?.name || edge.sourceId}
            </div>
            <div className="font-mono text-[11px] text-tertiary dark:text-cyber-muted truncate tabular-nums">
              {srcIp}
            </div>
          </div>

          <div className="flex flex-col items-center px-1">
            <ArrowRight className="w-4 h-4 text-callout-info-fg animate-pulse" />
            <span className="text-[9px] font-mono text-callout-info-fg font-bold mt-0.5 tabular-nums">
              {edge.port ? `:${edge.port}` : meta.defaultPort ? `:${meta.defaultPort}` : ''}
            </span>
          </div>

          {/* Target Box */}
          <div className="flex-1 min-w-0 text-right">
            <div className="text-[10px] uppercase font-bold text-tertiary dark:text-cyber-muted mb-1 flex items-center justify-end gap-1">
              <span>Target Machine</span>
            </div>
            <div className="font-bold text-slate-900 dark:text-white text-xs truncate">
              {targetMachine?.name || edge.targetId}
            </div>
            <div className="font-mono text-[11px] text-tertiary dark:text-cyber-muted truncate tabular-nums">
              {tgtIp}
            </div>
          </div>
        </div>

        {/* Vector Configuration Controls */}
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-200 mb-1">
              Pivot / Vector Protocol
            </label>
            <select
              value={edge.type}
              onChange={(e) => handleTypeChange(e.target.value as AttackEdgeType)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-cyber-card border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-cyan-500 dark:focus:border-cyber-cyan"
            >
              {ATTACK_EDGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ATTACK_EDGE_META[t].label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-200 mb-1">
                Port / Listener Hop
              </label>
              <input
                type="text"
                value={customPort}
                onChange={(e) => setCustomPort(e.target.value)}
                onBlur={handlePortBlur}
                placeholder={meta.defaultPort ? String(meta.defaultPort) : '1080'}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-cyber-card border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-white text-xs font-mono tabular-nums focus:outline-none focus:border-cyan-500 dark:focus:border-cyber-cyan"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-200 mb-1">
                Link Status
              </label>
              <button
                type="button"
                onClick={handleStatusToggle}
                className={`w-full py-1.5 px-2 rounded-lg font-bold text-xs border transition-colors flex items-center justify-center gap-1.5 active:scale-[0.97] cursor-pointer ${
                  edge.status === 'compromised'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-callout-success-fg'
                    : 'bg-amber-500/15 border-amber-500/50 text-callout-warn-fg'
                }`}
              >
                <span>{edge.status === 'compromised' ? 'Established' : 'Potential'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Terminal Command Generator */}
        <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-cyber-border/60">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-callout-info-fg" />
              <span>Generated Terminal Commands</span>
            </span>
            <div className="text-[10px] font-mono text-tertiary dark:text-cyber-muted">
              LHOST: <strong className="text-callout-info-fg tabular-nums">{globalVars.lhost}</strong>
            </div>
          </div>

          {/* Listener / Server Command */}
          {commands.listenerCommand && (
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 machined-edge">
              <div className="flex items-center justify-between text-[10px] text-tertiary">
                <span className="font-bold uppercase tracking-wider text-callout-info-fg">
                  1. Attacker / Pivot Command
                </span>
                <button
                  onClick={() => handleCopy(commands.listenerCommand, 'listener')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyber-cyan hover:text-black text-slate-300 text-[10px] font-bold transition-colors flex items-center gap-1 active:scale-[0.97] cursor-pointer"
                >
                  {copiedKey === 'listener' ? <Check className="w-3 h-3 text-callout-success-fg" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'listener' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="text-[11px] font-mono text-callout-success-fg overflow-x-auto whitespace-pre-wrap select-all">
                <span className="sr-only">{commands.listenerCommand}</span>
                <span aria-hidden="true">
                  <SyntaxHighlightedCommand command={commands.listenerCommand} />
                </span>
              </div>
            </div>
          )}

          {/* Client / Agent Command */}
          {commands.clientCommand && (
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 machined-edge">
              <div className="flex items-center justify-between text-[10px] text-tertiary">
                <span className="font-bold uppercase tracking-wider text-callout-tip-fg">
                  2. Remote Target / Client Hook
                </span>
                <button
                  onClick={() => handleCopy(commands.clientCommand, 'client')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-purple-500 hover:text-white text-slate-300 text-[10px] font-bold transition-colors flex items-center gap-1 active:scale-[0.97] cursor-pointer"
                >
                  {copiedKey === 'client' ? <Check className="w-3 h-3 text-callout-success-fg" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'client' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="text-[11px] font-mono text-callout-tip-fg overflow-x-auto whitespace-pre-wrap select-all">
                <span className="sr-only">{commands.clientCommand}</span>
                <span aria-hidden="true">
                  {commands.clientCommand.startsWith('#') ? (
                    <span className="text-tertiary dark:text-cyber-muted italic">
                      {commands.clientCommand}
                    </span>
                  ) : (
                    <SyntaxHighlightedCommand command={commands.clientCommand} />
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Proxychains Configuration */}
          {commands.proxychainsSnippet && (
            <div className="p-2.5 rounded-lg bg-surface-sunken border border-subtle space-y-1.5 machined-edge">
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span className="font-bold uppercase tracking-wider text-callout-warn-fg font-sans">
                  3. Proxychains / Routing Rule
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(commands.proxychainsSnippet, 'proxy')}
                  className="px-2 py-0.5 rounded bg-surface-elevated hover:bg-surface-hover text-secondary hover:text-primary text-[10px] font-bold border border-subtle transition-colors flex items-center gap-1 active:scale-[0.97] cursor-pointer"
                >
                  {copiedKey === 'proxy' ? <Check className="w-3 h-3 text-callout-success-fg" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'proxy' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="text-[11px] font-mono text-callout-warn-fg overflow-x-auto whitespace-pre-wrap select-all">
                <span className="sr-only">{commands.proxychainsSnippet}</span>
                <span aria-hidden="true">
                  <SyntaxHighlightedCommand command={commands.proxychainsSnippet} />
                </span>
              </div>
            </div>
          )}

          {/* Verification Command */}
          {commands.verificationCommand && (
            <div className="p-2.5 rounded-lg bg-surface-sunken border border-subtle space-y-1.5 machined-edge">
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span className="font-bold uppercase tracking-wider text-callout-info-fg font-sans">
                  4. Connectivity Verification
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(commands.verificationCommand, 'verify')}
                  className="px-2 py-0.5 rounded bg-surface-elevated hover:bg-surface-hover text-secondary hover:text-primary text-[10px] font-bold border border-subtle transition-colors flex items-center gap-1 active:scale-[0.97] cursor-pointer"
                >
                  {copiedKey === 'verify' ? <Check className="w-3 h-3 text-callout-success-fg" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'verify' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="text-[11px] font-mono text-callout-info-fg overflow-x-auto whitespace-pre-wrap select-all">
                <SyntaxHighlightedCommand command={commands.verificationCommand} />
              </div>
            </div>
          )}
        </div>

        {/* Operator Notes */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-200 mb-1 font-sans">
            Pivot Notes & Credentials
          </label>
          <textarea
            rows={2}
            value={edgeNotes}
            onChange={(e) => setEdgeNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add operational notes (e.g. ssh user/pass, pivoting interface, subnet notes)..."
            className="w-full p-2 rounded-lg bg-surface-card border border-subtle text-primary text-xs focus:outline-none focus:border-accent resize-none font-mono"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-subtle bg-surface-card/60 flex items-center justify-between gap-2 machined-edge">
        <button
          type="button"
          onClick={handleDelete}
          className="px-3 py-1.5 rounded-lg text-callout-danger-fg hover:bg-rose-500/10 border border-rose-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 active:scale-[0.97] cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Vector</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg bg-surface-card hover:bg-surface-hover border border-subtle text-primary text-xs font-bold transition-colors active:scale-[0.97] cursor-pointer"
        >
          Done
        </button>
      </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
