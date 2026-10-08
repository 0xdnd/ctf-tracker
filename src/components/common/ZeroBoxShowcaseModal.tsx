import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Sparkles, 
  Film, 
  Download, 
  Radio, 
  Terminal, 
  Activity, 
  ShieldCheck,
  Maximize2
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { playCyberSound } from '../../utils/helpers';

export const ZeroBoxShowcaseModal: React.FC = () => {
  const showcaseModalOpen = useCtfStore((s) => s.showcaseModalOpen);
  const setShowcaseModalOpen = useCtfStore((s) => s.setShowcaseModalOpen);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChapter, setCurrentChapter] = useState<number>(1);

  // Keyboard accessibility: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowcaseModalOpen(false);
      }
    };
    if (showcaseModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showcaseModalOpen, setShowcaseModalOpen]);

  // Pause video automatically when modal closes
  useEffect(() => {
    if (!showcaseModalOpen && videoRef.current) {
      videoRef.current.pause();
    }
  }, [showcaseModalOpen]);

  if (!showcaseModalOpen) return null;

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setShowcaseModalOpen(false);
    if (soundEnabled) playCyberSound('click');
  };

  const jumpToTime = (seconds: number, chapterIndex: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setCurrentChapter(chapterIndex);
      if (soundEnabled) playCyberSound('click');
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        videoRef.current.requestFullscreen().catch(() => {});
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="showcase-modal-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md"
      onClick={handleClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl rounded-2xl bg-surface-card border border-subtle dark:border-cyber-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-subtle dark:border-cyber-border bg-surface-sunken">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyber-emerald/15 border border-cyber-emerald/30 flex items-center justify-center text-cyber-emerald flex-shrink-0 shadow-glow-emerald">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="showcase-modal-title"
                  className="text-sm font-bold tracking-wide text-primary font-mono uppercase"
                >
                  ZeroBox // AI Video Showcase
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <Sparkles className="w-2.5 h-2.5" />
                  Nano Banana AI
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                  1080p FHD
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Cinematic CTF telemetry, zero-day exploitation, and live workflow demo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`${import.meta.env.BASE_URL}videos/zerobox-nanobanana-showcase-1080p.mp4`}
              download="zerobox-nanobanana-showcase-1080p.mp4"
              title="Download Full HD 1080p Video"
              className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-secondary hover:text-primary bg-surface-hover hover:bg-surface-sunken border border-subtle transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>MP4 (24MB)</span>
            </a>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close video showcase"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-hover border border-subtle transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Player Container */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden group">
          <video
            ref={videoRef}
            src={`${import.meta.env.BASE_URL}videos/zerobox-nanobanana-showcase-1080p.mp4`}
            poster={`${import.meta.env.BASE_URL}images/nanobanana-act1-threatglobe.webp`}
            controls
            autoPlay
            playsInline
            preload="metadata"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="w-full h-full object-contain"
          />

          {/* Quick Fullscreen Button Overlay */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title="Toggle Theater Fullscreen"
            aria-label="Toggle Fullscreen"
            className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 hover:bg-black/85 text-white/80 hover:text-white border border-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Chapters Navigation & Storyboard Controls */}
        <div className="px-5 py-3.5 bg-surface-sunken border-t border-subtle dark:border-cyber-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-muted tracking-wider uppercase flex items-center gap-2">
            <span>Chapters:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {[
              {
                id: 1,
                time: 0,
                label: 'Global Telemetry',
                icon: Radio,
                desc: 'Threat Globe',
              },
              {
                id: 2,
                time: 7.3,
                label: 'Root Exploit',
                icon: Terminal,
                desc: 'Quantum Core',
              },
              {
                id: 3,
                time: 15.5,
                label: 'Live Platform',
                icon: Activity,
                desc: 'ZeroBox UI',
              },
              {
                id: 4,
                time: 23.1,
                label: 'Titanium Crest',
                icon: ShieldCheck,
                desc: 'Grand Finale',
              },
            ].map((chapter) => {
              const Icon = chapter.icon;
              const active = currentChapter === chapter.id;
              return (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => jumpToTime(chapter.time, chapter.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    active
                      ? 'bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald/40 shadow-glow-emerald font-bold'
                      : 'bg-surface-card hover:bg-surface-hover text-secondary hover:text-primary border border-subtle'
                  }`}
                  title={`Jump to ${chapter.label} (${chapter.desc})`}
                >
                  <Icon className="w-3 h-3 flex-shrink-0" />
                  <span className="hidden md:inline">{chapter.label}</span>
                  <span className="md:hidden">Act {chapter.id}</span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
