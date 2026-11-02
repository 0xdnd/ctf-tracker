import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Home,
  Search,
  ArrowLeft,
  Database,
  Layers,
  Terminal,
  BookOpen,
  ShieldAlert,
  GraduationCap,
  Activity
} from 'lucide-react';
import { useCtfStore } from '../store/useCtfStore';
import { playCyberSound } from '../utils/helpers';
import { CyberButton } from '../components/common/CyberButton';

interface QuickLink {
  path: string;
  name: string;
  description: string;
  icon: React.ElementType;
}

const QUICK_LINKS: QuickLink[] = [
  { path: '/tracker', name: 'Machine Tracker', description: 'HTB and THM targets, Kanban and table views', icon: Home },
  { path: '/vault', name: 'Evidence Vault', description: 'Stored credentials, flags, hashes and findings', icon: Database },
  { path: '/methodology', name: 'Methodology', description: 'Attack lifecycle checklists and commands', icon: Layers },
  { path: '/cheatsheets', name: 'Cheatsheets', description: 'Offensive command templates and payloads', icon: Terminal },
  { path: '/notes', name: 'Notes', description: 'Your imported Obsidian vault and your own notes', icon: BookOpen },
  { path: '/writeup', name: 'Writeup Studio', description: 'Markdown reporting and documentation editor', icon: ShieldAlert },
  { path: '/exam', name: 'Exam Simulator', description: 'Practice certification exams under time pressure', icon: GraduationCap },
  { path: '/analytics', name: 'Analytics', description: 'Skill radar, solve heatmap and benchmarks', icon: Activity },
];

