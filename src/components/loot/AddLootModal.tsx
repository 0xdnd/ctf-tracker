import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, X } from 'lucide-react';
import { Machine } from '../../types';
import { VaultEvidenceItem, EvidenceCategory } from '../../pages/EvidenceVaultPage';
import { MODAL_ASYMMETRIC_TRANSITION } from '../../utils/motionTokens';
import { playCyberSound } from '../../utils/helpers';

export interface AddLootModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lootItem: VaultEvidenceItem) => void;
  machines: Machine[];
  defaultTargetId?: string;
  soundEnabled?: boolean;
}

export const AddLootModal: React.FC<AddLootModalProps> = ({
  isOpen,
  onClose,
  onSave,
  machines,
  defaultTargetId = '',
  soundEnabled = false,
}) => {
  const [targetId, setTargetId] = useState<string>(defaultTargetId);
  const [category, setCategory] = useState<EvidenceCategory>('password');
  const [username, setUsername] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setTargetId(defaultTargetId);
      setCategory('password');
      setUsername('');
      setSecret('');
      setNotes('');
    }
  }, [isOpen, defaultTargetId]);

  // Trap Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;

    const target = machines.find((m) => m.id === targetId);

    const typeLabelMap: Record<EvidenceCategory, string> = {
      password: 'Password',
      hash: 'Hash',
      ssh_key: 'SSH Key',
      token: 'Access Token',
      flag: 'Custom Flag',
      service: 'Service Endpoint',
      all: 'Loot',
    };

    const newItem: VaultEvidenceItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      targetId: target ? target.id : 'global',
      targetName: target ? target.name : 'Global / Unscoped',
      targetIp: target ? (target.ip || '0.0.0.0') : '0.0.0.0',
      platform: target ? target.platform : 'HTB',
      category,
      typeLabel: typeLabelMap[category] || 'Custom Loot',
      username: username.trim(),
      secret: secret.trim(),
      discoveredAt: new Date().toISOString(),
      notes: notes.trim(),
      isCustom: true,
    };

    onSave(newItem);
    if (soundEnabled) playCyberSound('root');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-inverse/60 backdrop-blur-xs font-sans">
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-loot-title"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: MODAL_ASYMMETRIC_TRANSITION.enter }}
            exit={{ opacity: 0, scale: 0.96, y: 8, transition: MODAL_ASYMMETRIC_TRANSITION.exit }}
            className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-subtle bg-surface-elevated p-6 shadow-2xl space-y-4 machined-edge"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <div className="flex items-center gap-2 font-semibold text-primary text-base tracking-[-0.01em]" id="add-loot-title">
                <Database className="w-4 h-4 text-accent" />
                <span>Log new evidence</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-md text-muted hover:text-primary active:scale-[0.97] transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              {/* Target Selector */}
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Target machine
                </label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-base border border-subtle text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 font-sans"
                >
                  <option value="">Global (no target)</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.ip || 'No IP'}) — {m.platform}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category & Username Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as EvidenceCategory)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-base border border-subtle text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 font-sans"
                  >
                    <option value="password">Password (plaintext)</option>
                    <option value="hash">Hash (NTLM, SHA, bcrypt)</option>
                    <option value="ssh_key">SSH private key</option>
                    <option value="token">Token, API key or secret</option>
                    <option value="flag">CTF flag proof</option>
                    <option value="service">Discovered service endpoint</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Username or identity
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. Administrator, root"
                    className="w-full px-3 py-2 rounded-lg bg-surface-base border border-subtle text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 font-sans"
                  />
                </div>
              </div>

              {/* Secret Textarea */}
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Secret value or key <span className="text-callout-danger-fg">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Paste password, hash string, or SSH private key..."
                  className="w-full p-2.5 rounded-lg bg-surface-base border border-subtle text-primary font-mono text-xs tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 resize-none"
                />
              </div>

              {/* Tactical Notes */}
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Notes and context
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Dumped via Mimikatz sekurlsa::logonpasswords"
                  className="w-full px-3 py-2 rounded-lg bg-surface-base border border-subtle text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 font-sans"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-subtle">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 max-sm:py-3 rounded-lg border border-subtle text-secondary font-medium hover:bg-surface-hover active:scale-[0.97] transition-interactive cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 max-sm:py-3 rounded-lg bg-accent text-on-accent font-medium hover:brightness-105 active:scale-[0.97] transition-interactive cursor-pointer shadow-xs"
                >
                  Save to Vault
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
