import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Server, Lock } from 'lucide-react';
import { useCtfStore, KNOWN_ACTIVE_SEASONAL_NAMES } from '../../store/useCtfStore';
import { Platform, OperatingSystem, Difficulty } from '../../types';
import { playCyberSound, sanitizeExternalUrl } from '../../utils/helpers';
import { OsBadge, OsIcon } from '../common/OsBadge';
import { PlatformIcon } from '../common/PlatformBadge';
import { CyberSelect, CyberSelectOption } from '../common/CyberSelect';

const PLATFORM_OPTIONS: CyberSelectOption<Platform>[] = [
  { value: 'HTB', label: 'Hack The Box', icon: <PlatformIcon platform="HTB" /> },
  { value: 'THM', label: 'TryHackMe', icon: <PlatformIcon platform="THM" /> },
  { value: 'Custom', label: 'Custom / Private Lab', icon: <PlatformIcon platform="Custom" /> },
];

const OS_OPTIONS: CyberSelectOption<OperatingSystem>[] = [
  { value: 'Linux', label: 'Linux', icon: <OsIcon os="Linux" /> },
  { value: 'Windows', label: 'Windows', icon: <OsIcon os="Windows" /> },
  { value: 'Android', label: 'Android', icon: <OsIcon os="Android" /> },
  { value: 'BSD', label: 'BSD', icon: <OsIcon os="BSD" /> },
  { value: 'Other', label: 'Other', icon: <OsIcon os="Other" /> },
];

const DIFFICULTY_OPTIONS: CyberSelectOption<Difficulty>[] = [
  { value: 'Very Easy', label: 'Very Easy', color: '#10B981' },
  { value: 'Easy', label: 'Easy', color: '#22C55E' },
  { value: 'Medium', label: 'Medium', color: '#F59E0B' },
  { value: 'Hard', label: 'Hard', color: '#EF4444' },
  { value: 'Insane', label: 'Insane', color: '#A855F7' },
];

