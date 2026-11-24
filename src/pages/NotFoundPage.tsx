import React, { useMemo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import { useCtfStore } from '../store/useCtfStore';
import { playCyberSound } from '../utils/helpers';
import { CyberButton } from '../components/common/CyberButton';

interface QuickLink {
  path: string;
  name: string;
  keywords: string[];
}

/** Sections a mistyped address most likely meant. The first row whose keyword appears in the path wins. */
const SUGGESTIONS: QuickLink[] = [
  { path: '/vault', name: 'Evidence Vault', keywords: ['vault', 'loot', 'evidence', 'cred'] },
  { path: '/cheatsheets', name: 'Cheatsheets', keywords: ['cheat', 'shell', 'payload', 'rev'] },
  { path: '/notes', name: 'Notes', keywords: ['manual', 'note', 'cpts', 'obsidian'] },
  { path: '/methodology', name: 'Attack Methodology', keywords: ['method', 'recon', 'ptes'] },
  { path: '/writeup', name: 'Writeup Studio', keywords: ['write', 'report', 'doc'] },
  { path: '/exam', name: 'Exam Simulator', keywords: ['exam', 'oscp', 'cert'] },
  { path: '/analytics', name: 'Analytics', keywords: ['stat', 'radar', 'analytic'] },
  { path: '/tracker', name: 'Tracker', keywords: ['box', 'machine', 'target', 'htb', 'thm'] },
];

export const NotFoundPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const setCommandPaletteOpen = useCtfStore((s) => s.setCommandPaletteOpen);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);

  const currentPath = useMemo(() => {
    const raw = (location.pathname + location.hash).replace(/^#\/?/, '/');
    return (raw || '/unknown').toLowerCase();
  }, [location.pathname, location.hash]);

  const suggestedMatch = useMemo<QuickLink | null>(
    () => SUGGESTIONS.find((s) => s.keywords.some((k) => currentPath.includes(k))) ?? null,
    [currentPath],
  );

  // Keyboard: T goes to the tracker, Escape goes back.
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

  return (
    <div className="mx-auto w-full max-w-md px-1 pb-12 pt-10 text-center sm:px-0 sm:pt-20">
      <h1 className="text-2xl font-semibold leading-tight tracking-tight text-primary [text-wrap:balance] sm:text-3xl">
        This page isn&apos;t here
      </h1>
      <p className="mx-auto mt-3 max-w-[44ch] text-sm leading-relaxed text-secondary [text-wrap:pretty] sm:text-base">
        {suggestedMatch ? (
          <>
            Did you mean{' '}
            <Link
              to={suggestedMatch.path}
              onClick={() => soundEnabled && playCyberSound('click')}
              className="rounded font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {suggestedMatch.name}
            </Link>
            ? The link may be old or mistyped.
          </>
        ) : (
          'Nothing lives at this address. The link may be old or mistyped.'
        )}
      </p>
      <div className="mt-6 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
        <CyberButton
          variant="primary"
          size="md"
          iconLeft={<Home className="h-4 w-4" />}
          onClick={() => {
            if (soundEnabled) playCyberSound('click');
            navigate('/tracker');
          }}
          className="min-h-11 justify-center"
        >
          Back to tracker
        </CyberButton>
        <CyberButton
          variant="secondary"
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
    </div>
  );
};

