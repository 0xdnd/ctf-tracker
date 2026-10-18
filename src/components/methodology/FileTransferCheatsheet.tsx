import React, { useState, useMemo } from 'react';
import { Copy, Check, Terminal, Server, Laptop, Wrench } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { safeCopyToClipboard, playCyberSound } from '../../utils/helpers';
import { toast } from '../../store/useToastStore';
import {
  COMMON_TRANSFER_TOOLS,
  generateFileTransferMethods,
  FileTransferMethod,
} from '../../utils/offensiveTransferUtils';

export type { FileTransferMethod as FileTransferItem };

export const FileTransferCheatsheet: React.FC = () => {
  const { globalVars, soundEnabled } = useCtfStore();
  const [filterOs, setFilterOs] = useState<'all' | 'windows' | 'linux' | 'server'>('all');
  const [selectedTool, setSelectedTool] = useState<string>('linpeas.sh');
  const [customFile, setCustomFile] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const lhost = globalVars.lhost || '10.10.14.X';
  const lport = globalVars.lport || '8000';
  const targetIp = globalVars.targetIp || '10.10.10.X';
  const user = globalVars.user || 'kali';
  const cred = globalVars.cred || 'kali';

  const activeFilename = customFile.trim() || selectedTool;

  const transfers = useMemo(() => {
    return generateFileTransferMethods({
      lhost,
      lport,
      filename: activeFilename,
      targetIp,
      user,
      cred,
    });
  }, [lhost, lport, activeFilename, targetIp, user, cred]);

  const handleCopy = async (cmd: string, id: string) => {
    const ok = await safeCopyToClipboard(cmd);
    if (ok) {
      setCopiedId(id);
      toast.success('Transfer command copied to clipboard');
      if (soundEnabled) playCyberSound('copy');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const filtered = transfers.filter((t) => {
    if (filterOs === 'all') return true;
    return t.os === filterOs;
  });

  return (
    <div className="space-y-4">
      {/* File & Tool Quick Presets */}
      <div className="p-3.5 rounded-xl border border-subtle bg-surface-card space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold text-primary">Staging Payload / Tool Presets</span>
          </div>
          <div className="text-xs text-muted font-mono">
            Active: <span className="text-accent font-semibold">{activeFilename}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {COMMON_TRANSFER_TOOLS.map((tool) => {
            const isSelected = selectedTool === tool && !customFile.trim();
            return (
              <button
                key={tool}
                type="button"
                onClick={() => {
                  setSelectedTool(tool);
                  setCustomFile('');
                  if (soundEnabled) playCyberSound('click');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer active:scale-[0.97] border ${
                  isSelected
                    ? 'bg-accent text-on-accent border-accent font-semibold shadow-xs'
                    : 'bg-surface-sunken hover:bg-surface-hover border-subtle text-secondary'
                }`}
              >
                {tool}
              </button>
            );
          })}

          <input
            type="text"
            value={customFile}
            onChange={(e) => setCustomFile(e.target.value)}
            placeholder="Or custom filename..."
            className="h-7 px-2.5 rounded-lg border border-subtle bg-surface-sunken text-xs font-mono text-primary placeholder:text-muted focus:border-accent focus:outline-none w-44"
          />
        </div>
      </div>

      {/* OS Filter Chips */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterOs('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              filterOs === 'all'
                ? 'bg-accent text-on-accent'
                : 'bg-surface-card border border-subtle text-secondary hover:text-primary'
            }`}
          >
            All Methods ({transfers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterOs('server')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              filterOs === 'server'
                ? 'bg-accent text-on-accent'
                : 'bg-surface-card border border-subtle text-secondary hover:text-primary'
            }`}
          >
            Attacker Servers (Listeners)
          </button>
          <button
            type="button"
            onClick={() => setFilterOs('windows')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              filterOs === 'windows'
                ? 'bg-accent text-on-accent'
                : 'bg-surface-card border border-subtle text-secondary hover:text-primary'
            }`}
          >
            Windows Target Downloads
          </button>
          <button
            type="button"
            onClick={() => setFilterOs('linux')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              filterOs === 'linux'
                ? 'bg-accent text-on-accent'
                : 'bg-surface-card border border-subtle text-secondary hover:text-primary'
            }`}
          >
            Linux Target Downloads
          </button>
        </div>

        <div className="text-xs text-muted font-mono">
          LHOST: <span className="text-accent">{lhost}</span> | LPORT:{' '}
          <span className="text-accent">{lport}</span>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((item) => {
          const isCopied = copiedId === item.id;
          return (
            <div
              key={item.id}
              className="p-3.5 rounded-xl border border-subtle bg-surface-card space-y-2.5 flex flex-col justify-between hover:border-strong transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    {item.os === 'windows' && <Laptop className="w-3.5 h-3.5 text-callout-info-fg" />}
                    {item.os === 'linux' && <Terminal className="w-3.5 h-3.5 text-callout-success-fg" />}
                    {item.os === 'server' && <Server className="w-3.5 h-3.5 text-callout-warn-fg" />}
                    <span>{item.title}</span>
                  </h4>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-sunken text-muted border border-subtle">
                    {item.category}
                  </span>
                </div>
                <p className="text-[11px] text-muted mt-1 leading-relaxed">{item.description}</p>
              </div>

              <div className="space-y-1.5">
                <div className="relative group">
                  <pre className="p-2.5 rounded-lg bg-surface-sunken border border-subtle text-xs font-mono text-primary overflow-x-auto whitespace-pre-wrap break-all select-all">
                    {item.commandTemplate}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.commandTemplate, item.id)}
                    className={`absolute right-2 top-2 p-1.5 rounded-md border text-xs transition-colors cursor-pointer active:scale-95 ${
                      isCopied
                        ? 'bg-callout-success-bg text-callout-success-fg border-callout-success-border'
                        : 'bg-surface-card border-subtle text-secondary hover:text-accent hover:border-accent shadow-xs'
                    }`}
                    title="Copy command to clipboard"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
