import React, { useState } from 'react';
import { AlertOctagon, Plus, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { Machine, LabFinding, NewLabFindingInput, FindingSeverity } from '../../types';
import { playCyberSound } from '../../utils/helpers';

interface LabFindingsPanelProps {
  machine: Machine;
  className?: string;
}

const SEVERITY_COLORS: Record<FindingSeverity, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-callout-danger-bg', text: 'text-callout-danger-fg', border: 'border-callout-danger-border' },
  high: { bg: 'bg-callout-warn-bg', text: 'text-callout-warn-fg', border: 'border-callout-warn-border' },
  medium: { bg: 'bg-callout-tip-bg', text: 'text-callout-tip-fg', border: 'border-callout-tip-border' },
  low: { bg: 'bg-callout-info-bg', text: 'text-callout-info-fg', border: 'border-callout-info-border' },
  info: { bg: 'bg-surface-sunken', text: 'text-secondary', border: 'border-subtle' },
};

export const LabFindingsPanel: React.FC<LabFindingsPanelProps> = ({ machine, className = '' }) => {
  const addFinding = useCtfStore((s) => s.addFinding);
  const updateFinding = useCtfStore((s) => s.updateFinding);
  const removeFinding = useCtfStore((s) => s.removeFinding);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formSeverity, setFormSeverity] = useState<FindingSeverity>('high');
  const [formCvss, setFormCvss] = useState<string>('8.0');
  const [formCweCve, setFormCweCve] = useState('');
  const [formService, setFormService] = useState('');
  const [formRepro, setFormRepro] = useState('');
  const [formRemediation, setFormRemediation] = useState('');

  const findings = machine.findings || [];

  const resetForm = () => {
    setFormTitle('');
    setFormSeverity('high');
    setFormCvss('8.0');
    setFormCweCve('');
    setFormService('');
    setFormRepro('');
    setFormRemediation('');
    setIsAdding(false);
    setEditingId(null);
  };

  const startEdit = (finding: LabFinding) => {
    setFormTitle(finding.title);
    setFormSeverity(finding.severity);
    setFormCvss(finding.cvssScore !== undefined ? String(finding.cvssScore) : '');
    setFormCweCve(finding.cweCve || '');
    setFormService(finding.affectedService || '');
    setFormRepro(finding.repro || '');
    setFormRemediation(finding.remediation || '');
    setEditingId(finding.id);
    setIsAdding(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const parsedCvss = formCvss.trim() ? parseFloat(formCvss) : undefined;
    const input: NewLabFindingInput = {
      title: formTitle.trim(),
      severity: formSeverity,
      cvssScore: isNaN(parsedCvss as number) ? undefined : parsedCvss,
      cweCve: formCweCve.trim() || undefined,
      affectedService: formService.trim() || undefined,
      repro: formRepro.trim() || undefined,
      remediation: formRemediation.trim() || undefined,
    };

    if (editingId) {
      updateFinding(machine.id, editingId, input);
    } else {
      addFinding(machine.id, input);
    }

    if (soundEnabled) playCyberSound('root');
    resetForm();
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={`rounded-xl border border-subtle bg-surface-card p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-callout-warn-fg" />
          <h3 className="text-xs font-semibold text-primary">Vulnerability Findings ({findings.length})</h3>
        </div>

        {!isAdding && !editingId && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent text-on-accent hover:bg-accent-hover text-xs font-medium transition-colors cursor-pointer active:scale-[0.97]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Finding</span>
          </button>
        )}
      </div>

      {/* Form (Add or Edit) */}
      {(isAdding || editingId) && (
        <form onSubmit={handleSubmit} className="p-3.5 rounded-lg border border-subtle bg-surface-sunken space-y-3">
          <div className="text-xs font-semibold text-primary">
            {editingId ? 'Edit Finding' : 'Record New Vulnerability Finding'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-secondary block mb-1">Finding Title *</label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Remote Code Execution via Log4Shell"
                className="w-full h-8 px-2.5 rounded-lg border border-subtle bg-surface-card text-xs text-primary focus:border-accent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-secondary block mb-1">Severity</label>
                <select
                  value={formSeverity}
                  onChange={(e) => setFormSeverity(e.target.value as FindingSeverity)}
                  className="w-full h-8 px-2 rounded-lg border border-subtle bg-surface-card text-xs text-primary focus:border-accent focus:outline-none"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="info">Info</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-secondary block mb-1">CVSS Score (0-10)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={formCvss}
                  onChange={(e) => setFormCvss(e.target.value)}
                  placeholder="8.8"
                  className="w-full h-8 px-2.5 rounded-lg border border-subtle bg-surface-card text-xs text-primary focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-secondary block mb-1">CWE / CVE identifier</label>
              <input
                type="text"
                value={formCweCve}
                onChange={(e) => setFormCweCve(e.target.value)}
                placeholder="CVE-2021-44228 / CWE-78"
                className="w-full h-8 px-2.5 rounded-lg border border-subtle bg-surface-card text-xs text-primary focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-secondary block mb-1">Affected Service</label>
              <input
                type="text"
                value={formService}
                onChange={(e) => setFormService(e.target.value)}
                placeholder="Apache Solr (port 8983)"
                className="w-full h-8 px-2.5 rounded-lg border border-subtle bg-surface-card text-xs text-primary focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-secondary block mb-1">Proof of Concept / Repro Steps</label>
            <textarea
              rows={2}
              value={formRepro}
              onChange={(e) => setFormRepro(e.target.value)}
              placeholder="Detailed commands, HTTP requests, or exploitation payload..."
              className="w-full p-2 rounded-lg border border-subtle bg-surface-card text-xs font-mono text-primary focus:border-accent focus:outline-none resize-y"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-secondary block mb-1">Remediation Guidance</label>
            <textarea
              rows={2}
              value={formRemediation}
              onChange={(e) => setFormRemediation(e.target.value)}
              placeholder="Recommended fix, patch, configuration change, or firewall rule..."
              className="w-full p-2 rounded-lg border border-subtle bg-surface-card text-xs text-primary focus:border-accent focus:outline-none resize-y"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1.5 rounded-lg border border-subtle text-xs text-muted hover:text-primary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-accent text-on-accent text-xs font-medium hover:bg-accent-hover transition-colors cursor-pointer"
            >
              {editingId ? 'Update Finding' : 'Save Finding'}
            </button>
          </div>
        </form>
      )}

      {/* Findings List */}
      {findings.length === 0 && !isAdding && !editingId ? (
        <div className="text-center py-6 text-xs text-muted">
          No security findings documented for this machine yet. Click "Add Finding" to document verified exploits.
        </div>
      ) : (
        <div className="space-y-2">
          {findings.map((f) => {
            const isExpanded = Boolean(expandedIds[f.id]);
            const badge = SEVERITY_COLORS[f.severity] || SEVERITY_COLORS.info;

            return (
              <div key={f.id} className="rounded-lg border border-subtle bg-surface-sunken/40 overflow-hidden">
                <div className="p-3 flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleExpand(f.id)}
                    className="flex items-start gap-2 text-left min-w-0 flex-1 cursor-pointer"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-primary">{f.title}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {f.severity}
                        </span>
                        {f.cvssScore !== undefined && (
                          <span className="font-mono text-[11px] text-muted">CVSS {f.cvssScore.toFixed(1)}</span>
                        )}
                        {f.cweCve && <span className="font-mono text-[11px] text-accent">{f.cweCve}</span>}
                      </div>
                      {f.affectedService && (
                        <div className="text-[11px] text-muted mt-0.5">Service: {f.affectedService}</div>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(f)}
                      className="p-1 rounded text-muted hover:text-primary transition-colors cursor-pointer"
                      title="Edit finding"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFinding(machine.id, f.id)}
                      className="p-1 rounded text-muted hover:text-callout-danger-fg transition-colors cursor-pointer"
                      title="Delete finding"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-subtle/40 text-xs">
                    {f.repro && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-secondary">Proof of Concept:</span>
                        <pre className="p-2 rounded bg-surface-card border border-subtle text-primary font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                          {f.repro}
                        </pre>
                      </div>
                    )}
                    {f.remediation && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-secondary">Remediation:</span>
                        <div className="p-2 rounded bg-surface-card border border-subtle text-muted text-xs">
                          {f.remediation}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
