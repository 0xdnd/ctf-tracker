import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Search, Plus, Download, Copy, Check, Eye, EyeOff, Trash2, ExternalLink, FileText, Filter, X, Lock, Unlock } from 'lucide-react';
import { useCtfStore } from '../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { PlatformIcon } from '../components/common/PlatformBadge';
import { PageHeader } from '../components/common/PageHeader';
import { CyberButton } from '../components/common/CyberButton';
import { CyberBadge } from '../components/common/CyberBadge';
import { EditableIpBadge } from '../components/common/EditableIpBadge';
import { playCyberSound, safeCopyToClipboard } from '../utils/helpers';
import { Platform } from '../types';
import { LootTimeline } from '../components/loot/LootTimeline';
import { AddLootModal } from '../components/loot/AddLootModal';
import { ExportLootDrawer } from '../components/loot/ExportLootDrawer';
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
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const getCategoryVariant = (category: EvidenceCategory): 'success' | 'neutral' | 'info' | 'warning' => {
    switch (category) {
      case 'flag':
        return 'success';
      case 'password':
        return 'warning';
      case 'ssh_key':
      case 'token':
        return 'info';
      default:
        return 'neutral';
    }
  };

  const categoryLabels: Record<EvidenceCategory, string> = {
    all: 'All',
    flag: 'Flags',
    password: 'Passwords',
    hash: 'Hashes',
    ssh_key: 'SSH keys',
    token: 'Tokens',
    service: 'Services',
  };

  const activeFilterCount = selectedCategory !== 'all' ? 1 : 0;

  const statTiles: { label: string; value: number }[] = [
    { label: 'Total artifacts', value: metrics.total },
    { label: 'Flags captured', value: metrics.flags },
    { label: 'Passwords', value: metrics.passwords },
    { label: 'Hashes', value: metrics.hashes },
    { label: 'SSH keys', value: metrics.keys },
    { label: 'Recon services', value: metrics.services },
  ];

  const segBase =
    'flex items-center gap-1.5 px-3 h-8 max-sm:h-11 rounded-md text-xs font-medium transition-[transform,background-color,color] active:scale-[0.97] cursor-pointer whitespace-nowrap';

  return (
    <div className="w-full space-y-6 font-sans text-primary pb-12" data-testid="evidence-vault-page">
      {/* 1. Page header */}
      <PageHeader
        title="Evidence vault"
        description="Credentials, flags, hashes, keys and recon findings across your targets."
        icon={<Database />}
        primaryAction={
          <CyberButton
            variant="primary"
            size="md"
            className="max-sm:h-11 max-sm:flex-1"
            iconLeft={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Log evidence
          </CyberButton>
        }
        actions={
          <>
            <CyberButton
              variant="secondary"
              size="md"
              onClick={handleToggleAllRevealed}
              title={allRevealed ? 'Mask all secrets' : 'Reveal all secrets'}
              iconLeft={allRevealed ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            >
              {allRevealed ? 'Mask all' : 'Reveal all'}
            </CyberButton>
            <CyberButton
              variant="secondary"
              size="md"
              onClick={() => setIsExportDrawerOpen(true)}
              title="Open the evidence exporter"
              iconLeft={<Download className="w-3.5 h-3.5" />}
            >
              Export loot
            </CyberButton>
          </>
        }
        overflow={[
          {
            id: 'reveal',
            label: allRevealed ? 'Mask all secrets' : 'Reveal all secrets',
            icon: allRevealed ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />,
            onSelect: handleToggleAllRevealed,
          },
          {
            id: 'export-drawer',
            label: 'Export loot',
            icon: <Download className="w-3.5 h-3.5" />,
            onSelect: () => setIsExportDrawerOpen(true),
          },
          {
            id: 'export-csv',
            label: 'Download CSV',
            icon: <Download className="w-3.5 h-3.5" />,
            onSelect: handleExportCsv,
          },
          {
            id: 'export-json',
            label: 'Download JSON',
            icon: <FileText className="w-3.5 h-3.5" />,
            onSelect: handleExportJson,
          },
        ]}
      />

      {/* 2. Stat tiles: one neutral style, mono values, no per-tile hue */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statTiles.map((tile) => (
          <div key={tile.label} className="px-4 py-3 rounded-xl border border-subtle bg-surface-card machined-edge">
            <div className="text-xs text-muted">{tile.label}</div>
            <div className="mt-1 text-xl font-semibold text-primary font-mono tabular-nums">{tile.value}</div>
          </div>
        ))}
      </div>

      {/* 3. Toolbar: one row on desktop; search + Filters at 390px */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search credentials, target name, IP, username, hash, port..."
              className="w-full pl-9 pr-9 h-9 max-sm:h-11 rounded-lg bg-surface-card border border-subtle text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
            />
            {searchQuery && (
              <button
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted hover:text-primary cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category chips: always mounted; collapsed behind Filters below sm */}
          <div
            role="group"
            aria-label="Filter by category"
            className="hidden sm:flex items-center gap-1 overflow-x-auto scrollbar-none"
          >
            {(['all', 'flag', 'password', 'hash', 'ssh_key', 'token', 'service'] as EvidenceCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                aria-pressed={selectedCategory === cat}
                className={`px-2.5 h-8 rounded-md text-xs font-medium transition-[transform,background-color,color] whitespace-nowrap active:scale-[0.97] cursor-pointer ${
 selectedCategory === cat
 ? 'bg-accent text-on-accent'
 : 'text-muted hover:text-primary hover:bg-surface-hover'
 }`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>

          {/* View toggle: table vs kill-chain timeline */}
          <div
            role="group"
            aria-label="Evidence view"
            className="hidden sm:flex items-center p-0.5 rounded-lg bg-surface-sunken border border-subtle flex-shrink-0"
          >
            <button
              type="button"
              aria-pressed={viewMode === 'table'}
              onClick={() => {
                setViewMode('table');
                if (soundEnabled) playCyberSound('click');
              }}
              className={`${segBase} ${viewMode === 'table' ? 'bg-surface-card text-primary shadow-xs' : 'text-muted hover:text-primary'}`}
            >
              Table
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'timeline'}
              onClick={() => {
                setViewMode('timeline');
                if (soundEnabled) playCyberSound('click');
              }}
              className={`${segBase} ${viewMode === 'timeline' ? 'bg-surface-card text-primary shadow-xs' : 'text-muted hover:text-primary'}`}
            >
              Kill-chain timeline
            </button>
          </div>

          {/* Filters disclosure: mobile only */}
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="vault-mobile-filters"
            onClick={() => setFiltersOpen((o) => !o)}
            className="sm:hidden flex items-center gap-1.5 px-3 h-11 rounded-lg border border-subtle bg-surface-card text-sm font-medium text-secondary active:scale-[0.97] cursor-pointer flex-shrink-0"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="font-mono tabular-nums text-xs text-accent">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {/* Mobile filter panel (category + view) */}
        {filtersOpen && (
          <div id="vault-mobile-filters" className="sm:hidden rounded-xl border border-subtle bg-surface-card p-3 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'flag', 'password', 'hash', 'ssh_key', 'token', 'service'] as EvidenceCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  aria-pressed={selectedCategory === cat}
                  className={`px-3 h-11 rounded-lg text-sm font-medium cursor-pointer active:scale-[0.97] ${
 selectedCategory === cat
 ? 'bg-accent text-on-accent'
 : 'bg-surface-sunken text-secondary'
 }`}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-pressed={viewMode === 'table'}
                className={`flex-1 h-11 rounded-lg text-sm font-medium cursor-pointer ${viewMode === 'table' ? 'bg-accent text-on-accent' : 'bg-surface-sunken text-secondary'}`}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                aria-pressed={viewMode === 'timeline'}
                className={`flex-1 h-11 rounded-lg text-sm font-medium cursor-pointer ${viewMode === 'timeline' ? 'bg-accent text-on-accent' : 'bg-surface-sunken text-secondary'}`}
              >
                Timeline
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Evidence view (timeline vs data table / stacked cards below sm) */}
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
        <div className="sm:rounded-xl sm:border sm:border-subtle sm:bg-surface-card sm:overflow-hidden machined-edge">
          <div className="sm:overflow-x-auto sm:max-h-[calc(100vh-320px)]">
            <table role="table" className="block sm:table w-full text-left border-collapse sm:min-w-[960px]">
              <thead
                role="rowgroup"
                className="hidden sm:table-header-group sticky top-0 z-10 bg-surface-base border-b border-subtle text-xs text-muted font-medium"
              >
                <tr role="row">
                  <th role="columnheader" className="py-3 px-4 font-medium">Target</th>
                  <th role="columnheader" className="py-3 px-3 font-medium">Category</th>
                  <th role="columnheader" className="py-3 px-3 font-medium">Principal</th>
                  <th role="columnheader" className="py-3 px-4 min-w-[320px] font-medium">Secret or proof</th>
                  <th role="columnheader" className="py-3 px-3 font-medium">Discovered</th>
                  <th role="columnheader" className="py-3 px-4 text-right pr-6 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody role="rowgroup" className="block sm:table-row-group sm:divide-y sm:divide-subtle max-sm:space-y-3">
                {filteredItems.map((item) => {
                  const isRevealed = Boolean(revealedIds[item.id] || allRevealed);
                  const isCopied = copiedId === item.id;

                  return (
                    <tr
                      key={item.id}
                      role="row"
                      className="group block sm:table-row max-sm:flex max-sm:flex-wrap max-sm:items-center max-sm:gap-x-2 max-sm:gap-y-2 max-sm:p-3 max-sm:rounded-xl max-sm:border max-sm:border-subtle max-sm:bg-surface-card hover:bg-surface-hover transition-colors text-xs"
                    >
                      {/* Target */}
                      <td role="cell" className="block sm:table-cell py-2.5 sm:px-4 max-sm:w-full">
                        <div className="flex items-center gap-2">
                          <PlatformIcon platform={item.platform} className="w-3.5 h-3.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold text-primary flex items-center gap-1.5">
                              <span>{item.targetName}</span>
                              {item.isCustom && (
                                <CyberBadge variant="warning" size="xs">Custom</CyberBadge>
                              )}
                            </div>
                            <EditableIpBadge machineId={item.targetId} initialIp={item.targetIp} size="xs" className="mt-0.5 font-mono tabular-nums" />
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td role="cell" className="block sm:table-cell py-2.5 sm:px-3">
                        <CyberBadge variant={getCategoryVariant(item.category)} size="sm">
                          {item.typeLabel}
                        </CyberBadge>
                      </td>

                      {/* Principal */}
                      <td role="cell" className="block sm:table-cell py-2.5 sm:px-3">
                        <span className="font-medium text-secondary bg-surface-sunken px-2 py-1 rounded border border-subtle text-xs">
                          {item.username || 'N/A'}
                        </span>
                      </td>

                      {/* Secret (masked by default) */}
                      <td role="cell" className="block sm:table-cell py-2.5 sm:px-4 max-sm:w-full">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0 sm:max-w-md bg-surface-sunken border border-subtle rounded-lg px-2.5 py-1.5 font-mono text-xs text-secondary select-all overflow-hidden text-ellipsis whitespace-nowrap tabular-nums">
                            {isRevealed ? item.secret : '••••••••••••••••••••••••'}
                          </div>
                          <button
                            aria-label={isRevealed ? 'Mask secret' : 'Reveal secret'}
                            type="button"
                            onClick={() => handleToggleReveal(item.id)}
                            className="p-1.5 max-sm:p-3 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-colors cursor-pointer active:scale-[0.97]"
                            title={isRevealed ? 'Mask secret' : 'Reveal secret'}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Discovered */}
                      <td role="cell" className="block sm:table-cell py-2.5 sm:px-3 text-xs font-mono text-muted whitespace-nowrap tabular-nums">
                        {formatIsoTimestamp(item.discoveredAt)}
                      </td>

                      {/* Actions: secondary until hover/focus, always visible on touch */}
                      <td role="cell" className="block sm:table-cell py-2.5 sm:px-4 text-right sm:pr-6 max-sm:w-full">
                        <div className="flex items-center justify-end gap-1.5 [@media(hover:hover)_and_(min-width:640px)]:opacity-0 [@media(hover:hover)_and_(min-width:640px)]:group-hover:opacity-100 [@media(hover:hover)_and_(min-width:640px)]:group-focus-within:opacity-100 transition-opacity">
                          <button
                            aria-label="Copy secret to clipboard"
                            type="button"
                            onClick={() => handleCopy(item.secret, item.id)}
                            className={`p-1.5 max-sm:p-3 rounded-md border text-xs font-medium transition-colors cursor-pointer active:scale-[0.97] ${
 isCopied
 ? 'bg-callout-success-bg text-callout-success-fg border-callout-success-border'
 : 'bg-surface-sunken border-subtle text-secondary hover:border-accent hover:text-accent'
 }`}
                            title="Copy secret to clipboard"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          {item.targetId && item.targetId !== 'global' && (
                            <button
                              aria-label="Inspect target details"
                              type="button"
                              onClick={() => navigate(`/target/${item.targetId}`)}
                              className="p-1.5 max-sm:p-3 rounded-md border border-subtle bg-surface-sunken text-secondary hover:border-accent hover:text-accent transition-colors cursor-pointer active:scale-[0.97]"
                              title="Inspect target details"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {item.isCustom && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomLoot(item.id)}
                              className="p-1.5 max-sm:p-3 rounded-md border border-subtle bg-surface-sunken text-muted hover:text-callout-danger-fg hover:border-callout-danger-border transition-colors cursor-pointer active:scale-[0.97]"
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
                  <tr role="row" className="block sm:table-row">
                    <td role="cell" colSpan={6} className="block sm:table-cell py-12 text-center text-muted">
                      <Database className="w-8 h-8 mx-auto mb-2 text-dim" />
                      <div className="font-semibold text-sm text-secondary">No evidence matches these filters</div>
                      <div className="text-xs mt-1 mb-4">Capture a flag, import a scan, or log a credential by hand.</div>
                      <CyberButton variant="primary" size="md" onClick={() => setIsAddModalOpen(true)} iconLeft={<Plus className="w-3.5 h-3.5" />}>
                        Log evidence
                      </CyberButton>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Add custom loot modal & export drawer */}
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
