import React, { useRef, useEffect, useState, useMemo } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Share2, 
  Award} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound } from '../../utils/helpers';
import { PRACTICE_TRACKS } from '../../data/tracksData';
import { evaluateOperatorGamification } from '../../utils/gamificationEngine';

// Resolve an "R G B" CSS custom property to a canvas-safe rgb() string.
const cssRgb = (name: string, fallback: string): string => {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const parts = raw.split(/\s+/).map(Number);
    if (parts.length >= 3 && parts.every((n) => Number.isFinite(n))) {
      return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
    }
  } catch {
    /* fall through to the fallback */
  }
  return fallback;
};

export const OperatorFlexCardModal: React.FC = () => {
  const {
    flexCardModalOpen,
    setFlexCardModalOpen,
    machines,
    soundEnabled,
  } = useCtfStore(
    useShallow((s) => ({
      flexCardModalOpen: s.flexCardModalOpen,
      setFlexCardModalOpen: s.setFlexCardModalOpen,
      machines: s.machines,
      soundEnabled: s.soundEnabled,
    }))
  );

  const { user } = useAuthStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [, setRendering] = useState(false);

  // Compute operator gamification
  const gamification = useMemo(() => {
    return evaluateOperatorGamification({
      machines,
      unlockedTrophies: user?.unlockedTrophies,
    });
  }, [machines, user?.unlockedTrophies]);

  const callsign = user?.callsign || user?.name || 'Local Operator';
  const role = user?.role || 'Tactical CTF Operator';
  const rank = gamification.currentRank;
  const initials = callsign.slice(0, 2).toUpperCase();

  // Compute live operator metrics
  const { totalMachines, totalPwned } = useMemo(() => {
    const total = machines.length;
    const rooted = machines.filter((m) => m.status === 'root' || m.status === 'completed');
    const foothold = machines.filter((m) => m.status === 'foothold');
    return {
      totalMachines: total,
      rootedMachines: rooted,
      footholdMachines: foothold,
      totalPwned: rooted.length + foothold.length,
    };
  }, [machines]);

  const htbPwned = machines.filter(m => m.platform === 'HTB' && (m.status === 'root' || m.status === 'completed' || m.status === 'foothold')).length;
  const thmPwned = machines.filter(m => m.platform === 'THM' && (m.status === 'root' || m.status === 'completed' || m.status === 'foothold')).length;

  const oscpTrack = PRACTICE_TRACKS.find(t => t.id === 'tjnull-oscp');
  const oscpTotal = oscpTrack ? machines.filter(oscpTrack.filterFn).length : 61;
  const oscpPwned = oscpTrack ? machines.filter(oscpTrack.filterFn).filter(m => m.status === 'root' || m.status === 'completed').length : 0;
  const oscpPct = oscpTotal > 0 ? Math.round((oscpPwned / oscpTotal) * 100) : 0;

  const cptsTrack = PRACTICE_TRACKS.find(t => t.id === 'cpts-path');
  const cptsTotal = cptsTrack ? machines.filter(cptsTrack.filterFn).length : 89;
  const cptsPwned = cptsTrack ? machines.filter(cptsTrack.filterFn).filter(m => m.status === 'root' || m.status === 'completed').length : 0;
  const cptsPct = cptsTotal > 0 ? Math.round((cptsPwned / cptsTotal) * 100) : 0;

  useEffect(() => {
    if (!flexCardModalOpen) return;
    renderCanvas();
  }, [flexCardModalOpen, totalPwned, htbPwned, thmPwned, callsign, rank.tier, gamification.totalXp]);

  useEffect(() => {
    if (!flexCardModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFlexCardModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flexCardModalOpen, setFlexCardModalOpen]);


  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setRendering(true);

    const W = 1200;
    const H = 630;
    canvas.width = W;
    canvas.height = H;

    // Palette resolved from the theme tokens (canvas cannot consume Tailwind classes).
    const C = {
      bg: cssRgb('--surface-inverse', 'rgb(15, 15, 18)'),
      panel: cssRgb('--surface-inverse-elevated', 'rgb(28, 28, 33)'),
      line: cssRgb('--border-inverse', 'rgb(52, 52, 60)'),
      text: cssRgb('--text-on-inverse', 'rgb(244, 244, 245)'),
      muted: cssRgb('--text-on-inverse-muted', 'rgb(161, 161, 170)'),
      accent: cssRgb('--border-accent', 'rgb(14, 165, 233)'),
    };
    const SANS = '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif';
    const MONO = '"JetBrains Mono", ui-monospace, Consolas, monospace';

    // 1. Flat inverse background with a single hairline frame
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(20.5, 20.5, W - 41, H - 41);

    // 2. Header: avatar monogram, callsign, rank
    ctx.fillStyle = C.panel;
    ctx.strokeStyle = C.line;
    ctx.beginPath();
    ctx.roundRect(60, 55, 75, 75, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = C.text;
    ctx.font = `600 34px ${SANS}`;
    ctx.fillText(initials, 75, 105);

    ctx.fillStyle = C.text;
    ctx.font = `600 32px ${SANS}`;
    ctx.fillText(callsign, 155, 90);

    ctx.fillStyle = C.muted;
    ctx.font = `500 16px ${SANS}`;
    ctx.fillText(`${rank.tier} ${rank.title}, ${role}`, 155, 118);

    // Rank pill
    ctx.fillStyle = C.panel;
    ctx.strokeStyle = C.line;
    ctx.beginPath();
    ctx.roundRect(W - 390, 60, 330, 36, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = C.text;
    ctx.font = `500 14px ${SANS}`;
    ctx.fillText(`Tier ${rank.tier}: ${rank.title}`, W - 370, 83);

    // Subtitle
    ctx.fillStyle = C.muted;
    ctx.font = `13px ${MONO}`;
    ctx.fillText(`${gamification.totalXp.toLocaleString()} XP  ·  ${gamification.unlockedCount} trophies unlocked`, 155, 145);

    // 3. Hero stats row
    const drawStatCard = (x: number, y: number, w: number, h: number, label: string, val: string, sub: string) => {
      ctx.fillStyle = C.panel;
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = C.muted;
      ctx.font = `500 13px ${SANS}`;
      ctx.fillText(label, x + 20, y + 32);

      ctx.fillStyle = C.text;
      ctx.font = `600 44px ${MONO}`;
      ctx.fillText(val, x + 20, y + 84);

      ctx.fillStyle = C.muted;
      ctx.font = `13px ${SANS}`;
      ctx.fillText(sub, x + 20, y + 115);
    };

    drawStatCard(60, 175, 330, 140, 'Total compromised targets', `${totalPwned}`, `Roster: ${totalMachines} boot-to-root labs`);
    drawStatCard(415, 175, 330, 140, 'Hack The Box', `${htbPwned} solves`, 'Labs pwned on HTB');
    drawStatCard(770, 175, 370, 140, 'TryHackMe', `${thmPwned} solves`, 'Rooms and lab challenges');

    // 4. Track progress rows
    const drawTrackRow = (x: number, y: number, w: number, h: number, title: string, progressText: string, pct: number) => {
      ctx.fillStyle = C.panel;
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = C.text;
      ctx.font = `600 15px ${SANS}`;
      ctx.fillText(title, x + 18, y + 28);

      ctx.fillStyle = C.muted;
      ctx.font = `500 14px ${MONO}`;
      ctx.fillText(progressText, x + w - 160, y + 28);

      ctx.fillStyle = C.line;
      ctx.beginPath();
      ctx.roundRect(x + 18, y + 42, w - 36, 8, 4);
      ctx.fill();

      if (pct > 0) {
        ctx.fillStyle = C.accent;
        ctx.beginPath();
        ctx.roundRect(x + 18, y + 42, Math.max(10, ((w - 36) * pct) / 100), 8, 4);
        ctx.fill();
      }
    };

    drawTrackRow(60, 335, 510, 68, 'TJ_Null OSCP 2024 track', `${oscpPwned}/${oscpTotal} (${oscpPct}%)`, Math.max(12, oscpPct));
    drawTrackRow(595, 335, 545, 68, 'CPTS trophy room track', `${cptsPwned}/${cptsTotal} (${cptsPct}%)`, Math.max(8, cptsPct));

    // 5. Unlocked trophies (or default focus areas)
    const drawSkillBadge = (x: number, y: number, text: string) => {
      ctx.fillStyle = C.panel;
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, 245, 38, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = C.text;
      ctx.font = `500 12px ${SANS}`;
      ctx.fillText(text, x + 15, y + 24);
    };

    const defaultBadges = [
      'Active Directory (BloodHound)',
      'Web apps (SQLi, RCE, SSRF)',
      'Linux privesc (SUID, kernel)',
      'Windows privesc (tokens, DPAPI)',
    ];
    const topTrophies = gamification.trophies.filter((t) => t.unlocked).slice(0, 4);
    if (topTrophies.length >= 2) {
      topTrophies.forEach((t, idx) => {
        drawSkillBadge(60 + idx * 265, 420, t.definition.title);
      });
      for (let i = topTrophies.length; i < 4; i++) {
        drawSkillBadge(60 + i * 265, 420, defaultBadges[i]);
      }
    } else {
      defaultBadges.forEach((text, i) => drawSkillBadge(60 + i * 265, 420, text));
    }

    // 6. Footer
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 485);
    ctx.lineTo(W - 60, 485);
    ctx.stroke();

    ctx.fillStyle = C.text;
    ctx.font = `600 14px ${SANS}`;
    ctx.fillText('ZeroBox', 60, 520);

    ctx.fillStyle = C.muted;
    ctx.font = `12px ${SANS}`;
    ctx.fillText('Built by Daniel Dayan (@0xdnd)  ·  0xdnd.github.io', 60, 545);

    ctx.fillStyle = C.muted;
    ctx.font = `13px ${MONO}`;
    ctx.fillText('ctftracker.com', W - 180, 535);

    setRendering(false);
  };

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    const cleanSlug = callsign.toLowerCase().replace(/[^a-z0-9]/g, '-');
    a.download = `ZeroBox-Operator-Card-${cleanSlug}-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (soundEnabled) playCyberSound('root');
  };

  const handleCopyPng = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setCopied(true);
          if (soundEnabled) playCyberSound('copy');
          setTimeout(() => setCopied(false), 2500);
        } catch (err) {
          console.error('Failed to copy image to clipboard:', err);
        }
      });
    } catch (err) {
      console.error('Failed to copy image to clipboard:', err);
    }
  };

  const handleShareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=https://ctftracker.com/`, '_blank');
    if (soundEnabled) playCyberSound('click');
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent('Tracking my offensive security labs and CTF solves on ZeroBox by @0xdnd! Check out the open platform:');
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=https://ctftracker.com/`, '_blank');
    if (soundEnabled) playCyberSound('click');
  };

  if (!flexCardModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-surface-inverse/60 backdrop-blur-md animate-fade-in font-sans" onClick={() => setFlexCardModalOpen(false)}>
      <div 
        className="w-full max-w-4xl max-h-[95vh] flex flex-col rounded-2xl border border-subtle bg-surface-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-subtle px-4 py-3 bg-surface-card">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-muted" />
            <h2 className="font-semibold text-primary text-sm tracking-[-0.01em]">
              Achievement card
            </h2>
          </div>

          <button
            onClick={() => setFlexCardModalOpen(false)}
            className="p-1.5 max-sm:p-3 rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-[transform,background-color,border-color,color] active:scale-[0.97]"
            aria-label="Close achievement card"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Canvas Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col items-center space-y-3">
          <div className="relative w-full max-w-3xl rounded-xl border border-subtle overflow-hidden bg-surface-inverse">
            <canvas 
              ref={canvasRef} 
              className="w-full h-auto block"
              style={{ aspectRatio: '1200 / 630' }}
            />
          </div>

          <p className="text-muted text-xs text-center max-w-xl">
            Export a 1200x630 social card with your verified solve record for LinkedIn, X or Discord.
          </p>
        </div>

        {/* Action Buttons Footer */}
        <div className="px-4 py-3 bg-surface-card border-t border-subtle flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPng}
              className="px-3.5 py-1.5 max-sm:py-3 rounded-lg bg-accent text-on-accent font-medium hover:brightness-110 transition-[transform,filter] active:scale-[0.97] flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download PNG</span>
            </button>

            <button
              onClick={handleCopyPng}
              className="px-3.5 py-1.5 max-sm:py-3 rounded-lg bg-surface-card border border-subtle hover:border-strong text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97] flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-callout-success-fg" />
                  <span className="text-callout-success-fg font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy image</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareLinkedIn}
              className="px-3.5 py-1.5 max-sm:py-3 rounded-lg bg-surface-card hover:bg-surface-hover border border-subtle text-primary font-medium transition-[transform,background-color,border-color,color] active:scale-[0.97] flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share on LinkedIn</span>
            </button>

            <button
              onClick={handleShareTwitter}
              className="px-3.5 py-1.5 max-sm:py-3 rounded-lg bg-surface-card hover:bg-surface-hover border border-subtle text-primary font-medium transition-[transform,background-color,border-color,color] active:scale-[0.97] flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span>Share on X</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