export const NewMachineModal: React.FC = () => {
  const newMachineModalOpen = useCtfStore((s) => s.newMachineModalOpen);
  const setNewMachineModalOpen = useCtfStore((s) => s.setNewMachineModalOpen);
  const addCustomMachine = useCtfStore((s) => s.addCustomMachine);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);

  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [os, setOs] = useState<OperatingSystem>('Linux');
  const [platform, setPlatform] = useState<Platform>('Custom');
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [roomUrl, setRoomUrl] = useState('');
  const [tags, setTags] = useState('');
  const [hint, setHint] = useState('');
  const [isActive, setIsActive] = useState(false);

  const isKnownActive = KNOWN_ACTIVE_SEASONAL_NAMES.has(name.trim().toLowerCase());
  const effectiveIsActive = isActive || isKnownActive;

  useEffect(() => {
    if (newMachineModalOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [newMachineModalOpen]);

  if (!newMachineModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    addCustomMachine({
      name: name.trim(),
      ip: ip.trim() || '10.10.x.x',
      os,
      platform,
      difficulty,
      status: 'backlog',
      isActive: effectiveIsActive,
      tags: tagList,
      certifications: [],
      roomUrl: sanitizeExternalUrl(roomUrl.trim()),
      hint: effectiveIsActive ? undefined : (hint.trim() || undefined),
      timeSpentSeconds: 0,
    });

    if (soundEnabled) playCyberSound('root');
    setNewMachineModalOpen(false);

    // Reset fields
    setName('');
    setIp('');
    setRoomUrl('');
    setTags('');
    setHint('');
    setIsActive(false);
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-mono overflow-y-auto"
      onClick={() => setNewMachineModalOpen(false)}
    >
      <div 
        className="w-full sm:max-w-lg max-h-[90vh] flex flex-col rounded-xl border border-cyber-border bg-cyber-card shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex items-center justify-between border-b border-cyber-border p-4 bg-cyber-bg/95">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-cyber-emerald" />
            <h3 className="text-base font-bold text-white">DEPLOY NEW LAB TARGET</h3>
          </div>
          <button
            onClick={() => setNewMachineModalOpen(false)}
            className="p-1.5 rounded bg-cyber-bg text-cyber-muted hover:text-white border border-cyber-border"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs scrollbar-thin">
          <div>
            <label htmlFor="new-machine-name-input" className="block text-cyber-muted uppercase tracking-wider mb-1 font-semibold">
              Machine / Room Name *
            </label>
            <input
              id="new-machine-name-input"
              name="new-machine-name"
              aria-label="Machine or Room Name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Blackfield, Lame, Kioptrix"
              className="w-full bg-cyber-bg px-3 py-2 rounded-lg border border-cyber-border text-white focus:outline-none focus:border-cyber-emerald"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-machine-ip-input" className="block text-cyber-muted uppercase tracking-wider mb-1 font-semibold">
                Target IP
              </label>
              <input
                id="new-machine-ip-input"
                name="new-machine-ip"
                aria-label="Target IP Address"
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="10.10.10.x"
                className="w-full bg-cyber-bg px-3 py-2 rounded-lg border border-cyber-border text-white focus:outline-none focus:border-cyber-emerald"
              />
            </div>

            <div>
              <label className="block text-cyber-muted uppercase tracking-wider mb-1 font-semibold">
                Platform
              </label>
              <CyberSelect<Platform>
                value={platform}
                onChange={setPlatform}
                options={PLATFORM_OPTIONS}
                variant="emerald"
                size="md"
                className="w-full"
                triggerClassName="w-full bg-cyber-bg"
                soundEnabled={soundEnabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center justify-between text-cyber-muted uppercase tracking-wider mb-1 font-semibold">
                <span>Operating System</span>
                <OsBadge os={os} size="xs" />
              </label>
              <CyberSelect<OperatingSystem>
                value={os}
                onChange={setOs}
                options={OS_OPTIONS}
                variant="emerald"
                size="md"
                className="w-full"
                triggerClassName="w-full bg-cyber-bg"
                soundEnabled={soundEnabled}
              />
            </div>

            <div>
              <label className="block text-cyber-muted uppercase tracking-wider mb-1 font-semibold">
                Difficulty Tier
              </label>
              <CyberSelect<Difficulty>
                value={difficulty}
                onChange={setDifficulty}
                options={DIFFICULTY_OPTIONS}
                variant="emerald"
                size="md"
                className="w-full"
                triggerClassName="w-full bg-cyber-bg"
                soundEnabled={soundEnabled}
              />
            </div>
          </div>

          <div>
            <label htmlFor="new-machine-tags-input" className="block text-cyber-muted uppercase tracking-wider mb-1 font-semibold">
              Attack Vectors / Tags (Comma-separated)
            </label>
            <input
              id="new-machine-tags-input"
              name="new-machine-tags"
              aria-label="Attack Vectors and Tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="SQLi, SUID, Kerberoasting, LinPEAS"
              className="w-full bg-cyber-bg px-3 py-2 rounded-lg border border-cyber-border text-white focus:outline-none focus:border-cyber-emerald"
            />
          </div>

          {/* Active Lab ToS Safeguard Control */}
          <div className={`p-3 rounded-lg border transition-all ${
            effectiveIsActive 
              ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300' 
              : 'border-slate-200 dark:border-cyber-border bg-slate-50 dark:bg-cyber-bg/50'
          }`}>
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Lock className={`w-4 h-4 ${effectiveIsActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-cyber-muted'}`} />
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block">
                    Active Seasonal Lab (In-Season HTB / THM)
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-cyber-muted">
                    {isKnownActive 
                      ? 'Known in-season HTB machine detected — ToS safeguards automatically engaged.'
                      : 'Mark if target is in-season / active to enforce spoiler & writeup locks.'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                id="active-lab-checkbox"
                checked={effectiveIsActive}
                disabled={isKnownActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-cyber-border text-amber-600 focus:ring-amber-500 bg-white dark:bg-cyber-card cursor-pointer"
              />
            </label>
            {effectiveIsActive && (
              <p className="text-[11px] leading-relaxed pt-2 border-t border-amber-300/40 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 font-mono">
                Active Lab Safe-Mode: Personal time, flags, notes, and checklist tracking are fully supported. Public writeup URLs and spoilers are locked out to comply with Hack The Box Terms of Service (AUP §8.2).
              </p>
            )}
          </div>

          <div>
            <label htmlFor="new-machine-url-input" className="block text-cyber-muted uppercase tracking-wider mb-1 font-semibold">
              {effectiveIsActive ? 'Official Lab Room URL' : 'Lab Room / Writeup URL'}
            </label>
            <input
              id="new-machine-url-input"
              name="new-machine-url"
              aria-label="Lab Room or Writeup URL"
              type="url"
              value={roomUrl}
              onChange={(e) => setRoomUrl(e.target.value)}
              placeholder={effectiveIsActive ? 'https://app.hackthebox.com/machines/...' : 'https://app.hackthebox.com/machines/...'}
              className="w-full bg-cyber-bg px-3 py-2 rounded-lg border border-cyber-border text-white focus:outline-none focus:border-cyber-emerald"
            />
          </div>

          <div>
            <label htmlFor="new-machine-hint-input" className="block text-cyber-muted uppercase tracking-wider mb-1 font-semibold">
              Key Hint / Vulnerability Intel
            </label>
            {effectiveIsActive ? (
              <div className="p-2.5 rounded-lg border border-dashed border-amber-300 dark:border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-300 text-[11px] font-mono flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span>Intel hints and spoilers are locked for active labs per HTB Terms of Service (AUP §8.2).</span>
              </div>
            ) : (
              <textarea
                id="new-machine-hint-input"
                name="new-machine-hint"
                aria-label="Key Hint or Vulnerability Intel"
                rows={2}
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="Optional hint for when you get stuck..."
                className="w-full bg-cyber-bg px-3 py-2 rounded-lg border border-cyber-border text-white focus:outline-none focus:border-cyber-emerald resize-none"
              />
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-cyber-border">
            <button
              type="button"
              onClick={() => setNewMachineModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyber-emerald text-black font-bold hover:bg-cyber-emerald/90 transition-all shadow-glow-emerald"
            >
              <Plus className="w-4 h-4" /> Deploy Machine
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