export const NotFoundPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const setCommandPaletteOpen = useCtfStore((s) => s.setCommandPaletteOpen);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);

  const currentPath = useMemo(() => {
    const raw = (location.pathname + location.hash).replace(/^#\/?/, '/');
    return raw || '/unknown';
  }, [location.pathname, location.hash]);

  // Clean suggestion matching
  const suggestedMatch = useMemo<QuickLink | null>(() => {
    const lower = currentPath.toLowerCase();
    if (lower.includes('vault') || lower.includes('loot') || lower.includes('evidence') || lower.includes('cred')) {
      return QUICK_LINKS.find(r => r.path === '/vault') || null;
    }
    if (lower.includes('cheat') || lower.includes('shell') || lower.includes('payload') || lower.includes('rev')) {
      return QUICK_LINKS.find(r => r.path === '/cheatsheets') || null;
    }
    if (lower.includes('manual') || lower.includes('note') || lower.includes('cpts') || lower.includes('obsidian')) {
      return QUICK_LINKS.find(r => r.path === '/notes') || null;
    }
    if (lower.includes('method') || lower.includes('recon') || lower.includes('ptes')) {
      return QUICK_LINKS.find(r => r.path === '/methodology') || null;
    }
    if (lower.includes('write') || lower.includes('report') || lower.includes('doc')) {
      return QUICK_LINKS.find(r => r.path === '/writeup') || null;
    }
    if (lower.includes('exam') || lower.includes('oscp') || lower.includes('cert')) {
      return QUICK_LINKS.find(r => r.path === '/exam') || null;
    }
    if (lower.includes('stat') || lower.includes('radar') || lower.includes('analytic')) {
      return QUICK_LINKS.find(r => r.path === '/analytics') || null;
    }
    if (lower.includes('box') || lower.includes('machine') || lower.includes('target') || lower.includes('htb') || lower.includes('thm')) {
      return QUICK_LINKS.find(r => r.path === '/tracker') || null;
    }
    return null;
  }, [currentPath]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (soundEnabled) playCyberSound('click');
        navigate('/tracker');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (soundEnabled) playCyberSound('click');
        navigate(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, soundEnabled]);

  const handleNavigate = (path: string) => {
    if (soundEnabled) playCyberSound('click');
    navigate(path);
  };

  // The tracker reads ?q= into its search box.
  const [term, setTerm] = useState('');
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim().slice(0, 100);
    handleNavigate(q ? `/tracker?q=${encodeURIComponent(q)}` : '/tracker');
  };

  // Entrance: one drop with a settling tilt (transform and opacity, ease-out, no bounce). Reduced motion: a plain fade.
  const reduceMotion = useReducedMotion();
  const dropIn = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2, ease: 'easeOut' as const } }
    : {
        initial: { opacity: 0, transform: 'translateY(-16px) rotate(-3deg)' },
        animate: { opacity: 1, transform: 'translateY(0px) rotate(0deg)' },
        transition: { duration: 0.42, delay: 0.06, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
      };

  // A very slight tilt that follows the pointer: fine, hover-capable pointers only, never under reduced motion.
  const cardRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const tiltTo = (x: number, y: number) => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (cardRef.current) cardRef.current.style.transform = `rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg)`;
    });
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const handlePointerMove = (e: React.PointerEvent) => {
    const card = cardRef.current;
    if (!card || reduceMotion || typeof window.matchMedia !== 'function') return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const r = card.getBoundingClientRect();
    const x = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5));
    const y = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5));
    tiltTo(x, y);
  };

  // Always rendered as text; long paths are cut at 80 characters.
  const shownPath = currentPath.length > 80 ? currentPath.slice(0, 79) + '…' : currentPath;

  return (
    <div className="mx-auto w-full max-w-lg px-1 pb-12 pt-6 text-center sm:px-0 sm:pt-14">
      <p aria-hidden="true" className="select-none text-7xl font-medium leading-none tracking-tighter text-muted tabular-nums sm:text-8xl">
        404
      </p>
      <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-primary [text-wrap:balance] sm:text-3xl">
        This one isn&apos;t on the board
      </h1>
      <p className="mx-auto mt-3 max-w-[44ch] text-sm leading-relaxed text-secondary sm:text-base">
        Nothing lives at this address. The link may be old or mistyped.
      </p>

      {/* The missing address, drawn as a tracker card */}
      <motion.div
        {...dropIn}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => tiltTo(0, 0)}
        className="mx-auto mt-6 max-w-sm text-left [perspective:900px]"
      >
        <div
          ref={cardRef}
          role="group"
          aria-label="The address you asked for"
          className="surface-card-depth rounded-2xl border border-subtle bg-surface-card p-4 shadow-md transition-transform duration-200 ease-out"
        >
          <div className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full border border-strong bg-surface-hover" />
            <code className="min-w-0 break-all font-mono text-sm font-semibold leading-6 text-primary" title={currentPath}>
              {shownPath}
            </code>
          </div>
          <dl className="mt-3 flex items-baseline gap-3 pl-4 text-xs">
            <dt className="font-semibold text-muted">IP</dt>
            <dd className="font-mono tabular-nums text-secondary">404.404.404.404</dd>
          </dl>
          <ul className="mt-3 flex flex-wrap gap-2 pl-4">
            {['Not found', 'No foothold'].map((pill) => (
              <li key={pill} className="rounded-md border border-subtle bg-surface-sunken px-1.5 py-0.5 text-xs font-medium text-secondary">
                {pill}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Search the tracker */}
      <form role="search" onSubmit={handleSearch} className="mx-auto mt-6 max-w-sm text-left">
        <label htmlFor="nf-search" className="mb-1 block text-xs font-semibold text-secondary">
          Search your machines
        </label>
        <div className="flex gap-2">
          <input
            id="nf-search"
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
            placeholder="Name, IP or tag"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-strong bg-surface-sunken px-3 text-base text-primary placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:text-sm"
          />
          <CyberButton type="submit" variant="secondary" size="md" iconLeft={<Search className="h-4 w-4" />} className="min-h-11 shrink-0">
            Search
          </CyberButton>
        </div>
      </form>

      {suggestedMatch && (
        <p className="mt-2 text-center text-sm text-secondary">
          Did you mean{' '}
          <Link
            to={suggestedMatch.path}
            onClick={() => soundEnabled && playCyberSound('click')}
            className="inline-flex min-h-11 items-center rounded font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {suggestedMatch.name}
          </Link>
          ?
        </p>
      )}

      <div className="mt-5 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
        <CyberButton
          variant="primary"
          size="md"
          iconLeft={<Home className="h-4 w-4" />}
          onClick={() => handleNavigate('/tracker')}
          className="min-h-11 justify-center"
        >
          Back to tracker
        </CyberButton>
        <CyberButton
          variant="ghost"
          size="md"
          iconLeft={<ArrowLeft className="h-3.5 w-3.5" />}
          onClick={() => {
            if (soundEnabled) playCyberSound('click');
            navigate(-1);
          }}
          className="min-h-11 justify-center"
        >
          Go back
        </CyberButton>
        <CyberButton
          variant="ghost"
          size="md"
          iconLeft={<Search className="h-3.5 w-3.5" />}
          onClick={() => {
            if (soundEnabled) playCyberSound('click');
            setCommandPaletteOpen(true);
          }}
          className="min-h-11 justify-center"
        >
          Search (Ctrl+K)
        </CyberButton>
      </div>

      <nav aria-label="Sections" className="mt-6 flex flex-wrap justify-center gap-2">
        {QUICK_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.description}
              onClick={() => soundEnabled && playCyberSound('click')}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-subtle bg-surface-card px-3 text-xs font-medium text-secondary transition-colors hover:border-strong hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.97]"
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default NotFoundPage;
