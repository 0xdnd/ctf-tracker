import React, { useState, useMemo, useCallback, useEffect } from 'react';
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

  // Reload custom loot whenever active profile changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const key = getVaultCustomLootStorageKey(currentProfileId);
      const stored = localStorage.getItem(key);
      setCustomLoot(stored ? JSON.parse(stored) : []);
    } catch {
      setCustomLoot([]);
    }
  }, [currentProfileId]);

  // Save custom loot to local persistence for current operator
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const pid = currentProfileId || 'guest';
      const key = `zerobox_vault_custom_loot_v1_${pid}`;
      localStorage.setItem(key, JSON.stringify(customLoot));
    } catch {}
  }, [customLoot, currentProfileId]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EvidenceCategory>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('all');

  // Secret visibility toggle state
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [allRevealed, setAllRevealed] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Loot Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalTargetId, setModalTargetId] = useState<string>('');
  const [modalCategory, setModalCategory] = useState<EvidenceCategory>('password');
  const [modalUsername, setModalUsername] = useState('');
  const [modalSecret, setModalSecret] = useState('');
  const [modalNotes, setModalNotes] = useState('');

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

  const handleAddCustomLoot = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!modalSecret.trim()) return;

    const targetMachine = machines.find((m) => m.id === modalTargetId) || machines[0];
    const categoryLabels: Record<EvidenceCategory, string> = {
      all: 'Loot',
      flag: 'Proof Flag',
      password: 'Plaintext Password',
      hash: 'Password Hash',
      ssh_key: 'SSH Private Key',
      token: 'Access Token / Secret',
      service: 'Service Endpoint',
    };

    const newLoot: VaultEvidenceItem = {
      id: `custom-loot-${Date.now()}`,
      targetId: targetMachine?.id || 'global',
      targetName: targetMachine?.name || 'Global Environment',
      targetIp: targetMachine?.ip || globalVars.targetIp || '127.0.0.1',
      platform: targetMachine?.platform || 'Custom',
      category: modalCategory,
      typeLabel: categoryLabels[modalCategory] || 'Credential',
      username: modalUsername.trim() || 'operator',
      secret: modalSecret.trim(),
      discoveredAt: new Date().toISOString(),
      notes: modalNotes.trim() || 'Manually logged during target engagement',
      isCustom: true,
    };

    setCustomLoot((prev) => [newLoot, ...prev]);
    setIsAddModalOpen(false);
    setModalSecret('');
    setModalUsername('');
    setModalNotes('');
    if (soundEnabled) playCyberSound('flag');
  }, [modalSecret, modalTargetId, modalCategory, modalUsername, modalNotes, machines, globalVars.targetIp, soundEnabled]);

  const handleDeleteCustomLoot = useCallback((id: string) => {
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
        return 'bg-emerald-500/10 text-emerald-600 dark:text-cyber-emerald border-emerald-500/30';
      case 'password':
        return 'bg-amber-500/10 text-amber-600 dark:text-cyber-amber border-amber-500/30';
      case 'hash':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'ssh_key':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyber-cyan border-cyan-500/30';
      case 'token':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'service':
        return 'bg-slate-500/10 text-slate-600 dark:text-zinc-400 border-slate-500/30';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-zinc-400 border-slate-500/30';
    }
  };

  return (
    <div className="w-full space-y-5 font-mono pb-12" data-testid="evidence-vault-page">
      {/* 1. Header & Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-cyber-amber border border-amber-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>EVIDENCE & LOOT VAULT</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30 font-bold">
                  {metrics.total} ARTIFACTS
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Centralized credential locker, captured flags, NT/Kerberos hashes, SSH keys, and target recon intelligence.
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleToggleAllRevealed}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-card hover:bg-slate-100 dark:hover:bg-cyber-cardHover border border-subtle text-slate-700 dark:text-zinc-300 font-bold text-xs transition-colors cursor-pointer shadow-xs"
            title={allRevealed ? 'Mask all secrets' : 'Reveal all secrets'}
          >
            {allRevealed ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 text-amber-500" />}
            <span>{allRevealed ? 'MASK ALL' : 'REVEAL ALL'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-card hover:bg-slate-100 dark:hover:bg-cyber-cardHover border border-subtle text-slate-700 dark:text-zinc-300 font-bold text-xs transition-colors cursor-pointer shadow-xs"
            title="Export evidence to CSV format"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-card hover:bg-slate-100 dark:hover:bg-cyber-cardHover border border-subtle text-slate-700 dark:text-zinc-300 font-bold text-xs transition-colors cursor-pointer shadow-xs"
            title="Export evidence to JSON format"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyber-emerald text-slate-900 font-bold text-xs transition-[transform,box-shadow,background-color,border-color,color] hover:bg-emerald-400 active:scale-[0.98] cursor-pointer shadow-xs ml-1"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>LOG EVIDENCE</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl border border-subtle bg-surface-card shadow-xs">
          <div className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold tracking-wider">TOTAL ARTIFACTS</div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{metrics.total}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 shadow-xs">
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider">PROVED FLAGS</div>
          <div className="text-xl font-extrabold text-emerald-600 dark:text-cyber-emerald mt-1">{metrics.flags}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 shadow-xs">
          <div className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold tracking-wider">PASSWORDS</div>
          <div className="text-xl font-extrabold text-amber-600 dark:text-cyber-amber mt-1">{metrics.passwords}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 shadow-xs">
          <div className="text-[10px] text-purple-600 dark:text-purple-400 uppercase font-bold tracking-wider">HASHES</div>
          <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">{metrics.hashes}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 shadow-xs">
          <div className="text-[10px] text-cyan-600 dark:text-cyan-400 uppercase font-bold tracking-wider">SSH KEYS</div>
          <div className="text-xl font-extrabold text-cyan-600 dark:text-cyber-cyan mt-1">{metrics.keys}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-subtle bg-surface-card shadow-xs">
          <div className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold tracking-wider">RECON SERVICES</div>
          <div className="text-xl font-extrabold text-slate-700 dark:text-zinc-300 mt-1">{metrics.services}</div>
        </div>
      </div>

      {/* 3. Search and Category Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-xl border border-subtle bg-surface-card shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search credentials, target name, IP, username, hash, port..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-surface-base border border-subtle text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-cyber-cyan"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(['all', 'flag', 'password', 'hash', 'ssh_key', 'service'] as EvidenceCategory[]).map((cat) => {
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
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-cyber-cyan text-slate-900 font-extrabold shadow-xs'
                    : 'bg-surface-base border border-subtle text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {labels[cat]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Evidence Data Table */}
      <div className="rounded-xl border border-subtle bg-surface-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[calc(100vh-320px)]">
          <table className="w-full text-left border-collapse min-w-[960px]">
            <thead className="sticky top-0 z-10 bg-surface-base border-b border-subtle uppercase text-[10px] text-slate-500 dark:text-zinc-400 font-bold tracking-wider">
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
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30">
                                CUSTOM
                              </span>
                            )}
                          </div>
                          <EditableIpBadge machineId={item.targetId} initialIp={item.targetIp} size="xs" className="mt-0.5" />
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
                        <div className="flex-1 max-w-md bg-surface-base border border-subtle rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-800 dark:text-zinc-200 select-all overflow-hidden text-ellipsis whitespace-nowrap">
                          {isRevealed ? item.secret : '••••••••••••••••••••••••'}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleReveal(item.id)}
                          className="p-1.5 rounded-md hover:bg-surface-base text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                          title={isRevealed ? 'Mask secret' : 'Reveal secret'}
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    {/* Discovered timestamp */}
                    <td className="py-2.5 px-3 text-[10px] text-slate-400 dark:text-zinc-500">
                      {new Date(item.discoveredAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopy(item.secret, item.id)}
                          className={`p-1.5 rounded-md border text-xs font-bold transition-colors cursor-pointer ${
                            isCopied
                              ? 'bg-cyber-emerald text-slate-900 border-cyber-emerald'
                              : 'bg-surface-base border-subtle text-slate-600 dark:text-zinc-300 hover:border-cyber-cyan hover:text-cyber-cyan'
                          }`}
                          title="Copy secret to clipboard"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        {item.targetId && item.targetId !== 'global' && (
                          <button
                            type="button"
                            onClick={() => navigate(`/target/${item.targetId}`)}
                            className="p-1.5 rounded-md border border-subtle bg-surface-base text-slate-600 dark:text-zinc-300 hover:border-cyber-cyan hover:text-cyber-cyan transition-colors cursor-pointer"
                            title="Inspect Target Details"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {item.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomLoot(item.id)}
                            className="p-1.5 rounded-md border border-subtle bg-surface-base text-slate-400 hover:text-rose-500 hover:border-rose-500/30 transition-colors cursor-pointer"
                            title="Delete custom loot entry"
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
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-zinc-500">
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

      {/* 5. Add Custom Loot Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-xl border border-subtle bg-surface-card p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-subtle pb-3">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Database className="w-4 h-4 text-cyber-cyan" />
                  <span>LOG NEW EVIDENCE & LOOT</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddCustomLoot} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    TARGET MACHINE
                  </label>
                  <select
                    value={modalTargetId}
                    onChange={(e) => setModalTargetId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-base border border-subtle text-slate-900 dark:text-white focus:outline-hidden focus:border-cyber-cyan"
                  >
                    <option value="">Global / Unscoped Loot</option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.ip || 'No IP'}) — {m.platform}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      CATEGORY
                    </label>
                    <select
                      value={modalCategory}
                      onChange={(e) => setModalCategory(e.target.value as EvidenceCategory)}
                      className="w-full px-3 py-2 rounded-lg bg-surface-base border border-subtle text-slate-900 dark:text-white focus:outline-hidden focus:border-cyber-cyan"
                    >
                      <option value="password">Password (Plaintext)</option>
                      <option value="hash">Hash (NTLM, SHA, bcrypt)</option>
                      <option value="ssh_key">SSH Private Key</option>
                      <option value="token">Token / API Key / Secret</option>
                      <option value="flag">CTF Flag Proof</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      USERNAME / IDENTITY
                    </label>
                    <input
                      type="text"
                      value={modalUsername}
                      onChange={(e) => setModalUsername(e.target.value)}
                      placeholder="e.g. Administrator, root"
                      className="w-full px-3 py-2 rounded-lg bg-surface-base border border-subtle text-slate-900 dark:text-white focus:outline-hidden focus:border-cyber-cyan"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    SECRET VALUE / KEY <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={modalSecret}
                    onChange={(e) => setModalSecret(e.target.value)}
                    placeholder="Paste password, hash string, or SSH private key..."
                    className="w-full px-3 py-2 rounded-lg bg-surface-base border border-subtle text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-cyber-cyan resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    TACTICAL NOTES & CONTEXT
                  </label>
                  <input
                    type="text"
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder="e.g. Dumped via Mimikatz sekurlsa::logonpasswords"
                    className="w-full px-3 py-2 rounded-lg bg-surface-base border border-subtle text-slate-900 dark:text-white focus:outline-hidden focus:border-cyber-cyan"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-subtle">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-subtle text-slate-600 dark:text-zinc-300 font-bold hover:bg-surface-base cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-cyber-emerald text-slate-900 font-bold hover:bg-emerald-400 cursor-pointer shadow-xs"
                  >
                    Save to Vault
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EvidenceVaultPage;
