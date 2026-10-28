import React, { useState } from 'react';
import { X, Plus, Server, Lock } from 'lucide-react';
import { useCtfStore, KNOWN_ACTIVE_SEASONAL_NAMES, normalizeMachineSlug } from '../../store/useCtfStore';
import { Platform, OperatingSystem, Difficulty } from '../../types';
import { playCyberSound, sanitizeExternalUrl } from '../../utils/helpers';
import { OsBadge, OsIcon } from '../common/OsBadge';
import { PlatformIcon } from '../common/PlatformBadge';
import { CyberSelect, CyberSelectOption } from '../common/CyberSelect';
import { Modal } from '../common/Modal';
import { TARGET_TYPE_LABELS, TARGET_TYPE_TAGS, type TargetType } from '../../utils/targetType';
import { OFFICIAL_HTB_PRO_LABS } from '../../data/proLabsData';

const TARGET_TYPES: TargetType[] = ['machine', 'pro-lab', 'exam'];

const PLATFORM_OPTIONS: CyberSelectOption<Platform>[] = [
  { value: 'HTB', label: 'Hack The Box', icon: <PlatformIcon platform="HTB" /> },
  { value: 'THM', label: 'TryHackMe', icon: <PlatformIcon platform="THM" /> },
  { value: 'PG', label: 'OffSec Proving Grounds', icon: <PlatformIcon platform="PG" /> },
  { value: 'VulnHub', label: 'VulnHub', icon: <PlatformIcon platform="VulnHub" /> },
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
  const [targetType, setTargetType] = useState<TargetType>('machine');

  // Pro Labs and exams are personal targets: platform Custom plus a marker tag, no bundled content.
  const isPersonal = targetType !== 'machine';
  // A matching name only suggests name-only mode: the operator's own target is never forced into it.
  const isKnownActive = platform === 'HTB' && KNOWN_ACTIVE_SEASONAL_NAMES.has(normalizeMachineSlug(name));
  const effectiveIsActive = !isPersonal && isActive;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (isPersonal) {
      const marker = TARGET_TYPE_TAGS[targetType];
      if (!tagList.some((t) => t.toLowerCase() === marker)) tagList.unshift(marker);
    }

    addCustomMachine({
      name: name.trim(),
      ip: effectiveIsActive ? '' : (ip.trim() || '10.10.x.x'),
      os: effectiveIsActive ? 'Other' : os,
      platform: isPersonal ? 'Custom' : platform,
      difficulty: effectiveIsActive ? 'Medium' : difficulty,
      status: 'backlog',
      isActive: effectiveIsActive,
      tags: effectiveIsActive ? [] : tagList,
      certifications: [],
      roomUrl: sanitizeExternalUrl(roomUrl.trim()),
      hint: undefined,
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
    setTargetType('machine');
  };

  return (
    <Modal
      open={newMachineModalOpen}
      onClose={() => setNewMachineModalOpen(false)}
      labelledBy="new-machine-title"
      size="lg"
      zIndex="modal"
      className="backdrop-blur-md !bg-surface-inverse/85"
      panelClassName="!shadow-2xl"
    >
      <div className="flex flex-col max-h-[90dvh] min-h-0">
        <div className="flex-shrink-0 flex items-center justify-between border-b border-subtle p-4 bg-surface-sunken/95">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-callout-success-fg" />
            <h3 id="new-machine-title" className="text-base font-semibold text-primary">Add new target</h3>
          </div>
          <button aria-label="Close dialog"
            onClick={() => setNewMachineModalOpen(false)}
            className="p-1.5 rounded-lg bg-surface-sunken text-muted hover:text-primary border border-subtle transition-[transform,background-color,border-color,color] active:scale-[0.98]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs scrollbar-thin">
          <fieldset>
            <legend className="block text-muted mb-1 font-semibold">Target type</legend>
            <div className="inline-flex rounded-lg border border-subtle bg-surface-sunken p-0.5">
              {TARGET_TYPES.map((t) => (
                <label
                  key={t}
                  className={`cursor-pointer rounded-md px-3 py-1.5 font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
                    targetType === t ? 'bg-surface-card text-primary shadow-xs' : 'text-muted hover:text-primary'
                  }`}
                >
                  <input
                    type="radio"
                    name="new-machine-target-type"
                    value={t}
                    checked={targetType === t}
                    onChange={() => setTargetType(t)}
                    className="sr-only"
                  />
                  {TARGET_TYPE_LABELS[t]}
                </label>
              ))}
            </div>
            {isPersonal && (
              <p className="mt-1.5 text-tertiary">
                Track your own progress here. ZeroBox doesn't include any Pro Lab or exam content.
              </p>
            )}
            {targetType === 'pro-lab' && (
              <div className="mt-2 p-3 rounded-lg border border-subtle bg-surface-sunken/70 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary">Official HTB Pro Lab Presets</span>
                  <span className="text-[11px] text-tertiary">Scope & official URL only (HTB AUP §8.2)</span>
                </div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Official HTB Pro Lab Presets">
                  {OFFICIAL_HTB_PRO_LABS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setName(preset.name);
                        setDifficulty(preset.difficulty);
                        setRoomUrl(preset.roomUrl);
                        setTags(preset.tags.join(', '));
                        if (soundEnabled) playCyberSound('click');
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-mono border transition-all ${
                        name.toLowerCase() === preset.name.toLowerCase()
                          ? 'border-callout-success-border bg-callout-success-bg text-callout-success-fg font-semibold shadow-xs'
                          : 'border-subtle bg-surface-card text-secondary hover:text-primary hover:border-strong'
                      }`}
                      title={`${preset.name}: ${preset.hostCount} hosts, ${preset.flagCount} flags (${preset.examAlignment.join(', ')})`}
                    >
                      {preset.name}
                      <span className="ml-1 text-[10px] opacity-75">({preset.flagCount}🚩)</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </fieldset>

          <div>
            <label htmlFor="new-machine-name-input" className="block text-muted mb-1 font-semibold">
              {isPersonal ? `${TARGET_TYPE_LABELS[targetType]} name *` : 'Machine / Room Name *'}
            </label>
            <input
              id="new-machine-name-input"
              name="new-machine-name"
              aria-label="Machine or Room Name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isPersonal ? 'Type your own name for it' : 'e.g. Blackfield, Lame, Kioptrix'}
              className="w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-callout-success-border"
            />
          </div>

          {/* Active Lab ToS Safeguard Control (machines only) */}
          {!isPersonal && (
          <div className={`p-3 rounded-lg border transition-colors ${
            effectiveIsActive 
              ? 'border-callout-warn-border bg-callout-warn-bg text-callout-warn-fg' 
              : 'border-subtle bg-surface-sunken'
          }`}>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className={`w-4 h-4 shrink-0 ${effectiveIsActive ? 'text-callout-warn-fg' : 'text-tertiary'}`} />
                <div>
                  <span className="font-semibold text-xs text-primary block">
                    Active Seasonal Lab (In-Season HTB / THM)
                  </span>
                  <span className="text-xs text-tertiary">
                    {isKnownActive 
                      ? 'This name matches an active HTB machine. Turn this on to keep it name-only.'
                      : 'Enforce Hack The Box Terms of Service (Name only, no spoilers/recon).'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                id="active-lab-checkbox"
                checked={effectiveIsActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 shrink-0 rounded border-strong text-callout-warn-fg focus:ring-callout-warn-border bg-surface-card cursor-pointer"
              />
            </label>
            {effectiveIsActive && (
              <p className="text-xs leading-relaxed pt-2 border-t border-callout-warn-border text-callout-warn-fg">
                HTB ToS Compliance Mode: Per Hack The Box rules (AUP §8.2), only the machine name and official room link are stored. IP, attack vectors, hints, flags, and notes are strictly excluded.
              </p>
            )}
          </div>
          )}

          <div>
            <label htmlFor="new-machine-url-input" className="block text-muted mb-1 font-semibold">
              {effectiveIsActive ? 'Official Lab Room URL (Optional)' : 'Lab Room / Writeup URL'}
            </label>
            <input
              id="new-machine-url-input"
              name="new-machine-url"
              aria-label="Lab Room or Writeup URL"
              type="url"
              value={roomUrl}
              onChange={(e) => setRoomUrl(e.target.value)}
              placeholder="https://app.hackthebox.com/machines/..."
              className="w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-callout-success-border"
            />
          </div>

          {!effectiveIsActive && (
            <>
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

                {!isPersonal && (
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
                    wrapLabel
                    triggerClassName="w-full bg-surface-sunken"
                    soundEnabled={soundEnabled}
                  />
                </div>
                )}
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

              <div>
                <label htmlFor="new-machine-hint-input" className="block text-muted mb-1 font-semibold">
                  Key Hint / Vulnerability Intel
                </label>
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
              </div>
            </>
          )}

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
    </Modal>
  );
};
