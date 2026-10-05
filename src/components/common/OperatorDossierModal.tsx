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
        className="fixed inset-0 bg-surface-inverse/60 transition-opacity animate-in fade-in"
        onClick={() => setOperatorModalOpen(false)}
      />

      {/* Modal Dossier Card */}
      <div className="relative w-full max-w-3xl my-auto bg-surface-card border border-subtle rounded-2xl text-primary overflow-hidden z-10 flex flex-col max-h-[90vh] shadow-2xl">
        
        {/* Header */}
        <div className="px-4 py-3 bg-surface-card border-b border-subtle flex items-center justify-between select-none">
          <h2 className="text-sm font-semibold text-primary tracking-[-0.01em]">
            Creator dossier
          </h2>

          <button
            onClick={() => setOperatorModalOpen(false)}
            className="p-1.5 max-sm:p-3 rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer"
            aria-label="Close dossier"
            title="Close dossier (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Dossier Content */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-5 font-sans text-xs scrollbar-thin">
          
          {/* Hero Profile Banner */}
          <div className="p-4 sm:p-5 rounded-xl bg-surface-card border border-subtle relative overflow-hidden">
            <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-3.5 sm:gap-4 text-center sm:text-left">
              {/* Tactical Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-surface-inverse border border-inverse flex items-center justify-center">
                  <span className="font-semibold text-xl text-on-inverse tracking-tight">
                    DD
                  </span>
                </div>
                
              </div>

              {/* Operator Identity Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-lg sm:text-xl font-semibold text-primary">
                    Daniel Dayan
                  </h2>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-sunken text-secondary border border-subtle flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Creator and architect
                  </span>
                </div>

                <div className="text-xs text-secondary font-medium flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Callsign: <strong className="text-primary font-mono">0xdnd</strong> (Specter)</span>
                  <span className="text-muted">•</span>
                  <span>Cybersecurity researcher and penetration tester</span>
                </div>

                <p className="text-xs text-muted leading-relaxed pt-0.5">
                  Creator and lead developer of <strong className="font-medium text-primary">ZeroBox</strong>, an offline CTF and lab operations dashboard. Focused on offensive security, penetration testing and exploit engineering.
                </p>
              </div>
            </div>
          </div>

          {/* Primary Featured Portfolio Action Banner */}
          <div className="p-4 rounded-xl bg-surface-card border border-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-9 h-9 rounded-lg bg-surface-sunken border border-subtle flex items-center justify-center flex-shrink-0 text-muted">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-primary text-sm flex items-center justify-center sm:justify-start gap-1.5">
                  <span>Portfolio</span>
                </div>
                <div className="text-muted text-[11px]">
                  Live projects, certifications and security research.
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto flex-shrink-0">
              <a
                href={links.coffee}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-3.5 py-1.5 max-sm:py-3 rounded-lg font-medium text-xs bg-surface-card hover:bg-surface-hover border border-subtle text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97] flex items-center justify-center gap-1.5 flex-shrink-0"
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Buy me a coffee</span>
              </a>
              <a
                href={links.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-3.5 py-1.5 max-sm:py-3 rounded-lg font-medium text-xs bg-accent hover:brightness-110 text-on-accent transition-[transform,filter] active:scale-[0.97] flex items-center justify-center gap-1.5 flex-shrink-0"
              >
                <span>Open portfolio</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* 4-Column External Tactical Resource Grid */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Profiles and platforms
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Portfolio */}
              <div className="p-3 rounded-xl bg-surface-card border border-subtle hover:border-strong transition-colors group flex items-center justify-between">
                <a
                  href={links.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 min-w-0 flex-1 mr-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-surface-sunken border border-subtle flex items-center justify-center text-secondary">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-primary flex items-center gap-1.5">
                      <span>Portfolio website</span>
                      <ExternalLink className="w-3 h-3 text-muted opacity-60" />
                    </div>
                    <div className="text-[11px] text-muted truncate">0xdnd.github.io</div>
                  </div>
                </a>
                <button
                  onClick={(e) => handleCopyLink(e, links.portfolio, 'portfolio')}
                  className="p-1.5 max-sm:p-3 rounded-lg bg-surface-card hover:bg-surface-hover text-muted hover:text-primary border border-subtle transition-colors flex-shrink-0"
                  aria-label="Copy portfolio URL"
                  title="Copy portfolio URL"
                >
                  {copiedField === 'portfolio' ? <Check className="w-3.5 h-3.5 text-callout-success-fg" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* LinkedIn */}
              <div className="p-3 rounded-xl bg-surface-card border border-subtle transition-colors group flex items-center justify-between">
                <a
                  href={links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 min-w-0 flex-1 mr-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-surface-sunken border border-subtle flex items-center justify-center text-secondary">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.7a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z"/></svg>
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-primary transition-colors flex items-center gap-1.5">
                      <span>LinkedIn profile</span>
                      <ExternalLink className="w-3 h-3 text-muted opacity-60" />
                    </div>
                    <div className="text-[11px] text-muted truncate">daniel-dayan-a66322352</div>
                  </div>
                </a>
                <button
                  onClick={(e) => handleCopyLink(e, links.linkedin, 'linkedin')}
                  className="p-1.5 max-sm:p-3 rounded-lg bg-surface-card hover:bg-surface-hover text-muted hover:text-primary border border-subtle transition-colors flex-shrink-0"
                  aria-label="Copy LinkedIn URL"
                  title="Copy LinkedIn URL"
                >
                  {copiedField === 'linkedin' ? <Check className="w-3.5 h-3.5 text-callout-success-fg" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* GitHub */}
              <div className="p-3 rounded-xl bg-surface-card border border-subtle hover:border-strong transition-colors group flex items-center justify-between">
                <a
                  href={links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 min-w-0 flex-1 mr-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-surface-sunken border border-subtle flex items-center justify-center text-secondary">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-primary flex items-center gap-1.5">
                      <span>GitHub repositories</span>
                      <ExternalLink className="w-3 h-3 text-muted opacity-60" />
                    </div>
                    <div className="text-[11px] text-muted truncate">github.com/0xdnd</div>
                  </div>
                </a>
                <button
                  onClick={(e) => handleCopyLink(e, links.github, 'github')}
                  className="p-1.5 max-sm:p-3 rounded-lg bg-surface-card hover:bg-surface-hover text-muted hover:text-primary border border-subtle transition-colors flex-shrink-0"
                  aria-label="Copy GitHub URL"
                  title="Copy GitHub URL"
                >
                  {copiedField === 'github' ? <Check className="w-3.5 h-3.5 text-callout-success-fg" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* CTF Writeups */}
              <div className="p-3 rounded-xl bg-surface-card border border-subtle hover:border-strong transition-colors group flex items-center justify-between">
                <a
                  href={links.writeups}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 min-w-0 flex-1 mr-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-surface-sunken border border-subtle flex items-center justify-center text-secondary">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-primary flex items-center gap-1.5">
                      <span>CTF writeups</span>
                      <ExternalLink className="w-3 h-3 text-muted opacity-60" />
                    </div>
                    <div className="text-[11px] text-muted truncate">0xdnd.gitbook.io</div>
                  </div>
                </a>
                <button
                  onClick={(e) => handleCopyLink(e, links.writeups, 'writeups')}
                  className="p-1.5 max-sm:p-3 rounded-lg bg-surface-card hover:bg-surface-hover text-muted hover:text-primary border border-subtle transition-colors flex-shrink-0"
                  aria-label="Copy GitBook writeups URL"
                  title="Copy GitBook writeups URL"
                >
                  {copiedField === 'writeups' ? <Check className="w-3.5 h-3.5 text-callout-success-fg" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Sponsor card */}
              <div className="sm:col-span-2 p-3.5 rounded-xl bg-surface-card border border-subtle hover:border-strong transition-colors group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <a
                  href={links.coffee}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 min-w-0 flex-1"
                >
                  <div className="w-8 h-8 rounded-lg bg-surface-sunken border border-subtle flex items-center justify-center text-secondary flex-shrink-0">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-primary flex items-center gap-1.5 text-xs">
                      <span>Sponsor Daniel Dayan</span>
                      <ExternalLink className="w-3 h-3 text-muted opacity-60" />
                    </div>
                    <div className="text-[11px] text-muted truncate">buymeacoffee.com/0xdnd. Supports open-source offensive security tools.</div>
                  </div>
                </a>
                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-shrink-0">
                  <button
                    onClick={(e) => handleCopyLink(e, links.coffee, 'coffee')}
                    className="p-1.5 max-sm:p-3 rounded-lg bg-surface-card hover:bg-surface-hover text-muted hover:text-primary border border-subtle transition-colors flex-shrink-0 cursor-pointer"
                    aria-label="Copy Buy Me a Coffee URL"
                    title="Copy Buy Me a Coffee URL"
                  >
                    {copiedField === 'coffee' ? <Check className="w-3.5 h-3.5 text-callout-success-fg" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={links.coffee}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 max-sm:py-3 rounded-lg bg-surface-sunken hover:bg-surface-hover border border-subtle text-primary font-medium text-xs transition-[transform,background-color] active:scale-[0.97] flex items-center gap-1.5"
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    <span>Sponsor</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Key Operator Technical Highlights */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted flex items-center gap-1.5">
              <Award className="w-3 h-3" /> Track record and architecture
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-surface-card border border-subtle space-y-0.5">
                <div className="text-primary font-semibold text-base font-mono tabular-nums">63 pwns</div>
                <div className="text-primary font-medium text-xs">45 HTB + 18 THM solves</div>
                <div className="text-[11px] text-muted">Verified pwned targets in active tracker roster.</div>
              </div>

              <div className="p-3 rounded-xl bg-surface-card border border-subtle space-y-0.5">
                <div className="text-primary font-semibold text-base font-mono tabular-nums">8 phases</div>
                <div className="text-primary font-medium text-xs">Offensive methodology</div>
                <div className="text-[11px] text-muted">End-to-end framework from reconnaissance to exfiltration.</div>
              </div>

              <div className="p-3 rounded-xl bg-surface-card border border-subtle space-y-0.5">
                <div className="text-primary font-semibold text-base">Zero egress</div>
                <div className="text-primary font-medium text-xs">Local-first engine</div>
                <div className="text-[11px] text-muted">Offline-first Zustand state. No data leaves this machine.</div>
              </div>
            </div>
          </div>

          {/* Creator Notes / Philosophy */}
          <div className="p-3.5 rounded-xl bg-surface-card border border-subtle space-y-1">
            <div className="text-xs font-medium text-muted flex items-center gap-1.5">
              <Cpu className="w-3 h-3" /> Why ZeroBox exists
            </div>
            <p className="text-muted text-[11px] leading-relaxed">
              "I built ZeroBox because offensive security operators need a single, lightning-fast workspace that keeps track of target states, automatically injects VPN IP parameters into payload commands, and structures machine lifecycles without friction or tedious note-taking."
            </p>
            <div className="text-[11px] text-secondary font-medium text-right">
              Daniel Dayan (@0xdnd)
            </div>
          </div>

          {/* Legal & Non-Commercial License Protection Covenant */}
          <div className="p-3.5 rounded-xl bg-surface-card border border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-sunken border border-subtle flex items-center justify-center text-secondary flex-shrink-0 mt-0.5 sm:mt-0">
                <Scale className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-primary text-xs">Non-commercial source-available license (ZNSL 1.0)</span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed max-w-xl">
                  ZeroBox is authored by Daniel Dayan for personal and educational research. Commercial use, reselling, paid course bundling and public re-hosting are not permitted.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setOperatorModalOpen(false);
                setLicenseModalOpen(true);
                if (soundEnabled) playCyberSound('click');
              }}
              className="w-full sm:w-auto px-3.5 py-1.5 max-sm:py-3 rounded-lg text-xs font-medium bg-surface-sunken hover:bg-surface-hover text-primary border border-subtle transition-[transform,background-color] active:scale-[0.97] flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>View license</span>
            </button>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-subtle flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-muted">
            ZeroBox v2.0, designed and built by Daniel Dayan
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setOperatorModalOpen(false);
                setLicenseModalOpen(true);
                if (soundEnabled) playCyberSound('click');
              }}
              className="px-3 py-1.5 max-sm:py-3 rounded-lg text-xs font-medium bg-surface-card hover:bg-surface-hover text-secondary border border-subtle transition-colors flex items-center gap-1.5"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>License</span>
            </button>

            <a
              href={links.portfolio}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 max-sm:py-3 rounded-lg text-xs font-medium bg-surface-card hover:bg-surface-hover text-secondary border border-subtle transition-colors flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>0xdnd.github.io</span>
            </a>

            <button
              onClick={() => setOperatorModalOpen(false)}
              className="px-3 py-1.5 max-sm:py-3 rounded-lg text-xs font-medium bg-surface-card hover:bg-surface-hover text-primary border border-subtle transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
