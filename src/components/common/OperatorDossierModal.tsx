import React, { useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  Globe, 
  ShieldCheck, 
  Award, 
  Terminal, 
  Code2, 
  BookOpen, 
  Cpu, 
  CheckCircle2, 
  Sparkles,
  Zap,
  Target,
  Scale,
  Copy,
  Check,
  Coffee
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { playCyberSound, safeCopyToClipboard, CREATOR_PROFILE_LINKS } from '../../utils/helpers';

export const OperatorDossierModal: React.FC = () => {
  const operatorModalOpen = useCtfStore((s) => s.operatorModalOpen);
  const setOperatorModalOpen = useCtfStore((s) => s.setOperatorModalOpen);
  const setLicenseModalOpen = useCtfStore((s) => s.setLicenseModalOpen);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const handleCopyLink = async (e: React.MouseEvent, url: string, field: string) => {
    e.preventDefault();
    e.stopPropagation();
    await safeCopyToClipboard(url);
    setCopiedField(field);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedField(null), 2000);
  };

  useEffect(() => {
    if (operatorModalOpen) {
      if (soundEnabled) playCyberSound('engage');
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOperatorModalOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [operatorModalOpen, setOperatorModalOpen, soundEnabled]);

  if (!operatorModalOpen) return null;

  const links = CREATOR_PROFILE_LINKS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Dark Backdrop */}
      <div 
        className="fixed inset-0 bg-black/85 transition-opacity animate-in fade-in"
        onClick={() => setOperatorModalOpen(false)}
      />

      {/* Modal Dossier Card */}
      <div className="relative w-full max-w-3xl my-auto bg-cyber-card border border-cyber-border rounded-2xl text-cyber-text overflow-hidden z-10 flex flex-col max-h-[90vh] shadow-2xl">
        
        {/* Top Tactical Terminal Header */}
        <div className="px-4 py-3 bg-cyber-bg border-b border-cyber-border flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyber-emerald animate-pulse" />
            <span className="font-mono text-xs font-bold text-cyber-emerald tracking-wider uppercase">
              OPERATOR IDENTIFICATION DOSSIER // LEVEL 5 CLASSIFIED
            </span>
          </div>

          <button
            onClick={() => setOperatorModalOpen(false)}
            className="p-1.5 rounded-lg text-cyber-muted hover:text-cyber-text hover:bg-cyber-cardHover transition-colors cursor-pointer"
            title="Close Dossier (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Dossier Content */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 font-mono text-xs scrollbar-thin">
          
          {/* Hero Profile Banner */}
          <div className="p-4 sm:p-5 rounded-xl bg-cyber-bg border border-cyber-border relative overflow-hidden">
            <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-3.5 sm:gap-4 text-center sm:text-left">
              {/* Tactical Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-cyber-card border border-cyber-emerald flex items-center justify-center shadow-sm">
                  <span className="font-mono font-black text-xl text-cyber-emerald tracking-tight">
                    DD
                  </span>
                </div>
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-md bg-cyber-emerald text-black font-mono font-bold text-[8px] uppercase tracking-wider shadow-xs">
                  ONLINE
                </span>
              </div>

              {/* Operator Identity Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-cyber-text tracking-wide">
                    Daniel Dayan
                  </h2>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyber-emerald/10 text-cyber-emerald border border-cyber-emerald/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    CREATOR & ARCHITECT
                  </span>
                </div>

                <div className="text-xs text-cyber-cyan font-semibold flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Callsign: <strong className="text-cyber-text">0xdnd</strong> (Specter)</span>
                  <span className="text-cyber-muted">•</span>
                  <span>Cybersecurity Researcher & Penetration Tester</span>
                </div>

                <p className="text-xs text-cyber-muted leading-relaxed pt-0.5">
                  Creator and lead developer of <strong>ZeroBox // Tactical CTF Suite</strong>. 
                  Passionate about offensive security, penetration testing, exploit engineering, and building high-performance 
                  tactical command-and-control dashboards for security teams and CTF operators.
                </p>
              </div>
            </div>
          </div>

          {/* Primary Featured Portfolio Action Banner */}
          <div className="p-4 rounded-xl bg-cyber-bg border border-cyber-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-9 h-9 rounded-lg bg-cyber-emerald/10 border border-cyber-emerald/30 flex items-center justify-center flex-shrink-0 text-cyber-emerald">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-cyber-text text-xs flex items-center justify-center sm:justify-start gap-1.5 font-mono">
                  <span>DANIEL DAYAN'S OFFICIAL PORTFOLIO</span>
                  <Sparkles className="w-3.5 h-3.5 text-cyber-emerald" />
                </div>
                <div className="text-cyber-muted text-[11px]">
                  Explore Daniel's live cybersecurity projects, professional certifications, and security research.
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto flex-shrink-0">
              <a
                href={links.coffee}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg font-mono font-bold text-xs bg-[#FFDD00] hover:bg-[#FFDD00]/90 text-black transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] flex items-center justify-center gap-1.5 flex-shrink-0 shadow-sm"
              >
                <Coffee className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>BUY ME A COFFEE</span>
              </a>
              <a
                href={links.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg font-mono font-bold text-xs bg-cyber-emerald hover:bg-cyber-emerald/90 text-black transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] flex items-center justify-center gap-1.5 flex-shrink-0 shadow-sm"
              >
                <span>LAUNCH PORTFOLIO</span>
                <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
              </a>
            </div>
          </div>

          {/* 4-Column External Tactical Resource Grid */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold tracking-wider text-cyber-muted flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-cyber-amber" /> OFFICIAL PROFILES & PLATFORMS
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Portfolio */}
              <div className="p-3 rounded-xl bg-cyber-card hover:bg-cyber-card/80 border border-cyber-border hover:border-cyber-emerald transition-colors group flex items-center justify-between">
                <a
                  href={links.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 min-w-0 flex-1 mr-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyber-emerald/15 border border-cyber-emerald/40 flex items-center justify-center text-cyber-emerald group-hover:scale-110 transition-transform">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-white group-hover:text-cyber-emerald transition-colors flex items-center gap-1.5">
                      <span>Portfolio Website</span>
                      <ExternalLink className="w-3 h-3 text-cyber-muted opacity-60" />
                    </div>
                    <div className="text-[10px] text-cyber-muted truncate">0xdnd.github.io</div>
                  </div>
                </a>
                <button
                  onClick={(e) => handleCopyLink(e, links.portfolio, 'portfolio')}
                  className="p-1.5 rounded-lg bg-cyber-bg hover:bg-cyber-emerald/20 text-cyber-muted hover:text-cyber-emerald border border-cyber-border hover:border-cyber-emerald/50 transition-colors flex-shrink-0"
                  title="Copy portfolio URL"
                >
                  {copiedField === 'portfolio' ? <Check className="w-3.5 h-3.5 text-cyber-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* LinkedIn */}
              <div className="p-3 rounded-xl bg-cyber-card hover:bg-[#0077B5]/10 border border-cyber-border hover:border-[#0077B5] transition-colors group flex items-center justify-between">
                <a
                  href={links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 min-w-0 flex-1 mr-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#0077B5]/20 border border-[#0077B5]/50 flex items-center justify-center text-[#0077B5] group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.7a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z"/></svg>
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-white group-hover:text-[#0077B5] transition-colors flex items-center gap-1.5">
                      <span>LinkedIn Profile</span>
                      <ExternalLink className="w-3 h-3 text-cyber-muted opacity-60" />
                    </div>
                    <div className="text-[10px] text-cyber-muted truncate">daniel-dayan-a66322352</div>
                  </div>
                </a>
                <button
                  onClick={(e) => handleCopyLink(e, links.linkedin, 'linkedin')}
                  className="p-1.5 rounded-lg bg-cyber-bg hover:bg-[#0077B5]/25 text-cyber-muted hover:text-[#0077B5] border border-cyber-border hover:border-[#0077B5]/50 transition-colors flex-shrink-0"
                  title="Copy LinkedIn URL"
                >
                  {copiedField === 'linkedin' ? <Check className="w-3.5 h-3.5 text-cyber-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* GitHub */}
              <div className="p-3 rounded-xl bg-cyber-card hover:bg-white/5 border border-cyber-border hover:border-white transition-colors group flex items-center justify-between">
                <a
                  href={links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 min-w-0 flex-1 mr-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/30 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-white group-hover:text-white transition-colors flex items-center gap-1.5">
                      <span>GitHub Repositories</span>
                      <ExternalLink className="w-3 h-3 text-cyber-muted opacity-60" />
                    </div>
                    <div className="text-[10px] text-cyber-muted truncate">github.com/0xdnd</div>
                  </div>
                </a>
                <button
                  onClick={(e) => handleCopyLink(e, links.github, 'github')}
                  className="p-1.5 rounded-lg bg-cyber-bg hover:bg-white/20 text-cyber-muted hover:text-primary border border-cyber-border hover:border-white/50 transition-colors flex-shrink-0"
                  title="Copy GitHub URL"
                >
                  {copiedField === 'github' ? <Check className="w-3.5 h-3.5 text-cyber-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* CTF Writeups */}
              <div className="p-3 rounded-xl bg-cyber-card hover:bg-cyber-cyan/10 border border-cyber-border hover:border-cyber-cyan transition-colors group flex items-center justify-between">
                <a
                  href={links.writeups}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 min-w-0 flex-1 mr-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyber-cyan/20 border border-cyber-cyan/50 flex items-center justify-center text-cyber-cyan group-hover:scale-110 transition-transform">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-white group-hover:text-cyber-cyan transition-colors flex items-center gap-1.5">
                      <span>CTF Write-ups</span>
                      <ExternalLink className="w-3 h-3 text-cyber-muted opacity-60" />
                    </div>
                    <div className="text-[10px] text-cyber-muted truncate">0xdnd.gitbook.io</div>
                  </div>
                </a>
                <button
                  onClick={(e) => handleCopyLink(e, links.writeups, 'writeups')}
                  className="p-1.5 rounded-lg bg-cyber-bg hover:bg-cyber-cyan/25 text-cyber-muted hover:text-cyber-cyan border border-cyber-border hover:border-cyber-cyan/50 transition-colors flex-shrink-0"
                  title="Copy GitBook writeups URL"
                >
                  {copiedField === 'writeups' ? <Check className="w-3.5 h-3.5 text-cyber-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Buy Me a Coffee Operator Sponsor Card */}
              <div className="sm:col-span-2 p-3.5 rounded-xl bg-cyber-bg border border-cyber-border hover:border-amber-500/50 transition-colors group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <a
                  href={links.coffee}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 min-w-0 flex-1"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-callout-warn-fg flex-shrink-0">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-cyber-text group-hover:text-callout-warn-fg transition-colors flex items-center gap-1.5 text-xs font-mono">
                      <span>Buy Me a Coffee // Sponsor Daniel Dayan</span>
                      <ExternalLink className="w-3 h-3 text-cyber-muted opacity-60" />
                    </div>
                    <div className="text-[10px] text-cyber-muted truncate">buymeacoffee.com/0xdnd • Support open-source offensive security tools & research</div>
                  </div>
                </a>
                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-shrink-0">
                  <button
                    onClick={(e) => handleCopyLink(e, links.coffee, 'coffee')}
                    className="p-1.5 rounded-lg bg-cyber-card hover:bg-cyber-cardHover text-cyber-muted hover:text-cyber-text border border-cyber-border transition-colors flex-shrink-0 cursor-pointer"
                    title="Copy Buy Me a Coffee URL"
                  >
                    {copiedField === 'coffee' ? <Check className="w-3.5 h-3.5 text-cyber-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={links.coffee}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-lg bg-[#FFDD00] hover:bg-[#FFDD00]/90 text-black font-mono font-bold text-xs transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] flex items-center gap-1.5 shadow-sm"
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    <span>SPONSOR</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Key Operator Technical Highlights */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold tracking-wider text-cyber-muted flex items-center gap-1.5">
              <Award className="w-3 h-3 text-cyber-emerald" /> TRACK RECORD & SYSTEM ARCHITECTURE
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-cyber-bg border border-cyber-border space-y-0.5">
                <div className="text-cyber-emerald font-extrabold text-base font-mono">63 Pwns</div>
                <div className="text-cyber-text font-semibold text-xs">45 HTB + 18 THM Solves</div>
                <div className="text-[10px] text-cyber-muted">Verified pwned targets in active tracker roster.</div>
              </div>

              <div className="p-3 rounded-xl bg-cyber-bg border border-cyber-border space-y-0.5">
                <div className="text-cyber-cyan font-extrabold text-base font-mono">8 Phases</div>
                <div className="text-cyber-text font-semibold text-xs">Offensive Methodology</div>
                <div className="text-[10px] text-cyber-muted">End-to-end framework from reconnaissance to exfiltration.</div>
              </div>

              <div className="p-3 rounded-xl bg-cyber-bg border border-cyber-border space-y-0.5">
                <div className="text-cyber-amber font-extrabold text-base font-mono">Zero Egress</div>
                <div className="text-cyber-text font-semibold text-xs">Local-First Engine</div>
                <div className="text-[10px] text-cyber-muted">Offline-first Zustand state. No data leaves this machine.</div>
              </div>
            </div>
          </div>

          {/* Creator Notes / Philosophy */}
          <div className="p-3.5 rounded-xl bg-cyber-bg border border-cyber-border space-y-1">
            <div className="text-[10px] uppercase font-bold text-cyber-muted flex items-center gap-1.5 font-mono">
              <Cpu className="w-3 h-3 text-cyber-cyan" /> CREATOR PHILOSOPHY // ZEROBOX
            </div>
            <p className="text-cyber-muted text-[11px] leading-relaxed">
              "I built ZeroBox because offensive security operators need a single, lightning-fast workspace that keeps track of target states, automatically injects VPN IP parameters into payload commands, and structures machine lifecycles without friction or tedious note-taking."
            </p>
            <div className="text-[10px] text-cyber-emerald font-bold text-right font-mono">
              - Daniel Dayan (@0xdnd)
            </div>
          </div>

          {/* Legal & Non-Commercial License Protection Covenant */}
          <div className="p-3.5 rounded-xl bg-cyber-bg border border-cyber-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyber-amber/10 border border-cyber-amber/30 flex items-center justify-center text-cyber-amber flex-shrink-0 mt-0.5 sm:mt-0">
                <Scale className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-cyber-text text-xs font-mono">NON-COMMERCIAL SOURCE-AVAILABLE LICENSE (ZNSL 1.0)</span>
                  <span className="px-1.5 py-0.2 rounded-md text-[9px] font-mono font-bold bg-cyber-amber/10 text-cyber-amber border border-cyber-amber/30">
                    PROTECTED
                  </span>
                </div>
                <p className="text-[11px] text-cyber-muted leading-relaxed max-w-xl">
                  ZeroBox is authored by Daniel Dayan for personal and educational research. Commercial exploitation, reselling, paid course bundling, or public re-hosting is strictly prohibited by law.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setOperatorModalOpen(false);
                setLicenseModalOpen(true);
                if (soundEnabled) playCyberSound('click');
              }}
              className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-cyber-amber text-black hover:opacity-90 transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer shadow-sm"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>VIEW LICENSE</span>
            </button>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-[#080c14] border-t border-cyber-border/80 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] text-cyber-muted">
            ZeroBox Suite v2.0 • Designed & Built by Daniel Dayan
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setOperatorModalOpen(false);
                setLicenseModalOpen(true);
                if (soundEnabled) playCyberSound('click');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyber-amber/15 hover:bg-cyber-amber/25 text-cyber-amber border border-cyber-amber/40 transition-colors flex items-center gap-1.5"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>License (ZNSL 1.0)</span>
            </button>

            <a
              href={links.portfolio}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyber-emerald/15 hover:bg-cyber-emerald/25 text-cyber-emerald border border-cyber-emerald/40 transition-colors flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>0xdnd.github.io</span>
            </a>

            <button
              onClick={() => setOperatorModalOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyber-card hover:bg-white/10 text-white border border-cyber-border transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
