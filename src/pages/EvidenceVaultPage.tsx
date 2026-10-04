import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  Search, 
  Plus, 
  Download, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Trash2, 
  ExternalLink, 
  Key, 
  Flag, 
  Terminal, 
  ShieldCheck, 
  Server, 
  FileText,
  Filter,
  X,
  Sparkles,
  Lock,
  Unlock
} from 'lucide-react';
import { useCtfStore } from '../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { PlatformBadge, PlatformIcon } from '../components/common/PlatformBadge';
import { EditableIpBadge } from '../components/common/EditableIpBadge';
import { playCyberSound, safeCopyToClipboard } from '../utils/helpers';
import { Platform } from '../types';
import { LootTimeline } from '../components/loot/LootTimeline';
import { AddLootModal } from '../components/loot/AddLootModal';
import { ExportLootDrawer } from '../components/loot/ExportLootDrawer';
import { MODAL_ASYMMETRIC_TRANSITION } from '../utils/motionTokens';
import { confirmAction } from '../store/useConfirmStore';

export type EvidenceCategory = 'all' | 'flag' | 'password' | 'hash' | 'ssh_key' | 'token' | 'service';

export interface VaultEvidenceItem {
  id: string;
  targetId: string;
  targetName: string;
  targetIp: string;
  platform: Platform;
  category: EvidenceCategory;
  typeLabel: string;
  username: string;
  secret: string;
  discoveredAt: string;
  notes: string;
  isCustom?: boolean;
}

export const STORAGE_KEY_CUSTOM_LOOT = 'zerobox_vault_custom_loot_v1';

export const getVaultCustomLootStorageKey = (profileId: string = 'guest'): string => {
  const pid = profileId || 'guest';
  const specificKey = `zerobox_vault_custom_loot_v1_${pid}`;
  if (typeof window !== 'undefined') {
    const specific = localStorage.getItem(specificKey);
    if (specific) return specificKey;
    const legacy = localStorage.getItem(STORAGE_KEY_CUSTOM_LOOT);
    if (legacy) return STORAGE_KEY_CUSTOM_LOOT;
  }
  return specificKey;
};

export const formatIsoTimestamp = (dateInput: string | number | Date): string => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'UNKNOWN';
  return d.toISOString().replace('T', ' ').substring(0, 19) + 'Z';
};

