import React, { useRef, useEffect, useState, useMemo } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Share2, 
  Sparkles, 
  ShieldCheck, 
  Award, 
  Terminal, 
  ExternalLink 
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound } from '../../utils/helpers';
import { PRACTICE_TRACKS } from '../../data/tracksData';

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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [rendering, setRendering] = useState(false);

  // Compute live operator metrics
  const { totalMachines, rootedMachines, footholdMachines, totalPwned } = useMemo(() => {
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
  }, [flexCardModalOpen, totalPwned, htbPwned, thmPwned]);

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

    // 1. Dark Cyber Background
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#060913');
    bgGrad.addColorStop(0.5, '#0b1120');
    bgGrad.addColorStop(1, '#05070d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Subtle Grid overlay
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // 3. Neon Cyber Borders
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, W - 40, H - 40);

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(28, 28, W - 56, H - 56);

    // Corner decorative brackets
    const drawBracket = (cx: number, cy: number, size: number) => {
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy + (cy < H / 2 ? size : -size));
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + (cx < W / 2 ? size : -size), cy);
      ctx.stroke();
    };
    drawBracket(20, 20, 25);
    drawBracket(W - 20, 20, 25);
    drawBracket(20, H - 20, 25);
    drawBracket(W - 20, H - 20, 25);

    // 4. Header Bar
    // Avatar Pill
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(60, 55, 75, 75, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('DD', 75, 107);

    // Operator Title & Callsign
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px monospace';
    ctx.fillText('Daniel Dayan', 155, 90);

    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('@0xdnd // ZeroBox', 155, 118);

    // Security Clearance Badge
    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(W - 380, 60, 320, 36, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('★ VERIFIED OPERATOR RECORD ★', W - 355, 84);

    // Platform Subtitle
    ctx.fillStyle = '#9ca3af';
    ctx.font = '13px monospace';
    ctx.fillText('ZEROBOX // TACTICAL CYBER OPERATIONS SUITE', 155, 145);

    // 5. Hero Stats Row (Three main cyber boxes)
    // Box 1: Total Pwns
    const drawStatCard = (x: number, y: number, w: number, h: number, label: string, val: string, sub: string, color: string) => {
      ctx.fillStyle = 'rgba(13, 18, 31, 0.85)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#9ca3af';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(label.toUpperCase(), x + 20, y + 32);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px monospace';
      ctx.fillText(val, x + 20, y + 84);

      ctx.fillStyle = color;
      ctx.font = 'bold 13px monospace';
      ctx.fillText(sub, x + 20, y + 115);
    };

    drawStatCard(60, 175, 330, 140, 'Total Compromised Targets', `${totalPwned}`, `ROSTER: ${totalMachines} BOOT-TO-ROOT LABS`, '#10b981');
    drawStatCard(415, 175, 330, 140, 'Hack The Box Infiltration', `${htbPwned} Solves`, 'HTB CERTIFIED LABS PWNED', '#06b6d4');
    drawStatCard(770, 175, 370, 140, 'TryHackMe Network Pwns', `${thmPwned} Solves`, 'THM ROOMS & LAB CHALLENGES', '#ef4444');

    // 6. Syllabus Mastery Cards
    const drawTrackRow = (x: number, y: number, w: number, h: number, title: string, progressText: string, pct: number, color: string) => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(title, x + 18, y + 28);

      ctx.fillStyle = color;
      ctx.font = 'bold 14px monospace';
      ctx.fillText(progressText, x + w - 160, y + 28);

      // Progress bar background
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(x + 18, y + 42, w - 36, 8, 4);
      ctx.fill();

      // Progress bar fill
      if (pct > 0) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x + 18, y + 42, Math.max(10, ((w - 36) * pct) / 100), 8, 4);
        ctx.fill();
      }
    };

    drawTrackRow(60, 335, 510, 68, '🎯 TJ_Null OSCP 2024 Track', `${oscpPwned}/${oscpTotal} (${oscpPct}%)`, Math.max(12, oscpPct), '#10b981');
    drawTrackRow(595, 335, 545, 68, '🏆 CPTS Trophy Room Track', `${cptsPwned}/${cptsTotal} (${cptsPct}%)`, Math.max(8, cptsPct), '#06b6d4');

    // 7. Tactical Expertise Metrics
    const drawSkillBadge = (x: number, y: number, text: string, color: string) => {
      ctx.fillStyle = 'rgba(13, 21, 38, 0.8)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, 245, 38, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(text, x + 15, y + 24);
    };

    drawSkillBadge(60, 420, '⚡ Active Directory // BloodHound', '#a855f7');
    drawSkillBadge(325, 420, '🌐 Web Apps // SQLi, RCE, SSRF', '#06b6d4');
    drawSkillBadge(590, 420, '🐧 Linux PrivEsc // SUID & Kernel', '#ef4444');
    drawSkillBadge(855, 420, '🪟 Windows PrivEsc // Tokens & DPAPI', '#3b82f6');

    // 8. Footer Watermark
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 485);
    ctx.lineTo(W - 60, 485);
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('ZEROBOX SUITE // ZERO-KNOWLEDGE TACTICAL STATION', 60, 520);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px monospace';
    ctx.fillText('Architected & Built by Daniel Dayan (@0xdnd) • 0xdnd.github.io', 60, 545);

    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('0xdnd.github.io/ctf-tracker', W - 310, 535);

    setRendering(false);
  };

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `ZeroBox-Operator-Card-0xdnd-${new Date().toISOString().slice(0, 10)}.png`;
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
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopied(true);
        if (soundEnabled) playCyberSound('copy');
        setTimeout(() => setCopied(false), 2500);
      });
    } catch (err) {
      console.error('Failed to copy image to clipboard:', err);
    }
  };

  const handleShareLinkedIn = () => {
    const text = encodeURIComponent('Tracking my offensive security machine solves, OSCP/CPTS prep, and penetration testing labs with ZeroBox by Daniel Dayan (@0xdnd)! Check it out: https://0xdnd.github.io/ctf-tracker/');
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=https://0xdnd.github.io/ctf-tracker/`, '_blank');
    if (soundEnabled) playCyberSound('click');
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent('Tracking my offensive security labs and CTF solves on ZeroBox by @0xdnd! Check out the open platform:');
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=https://0xdnd.github.io/ctf-tracker/`, '_blank');
    if (soundEnabled) playCyberSound('click');
  };

  if (!flexCardModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-mono" onClick={() => setFlexCardModalOpen(false)}>
      <div 
        className="w-full max-w-4xl max-h-[95vh] flex flex-col rounded-2xl border border-cyber-emerald/50 bg-[#0b101c] shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-cyber-border/80 px-5 py-3.5 bg-[#080c14]">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-emerald animate-pulse shadow-glow-emerald" />
            <Award className="w-4 h-4 text-cyber-emerald" />
            <span className="font-bold text-cyber-emerald tracking-wide text-xs uppercase">
              OPERATOR ACHIEVEMENTS // SHARABLE FLEX CARD
            </span>
          </div>

          <button
            onClick={() => setFlexCardModalOpen(false)}
            className="p-1.5 rounded-lg text-cyber-muted hover:text-white hover:bg-cyber-card transition-all"
            title="Close (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Canvas Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center space-y-4">
          <div className="relative w-full max-w-3xl rounded-xl border border-cyber-emerald/40 overflow-hidden shadow-2xl bg-black">
            <canvas 
              ref={canvasRef} 
              className="w-full h-auto block"
              style={{ aspectRatio: '1200 / 630' }}
            />
          </div>

          <p className="text-cyber-muted text-xs text-center max-w-xl">
            Export a high-resolution 1200x630 OpenGraph social card to showcase your verified CTF solved record on <strong>LinkedIn</strong>, <strong>Twitter/X</strong>, and <strong>Discord</strong>.
          </p>
        </div>

        {/* Action Buttons Footer */}
        <div className="px-5 py-3.5 bg-[#080c14] border-t border-cyber-border/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPng}
              className="px-4 py-2 rounded-xl bg-cyber-emerald text-black font-extrabold hover:bg-cyber-emerald/90 transition-all flex items-center gap-2 shadow-glow-emerald"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>DOWNLOAD PNG (1200x630)</span>
            </button>

            <button
              onClick={handleCopyPng}
              className="px-3.5 py-2 rounded-xl bg-cyber-card border border-cyber-border hover:border-cyber-cyan text-white hover:text-cyber-cyan transition-all flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-cyber-emerald" />
                  <span className="text-cyber-emerald font-bold">COPIED TO CLIPBOARD!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>COPY IMAGE</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareLinkedIn}
              className="px-3.5 py-2 rounded-xl bg-[#0077B5]/20 hover:bg-[#0077B5]/35 border border-[#0077B5]/50 text-white font-bold transition-all flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5 text-[#0077B5]" />
              <span>Share on LinkedIn</span>
            </button>

            <button
              onClick={handleShareTwitter}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold transition-all flex items-center gap-1.5"
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
