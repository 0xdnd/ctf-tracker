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
  { value: 'BSD', label: 'BSD', icon: <OsIcon os="BSD" /> },
  { value: 'Android', label: 'Android', icon: <OsIcon os="Android" /> },
  { value: 'macOS', label: 'macOS', icon: <OsIcon os="macOS" /> },
  { value: 'Other', label: 'Other', icon: <OsIcon os="Other" /> },
];

const DIFFICULTY_OPTIONS: CyberSelectOption<Difficulty>[] = [
  { value: 'Very Easy', label: 'Very Easy', color: 'rgb(var(--callout-info-fg))' },
  { value: 'Easy', label: 'Easy', color: 'rgb(var(--callout-success-fg))' },
  { value: 'Medium', label: 'Medium', color: 'rgb(var(--callout-warn-fg))' },
  { value: 'Hard', label: 'Hard', color: 'rgb(var(--callout-danger-fg))' },
  { value: 'Insane', label: 'Insane', color: 'rgb(var(--callout-tip-fg))' },
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-surface-inverse/85 backdrop-blur-md animate-fade-in font-sans overflow-y-auto"
      onClick={() => setNewMachineModalOpen(false)}
    >
      <div 
        className="w-full sm:max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-subtle bg-surface-card shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex items-center justify-between border-b border-subtle p-4 bg-surface-sunken/95">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-callout-success-fg" />
            <h3 className="text-base font-semibold text-primary">Add new target</h3>
          </div>
          <button aria-label="Close dialog"
            onClick={() => setNewMachineModalOpen(false)}
            className="p-1.5 rounded-lg bg-surface-sunken text-muted hover:text-primary border border-subtle transition-[transform,background-color,border-color,color] active:scale-[0.98]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs scrollbar-thin">
          <div>
            <label htmlFor="new-machine-name-input" className="block text-muted mb-1 font-semibold">
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
              className="w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-callout-success-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-machine-ip-input" className="block text-muted mb-1 font-semibold">
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
                className="font-mono tabular-nums w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-callout-success-border"
              />
            </div>

            <div>
              <label className="block text-muted mb-1 font-semibold">
                Platform
              </label>
              <CyberSelect<Platform>
                value={platform}
                onChange={setPlatform}
                options={PLATFORM_OPTIONS}
                variant="emerald"
                size="md"
                className="w-full"
                triggerClassName="w-full bg-surface-sunken"
                soundEnabled={soundEnabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center justify-between text-muted mb-1 font-semibold">
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
                triggerClassName="w-full bg-surface-sunken"
                soundEnabled={soundEnabled}
              />
            </div>

            <div>
              <label className="block text-muted mb-1 font-semibold">
                Difficulty Tier
              </label>
              <CyberSelect<Difficulty>
                value={difficulty}
                onChange={setDifficulty}
                options={DIFFICULTY_OPTIONS}
                variant="emerald"
                size="md"
                className="w-full"
                triggerClassName="w-full bg-surface-sunken"
                soundEnabled={soundEnabled}
              />
            </div>
          </div>

          <div>
            <label htmlFor="new-machine-tags-input" className="block text-muted mb-1 font-semibold">
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
              className="w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-callout-success-border"
            />
          </div>

          {/* Active Lab ToS Safeguard Control */}
          <div className={`p-3 rounded-lg border transition-colors ${
            effectiveIsActive 
              ? 'border-callout-warn-border bg-callout-warn-bg text-callout-warn-fg' 
              : 'border-subtle bg-surface-sunken'
          }`}>
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Lock className={`w-4 h-4 ${effectiveIsActive ? 'text-callout-warn-fg' : 'text-tertiary'}`} />
                <div>
                  <span className="font-semibold text-xs text-primary block">
                    Active Seasonal Lab (In-Season HTB / THM)
                  </span>
                  <span className="text-xs text-tertiary">
                    {isKnownActive 
                      ? 'Known in-season HTB machine detected. ToS safeguards automatically engaged.'
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
                className="w-4 h-4 rounded border-strong text-callout-warn-fg focus:ring-callout-warn-border bg-surface-card cursor-pointer"
              />
            </label>
            {effectiveIsActive && (
              <p className="text-xs leading-relaxed pt-2 border-t border-callout-warn-border text-callout-warn-fg">
                Active Lab Safe-Mode: Personal time, flags, notes, and checklist tracking are fully supported. Public writeup URLs and spoilers are locked out to comply with Hack The Box Terms of Service (AUP §8.2).
              </p>
            )}
          </div>

          <div>
            <label htmlFor="new-machine-url-input" className="block text-muted mb-1 font-semibold">
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
              className="w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-callout-success-border"
            />
          </div>

          <div>
            <label htmlFor="new-machine-hint-input" className="block text-muted mb-1 font-semibold">
              Key Hint / Vulnerability Intel
            </label>
            {effectiveIsActive ? (
              <div className="p-2.5 rounded-lg border border-dashed border-callout-warn-border bg-callout-warn-bg text-callout-warn-fg text-xs flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-callout-warn-fg flex-shrink-0" />
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
                className="w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-callout-success-border resize-none"
              />
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-subtle">
            <button
              type="button"
              onClick={() => setNewMachineModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg bg-surface-sunken border border-subtle text-muted hover:text-primary text-xs transition-[transform,background-color,border-color,color] active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-callout-success-fg text-surface-base font-semibold text-xs hover:bg-callout-success-fg transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] shadow-xs"
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
