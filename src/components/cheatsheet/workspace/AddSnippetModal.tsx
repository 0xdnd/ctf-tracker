import React from 'react';
import { Code } from 'lucide-react';
import { Modal } from '../../common/Modal';
import { CyberSelect, CyberSelectOption } from '../../common/CyberSelect';

const SNIPPET_CATEGORIES: CyberSelectOption[] = [
  { value: 'network', label: '01. Network Discovery & Port Scanning' },
  { value: 'web', label: '02. Web Enumeration & Fuzzing' },
  { value: 'exploitation', label: '03. Exploitation & Payloads' },
  { value: 'linux-privesc', label: '04. Linux PrivEsc & TTY' },
  { value: 'active-directory', label: '05. Windows & Active Directory' },
  { value: 'pivoting', label: '06. Pivoting & Tunneling' },
  { value: 'file-transfer', label: '07. File Transfers' },
];

interface AddSnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newTitle: string;
  setNewTitle: (value: string) => void;
  newCategory: string;
  setNewCategory: (value: string) => void;
  newDesc: string;
  setNewDesc: (value: string) => void;
  newTemplate: string;
  setNewTemplate: (value: string) => void;
  newTags: string;
  setNewTags: (value: string) => void;
}

export const AddSnippetModal: React.FC<AddSnippetModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  newTitle,
  setNewTitle,
  newCategory,
  setNewCategory,
  newDesc,
  setNewDesc,
  newTemplate,
  setNewTemplate,
  newTags,
  setNewTags,
}) => {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      labelledBy="add-custom-snippet-title"
      size="lg"
    >
      <div className="p-6 space-y-4">
        <h3 id="add-custom-snippet-title" className="text-base font-semibold text-primary flex items-center gap-2">
          <Code className="w-4 h-4 text-muted" /> Add custom snippet
        </h3>

        <form onSubmit={onSubmit} className="space-y-3 text-xs">
          <div>
            <label htmlFor="custom-snippet-title" className="block text-muted mb-1 font-semibold">
              Command Title *
            </label>
            <input
              type="text"
              id="custom-snippet-title"
              name="custom-snippet-title"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Chamilo LMS RCE Exploit"
              className="w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="custom-snippet-category" className="block text-muted mb-1 font-semibold">
              Category
            </label>
            <CyberSelect
              id="custom-snippet-category"
              name="custom-snippet-category"
              value={newCategory}
              onChange={setNewCategory}
              options={SNIPPET_CATEGORIES}
              variant="default"
              size="md"
              className="w-full"
              triggerClassName="w-full bg-surface-sunken"
            />
          </div>

          <div>
            <label htmlFor="custom-snippet-desc" className="block text-muted mb-1 font-semibold">
              Description
            </label>
            <input
              type="text"
              id="custom-snippet-desc"
              name="custom-snippet-desc"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Brief note on exploit parameters..."
              className="w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="custom-snippet-template" className="block text-muted mb-1 font-semibold">
              Command Template (Supports &#x7B;TARGET_IP&#x7D;, &#x7B;LHOST&#x7D;, &#x7B;LPORT&#x7D;) *
            </label>
            <textarea
              id="custom-snippet-template"
              name="custom-snippet-template"
              rows={3}
              required
              value={newTemplate}
              onChange={(e) => setNewTemplate(e.target.value)}
              placeholder="python3 exploit.py -t {TARGET_IP} -l {LHOST} -p {LPORT}"
              className="w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-accent font-mono resize-none"
            />
          </div>

          <div>
            <label htmlFor="custom-snippet-tags" className="block text-muted mb-1 font-semibold">
              Tags (Comma-separated)
            </label>
            <input
              type="text"
              id="custom-snippet-tags"
              name="custom-snippet-tags"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="rce, python, cve-2023-xxxx"
              className="w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface-sunken border border-subtle text-muted hover:text-primary text-xs transition-[transform,background-color,border-color,color] active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-accent text-on-accent font-semibold text-xs hover:bg-accent/90 transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98]"
            >
              Save Snippet
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