export const EvidenceVaultPage: React.FC = () => {
  const navigate = useNavigate();

  const { machines, globalVars, soundEnabled, currentProfileId } = useCtfStore(
    useShallow((s) => ({
      machines: s.machines,
      globalVars: s.globalVars,
      soundEnabled: s.soundEnabled,
      currentProfileId: s.currentProfileId,
    }))
  );

  // Custom user-logged credentials partitioned per operator
  const [customLoot, setCustomLoot] = useState<VaultEvidenceItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const key = getVaultCustomLootStorageKey(currentProfileId);
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const prevProfileIdRef = useRef(currentProfileId);

  // Load custom loot when profile changes; persist only when editing current profile
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (prevProfileIdRef.current !== currentProfileId) {
      // Profile switched: load new profile data without saving stale in-memory state
      prevProfileIdRef.current = currentProfileId;
      try {
        const key = getVaultCustomLootStorageKey(currentProfileId);
        const stored = localStorage.getItem(key);
        setCustomLoot(stored ? JSON.parse(stored) : []);
      } catch {
        setCustomLoot([]);
      }
      return;
    }

    // Persist edits to the active profile
    try {
      const pid = currentProfileId || 'guest';
      const key = `zerobox_vault_custom_loot_v1_${pid}`;
      localStorage.setItem(key, JSON.stringify(customLoot));
    } catch (err) {
      console.error('Failed to persist vault loot:', err);
    }
  }, [customLoot, currentProfileId]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EvidenceCategory>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  // Secret visibility toggle state
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [allRevealed, setAllRevealed] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Loot Modal & Export Drawer state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExportDrawerOpen, setIsExportDrawerOpen] = useState(false);

  // 1. Dynamic aggregation from Machine data + global variables + custom loot
  const evidenceItems = useMemo<VaultEvidenceItem[]>(() => {
    const items: VaultEvidenceItem[] = [];

    machines.forEach((m) => {
      // User Flag
      if (m.userFlag || m.userPwnedAt) {
        items.push({
          id: `${m.id}-flag-user`,
          targetId: m.id,
          targetName: m.name,
          targetIp: m.ip,
          platform: m.platform,
          category: 'flag',
          typeLabel: 'User Flag',
          username: 'user',
          secret: m.userFlag || 'FLAG_CAPTURED',
          discoveredAt: m.userPwnedAt || m.updatedAt || new Date().toISOString(),
          notes: 'Standard user foothold proof captured on target',
        });
      }

      // Root Flag
      if (m.rootFlag || m.rootPwnedAt) {
        items.push({
          id: `${m.id}-flag-root`,
          targetId: m.id,
          targetName: m.name,
          targetIp: m.ip,
          platform: m.platform,
          category: 'flag',
          typeLabel: 'Root Flag',
          username: m.os === 'Windows' ? 'SYSTEM' : 'root',
          secret: m.rootFlag || 'FLAG_CAPTURED',
          discoveredAt: m.rootPwnedAt || m.updatedAt || new Date().toISOString(),
          notes: 'System/Root administrative proof captured on target',
        });
      }

      // Discovered open services / CVE intelligence
      if (m.services && m.services.length > 0) {
        m.services.forEach((s) => {
          items.push({
            id: `${m.id}-svc-${s.port}-${s.protocol}`,
            targetId: m.id,
            targetName: m.name,
            targetIp: m.ip,
            platform: m.platform,
            category: 'service',
            typeLabel: `${s.protocol.toUpperCase()} ${s.port}`,
            username: s.service,
            secret: s.version || `${s.service} (port ${s.port})`,
            discoveredAt: m.updatedAt || new Date().toISOString(),
            notes: s.cveNotes || s.suggestedTools?.join(', ') || 'Discovered target service port',
          });
        });
      }
    });

    // Custom loot entries
    customLoot.forEach((cl) => {
      items.push(cl);
    });

    return items;
  }, [machines, customLoot]);

  // 2. Filtered items
  const filteredItems = useMemo(() => {
    return evidenceItems.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Platform filter
      if (selectedPlatform !== 'all' && item.platform !== selectedPlatform) {
        return false;
      }

      // Target machine filter
      if (selectedTargetId !== 'all' && item.targetId !== selectedTargetId) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.targetName.toLowerCase().includes(q);
        const matchesIp = item.targetIp.toLowerCase().includes(q);
        const matchesUser = item.username.toLowerCase().includes(q);
        const matchesSecret = item.secret.toLowerCase().includes(q);
        const matchesNotes = item.notes.toLowerCase().includes(q);
        const matchesType = item.typeLabel.toLowerCase().includes(q);
        if (!matchesName && !matchesIp && !matchesUser && !matchesSecret && !matchesNotes && !matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [evidenceItems, selectedCategory, selectedPlatform, selectedTargetId, searchQuery]);

  // Metrics KPI calculations
  const metrics = useMemo(() => {
    let flags = 0;
    let passwords = 0;
    let hashes = 0;
    let keys = 0;
    let tokens = 0;
    let services = 0;

    evidenceItems.forEach((item) => {
      if (item.category === 'flag') flags++;
      else if (item.category === 'password') passwords++;
      else if (item.category === 'hash') hashes++;
      else if (item.category === 'ssh_key') keys++;
      else if (item.category === 'token') tokens++;
      else if (item.category === 'service') services++;
    });

    return { total: evidenceItems.length, flags, passwords, hashes, keys, tokens, services };
  }, [evidenceItems]);

  // Actions
  const handleToggleReveal = useCallback((id: string) => {
    setRevealedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
    if (soundEnabled) playCyberSound('toggle');
  }, [soundEnabled]);

  const handleToggleAllRevealed = useCallback(() => {
    const nextState = !allRevealed;
    setAllRevealed(nextState);
    const updated: Record<string, boolean> = {};
    evidenceItems.forEach((i) => {
      updated[i.id] = nextState;
    });
    setRevealedIds(updated);
    if (soundEnabled) playCyberSound('toggle');
  }, [allRevealed, evidenceItems, soundEnabled]);

  const handleCopy = useCallback(async (text: string, id: string) => {
    const success = await safeCopyToClipboard(text);
    if (success) {
      setCopiedId(id);
      if (soundEnabled) playCyberSound('copy');
      setTimeout(() => setCopiedId(null), 1800);
    }
  }, [soundEnabled]);

  const handleSaveCustomLoot = useCallback((newItem: VaultEvidenceItem) => {
    setCustomLoot((prev) => [newItem, ...prev]);
  }, []);

  const handleDeleteCustomLoot = useCallback(async (id: string) => {
    const ok = await confirmAction({
      title: 'Delete this custom loot entry?',
      body: 'The entry will be permanently removed from the vault.',
      confirmLabel: 'Delete entry',
      tone: 'danger',
    });
    if (!ok) return;
    setCustomLoot((prev) => prev.filter((i) => i.id !== id));
    if (soundEnabled) playCyberSound('toggle');
  }, [soundEnabled]);

  // Export to CSV (RFC 4180)
  const handleExportCsv = useCallback(() => {
    const headers = ['Target', 'IP', 'Platform', 'Category', 'Type', 'Identity/Username', 'Secret', 'DiscoveredAt', 'Notes'];
    const rows = filteredItems.map((item) => [
      `"${item.targetName.replace(/"/g, '""')}"`,
      `"${item.targetIp.replace(/"/g, '""')}"`,
      `"${item.platform}"`,
      `"${item.category}"`,
      `"${item.typeLabel}"`,
      `"${item.username.replace(/"/g, '""')}"`,
      `"${item.secret.replace(/"/g, '""')}"`,
      `"${item.discoveredAt}"`,
      `"${item.notes.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zerobox-evidence-vault-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (soundEnabled) playCyberSound('click');
  }, [filteredItems, soundEnabled]);

  // Export to JSON
  const handleExportJson = useCallback(() => {
    const payload = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      evidenceCount: filteredItems.length,
      items: filteredItems,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zerobox-evidence-vault-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (soundEnabled) playCyberSound('click');
  }, [filteredItems, soundEnabled]);

  const getCategoryBadgeClass = (category: EvidenceCategory) => {
    switch (category) {
      case 'flag':
        return 'bg-emerald-500/10 text-callout-success-fg border-emerald-500/30';
      case 'password':
        return 'bg-amber-500/10 text-callout-warn-fg border-amber-500/30';
      case 'hash':
        return 'bg-purple-500/10 text-callout-tip-fg border-purple-500/30';
      case 'ssh_key':
        return 'bg-cyan-500/10 text-callout-info-fg border-cyan-500/30';
      case 'token':
        return 'bg-blue-500/10 text-callout-info-fg border-blue-500/30';
      case 'service':
        return 'bg-slate-500/10 text-tertiary border-slate-500/30';
      default:
        return 'bg-slate-500/10 text-tertiary border-slate-500/30';
    }
  };

  return (
    <div className="w-full space-y-5 font-sans text-text-primary pb-12" data-testid="evidence-vault-page">
      {/* 1. Header & Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-callout-warn-fg border border-amber-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>EVIDENCE & LOOT VAULT</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyber-cyan/15 text-callout-info-fg border border-cyber-cyan/30 font-bold font-mono tabular-nums">
                  {metrics.total} ARTIFACTS
                </span>
              </h1>
              <p className="text-xs text-tertiary mt-0.5 font-sans">
                Centralized credential locker, captured flags, NT/Kerberos hashes, SSH keys, and target recon intelligence.
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 flex-wrap font-sans">
          {/* View Mode Toggle: Table vs Kill-Chain Timeline */}
          <div className="flex items-center p-1 rounded-xl bg-surface-base border border-subtle machined-edge">
            <button
              type="button"
              onClick={() => {
                setViewMode('table');
                if (soundEnabled) playCyberSound('click');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-[0.97] cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-cyber-emerald text-black shadow-xs'
                  : 'text-tertiary hover:text-slate-900 dark:hover:text-primary'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>TABLE VIEW</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('timeline');
                if (soundEnabled) playCyberSound('click');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-[0.97] cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-cyber-emerald text-black shadow-xs'
                  : 'text-tertiary hover:text-slate-900 dark:hover:text-primary'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>KILL-CHAIN TIMELINE</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleToggleAllRevealed}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-card hover:bg-slate-100 dark:hover:bg-cyber-cardHover border border-subtle text-slate-700 dark:text-zinc-300 font-bold text-xs transition-colors cursor-pointer shadow-xs active:scale-[0.97] machined-edge"
            title={allRevealed ? 'Mask all secrets' : 'Reveal all secrets'}
          >
            {allRevealed ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 text-callout-warn-fg" />}
            <span>{allRevealed ? 'MASK ALL' : 'REVEAL ALL'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExportDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-card hover:bg-slate-100 dark:hover:bg-cyber-cardHover border border-subtle text-slate-700 dark:text-zinc-300 font-bold text-xs transition-colors cursor-pointer shadow-xs active:scale-[0.97] machined-edge"
            title="Open Evidence Vault Exporter Drawer"
          >
            <Download className="w-3.5 h-3.5 text-callout-info-fg" />
            <span>EXPORT LOOT</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-card hover:bg-slate-100 dark:hover:bg-cyber-cardHover border border-subtle text-slate-700 dark:text-zinc-300 font-bold text-xs transition-colors cursor-pointer shadow-xs active:scale-[0.97] machined-edge"
            title="Export evidence to CSV format"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-card hover:bg-slate-100 dark:hover:bg-cyber-cardHover border border-subtle text-slate-700 dark:text-zinc-300 font-bold text-xs transition-colors cursor-pointer shadow-xs active:scale-[0.97] machined-edge"
            title="Export evidence to JSON format"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyber-emerald text-slate-900 font-bold text-xs transition-[transform,box-shadow,background-color,border-color,color] hover:bg-emerald-400 active:scale-[0.97] cursor-pointer shadow-xs ml-1 machined-edge"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>LOG EVIDENCE</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl border border-subtle bg-surface-card shadow-xs machined-edge">
          <div className="text-[10px] text-tertiary uppercase font-bold tracking-wider">TOTAL ARTIFACTS</div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono tabular-nums">{metrics.total}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-subtle bg-surface-card shadow-xs machined-edge">
          <div className="text-[10px] text-callout-success-fg uppercase font-bold tracking-wider flex items-center justify-between">
            <span>PROVED FLAGS</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-xl font-extrabold text-callout-success-fg mt-1 font-mono tabular-nums">{metrics.flags}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-subtle bg-surface-card shadow-xs machined-edge">
          <div className="text-[10px] text-callout-warn-fg uppercase font-bold tracking-wider flex items-center justify-between">
            <span>PASSWORDS</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-xl font-extrabold text-callout-warn-fg mt-1 font-mono tabular-nums">{metrics.passwords}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-subtle bg-surface-card shadow-xs machined-edge">
          <div className="text-[10px] text-callout-tip-fg uppercase font-bold tracking-wider flex items-center justify-between">
            <span>HASHES</span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          </div>
          <div className="text-xl font-extrabold text-callout-tip-fg mt-1 font-mono tabular-nums">{metrics.hashes}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-subtle bg-surface-card shadow-xs machined-edge">
          <div className="text-[10px] text-callout-info-fg uppercase font-bold tracking-wider flex items-center justify-between">
            <span>SSH KEYS</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
          </div>
          <div className="text-xl font-extrabold text-callout-info-fg mt-1 font-mono tabular-nums">{metrics.keys}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-subtle bg-surface-card shadow-xs machined-edge">
          <div className="text-[10px] text-tertiary uppercase font-bold tracking-wider flex items-center justify-between">
            <span>RECON SERVICES</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          </div>
          <div className="text-xl font-extrabold text-slate-700 dark:text-zinc-300 mt-1 font-mono tabular-nums">{metrics.services}</div>
        </div>
      </div>

      {/* 3. Search and Category Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-xl border border-subtle bg-surface-card shadow-xs machined-edge">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search credentials, target name, IP, username, hash, port..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-surface-base border border-subtle text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-cyber-cyan font-sans"
          />
          {searchQuery && (
            <button aria-label="Clear search"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-slate-600 dark:hover:text-primary cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(['all', 'flag', 'password', 'hash', 'ssh_key', 'token', 'service'] as EvidenceCategory[]).map((cat) => {
            const isSelected = selectedCategory === cat;
            const labels: Record<EvidenceCategory, string> = {
              all: 'ALL ARTIFACTS',
              flag: 'FLAGS',
              password: 'PASSWORDS',
              hash: 'HASHES',
              ssh_key: 'SSH KEYS',
              token: 'TOKENS',
              service: 'SERVICES',
            };
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all whitespace-nowrap active:scale-[0.97] cursor-pointer ${
                  isSelected
                    ? 'bg-cyber-cyan text-slate-900 font-extrabold shadow-xs'
                    : 'bg-surface-base border border-subtle text-tertiary hover:text-slate-900 dark:hover:text-primary'
                }`}
              >
                {labels[cat]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Evidence View (Timeline vs Data Table) */}
      {viewMode === 'timeline' ? (
        <LootTimeline
          items={filteredItems}
          revealedIds={revealedIds}
          onToggleReveal={handleToggleReveal}
          copiedId={copiedId}
          onCopy={handleCopy}
          onDeleteCustom={handleDeleteCustomLoot}
          soundEnabled={soundEnabled}
        />
      ) : (
        /* Evidence Data Table */
        <div className="rounded-xl border border-subtle bg-surface-card overflow-hidden shadow-xs machined-edge">
          <div className="overflow-x-auto max-h-[calc(100vh-320px)]">
            <table className="w-full text-left border-collapse min-w-[960px]">
              <thead className="sticky top-0 z-10 bg-surface-base border-b border-subtle uppercase text-[10px] text-tertiary font-bold tracking-wider machined-edge">
                <tr>
                  <th className="py-3 px-4">TARGET</th>
                  <th className="py-3 px-3">CATEGORY</th>
                  <th className="py-3 px-3">PRINCIPAL / USER</th>
                  <th className="py-3 px-4 min-w-[320px]">SECRET VALUE / PROOF</th>
                  <th className="py-3 px-3">DISCOVERED</th>
                  <th className="py-3 px-4 text-right pr-6">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-cyber-border">
                {filteredItems.map((item) => {
                  const isRevealed = Boolean(revealedIds[item.id] || allRevealed);
                  const isCopied = copiedId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-cyber-cardHover transition-colors group font-mono text-xs"
                    >
                      {/* Target Information */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <PlatformIcon platform={item.platform} className="w-3.5 h-3.5 flex-shrink-0" />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{item.targetName}</span>
                              {item.isCustom && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-callout-warn-fg border border-amber-500/30 font-bold">
                                  CUSTOM
                                </span>
                              )}
                            </div>
                            <EditableIpBadge machineId={item.targetId} initialIp={item.targetIp} size="xs" className="mt-0.5 tabular-nums" />
                          </div>
                        </div>
                      </td>

                      {/* Category & Type */}
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(item.category)}`}>
                          {item.typeLabel}
                        </span>
                      </td>

                      {/* Principal / Identity */}
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800 dark:text-zinc-200 bg-surface-base px-2 py-1 rounded border border-subtle text-[11px]">
                          {item.username || 'N/A'}
                        </span>
                      </td>

                      {/* Secret Value (Masked by default) */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-md bg-surface-base border border-subtle rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-800 dark:text-zinc-200 select-all overflow-hidden text-ellipsis whitespace-nowrap tabular-nums">
                            {isRevealed ? item.secret : '••••••••••••••••••••••••'}
                          </div>
                          <button aria-label={isRevealed ? 'Mask secret' : 'Reveal secret'}
                            type="button"
                            onClick={() => handleToggleReveal(item.id)}
                            className="p-1.5 rounded-md hover:bg-surface-base text-tertiary hover:text-slate-800 dark:hover:text-primary transition-colors cursor-pointer active:scale-[0.97]"
                            title={isRevealed ? 'Mask secret' : 'Reveal secret'}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Discovered timestamp */}
                      <td className="py-2.5 px-3 text-[10px] font-mono text-tertiary whitespace-nowrap tabular-nums">
                        {formatIsoTimestamp(item.discoveredAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <button aria-label="Copy secret to clipboard"
                            type="button"
                            onClick={() => handleCopy(item.secret, item.id)}
                            className={`p-1.5 rounded-md border text-xs font-bold transition-all cursor-pointer active:scale-[0.97] ${
                              isCopied
                                ? 'bg-cyber-emerald text-slate-900 border-cyber-emerald'
                                : 'bg-surface-base border-subtle text-slate-600 dark:text-zinc-300 hover:border-cyber-cyan hover:text-callout-info-fg'
                            }`}
                            title="Copy secret to clipboard"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          {item.targetId && item.targetId !== 'global' && (
                            <button aria-label="Inspect target details"
                              type="button"
                              onClick={() => navigate(`/target/${item.targetId}`)}
                              className="p-1.5 rounded-md border border-subtle bg-surface-base text-slate-600 dark:text-zinc-300 hover:border-cyber-cyan hover:text-callout-info-fg transition-colors cursor-pointer active:scale-[0.97]"
                              title="Inspect Target Details"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {item.isCustom && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomLoot(item.id)}
                              className="p-1.5 rounded-md border border-subtle bg-surface-base text-tertiary hover:text-callout-danger-fg hover:border-rose-500/30 transition-colors cursor-pointer active:scale-[0.97]"
                              title="Delete custom loot entry"
                              aria-label="Delete custom loot entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-tertiary">
                      <Database className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-zinc-600" />
                      <div className="font-bold text-sm">NO EVIDENCE RECORDED MATCHING FILTERS</div>
                      <div className="text-xs mt-1">Submit flags, import Nmap scans, or click "LOG EVIDENCE" to record target loot.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Add Custom Loot Modal & Export Drawer */}
      <AddLootModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveCustomLoot}
        machines={machines}
        soundEnabled={soundEnabled}
      />

      <ExportLootDrawer
        isOpen={isExportDrawerOpen}
        onClose={() => setIsExportDrawerOpen(false)}
        items={evidenceItems}
        filteredItems={filteredItems}
        soundEnabled={soundEnabled}
      />
    </div>
  );
};

export default EvidenceVaultPage;
