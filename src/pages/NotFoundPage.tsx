import React, { useMemo, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Home, 
  Search, 
  ArrowLeft, 
  ArrowRight,
  FileQuestion,
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
import { PageHeader } from '../components/common/PageHeader';
import { CyberButton } from '../components/common/CyberButton';
import { CyberBadge } from '../components/common/CyberBadge';

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
  { path: '/cpts-manual', name: 'Field Manual', description: 'Searchable CPTS and Obsidian notes vault', icon: BookOpen },
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
      return QUICK_LINKS.find(r => r.path === '/cpts-manual') || null;
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

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Clean standard page header */}
      <PageHeader
        title="Page not found"
        description="The requested page or target could not be found."
        icon={<FileQuestion className="text-secondary" />}
        primaryAction={
          <CyberButton
            variant="primary"
            size="md"
            iconLeft={<Home className="w-4 h-4" />}
            onClick={() => handleNavigate('/tracker')}
          >
            Back to tracker
          </CyberButton>
        }
        actions={
          <>
            <CyberButton
              variant="default"
              size="md"
              iconLeft={<Search className="w-3.5 h-3.5" />}
              onClick={() => {
                if (soundEnabled) playCyberSound('click');
                setCommandPaletteOpen(true);
              }}
            >
              Search (Ctrl+K)
            </CyberButton>
            <CyberButton
              variant="ghost"
              size="md"
              iconLeft={<ArrowLeft className="w-3.5 h-3.5" />}
              onClick={() => {
                if (soundEnabled) playCyberSound('click');
                navigate(-1);
              }}
            >
              Back
            </CyberButton>
          </>
        }
      />

      {/* Calm Status Block */}
      <div className="rounded-lg border border-subtle bg-surface-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <CyberBadge variant="neutral" mono size="sm">
              404
            </CyberBadge>
            <span className="text-secondary font-medium">Unresolved route</span>
          </div>
          <code className="text-xs font-mono text-muted bg-surface-sunken px-2 py-0.5 rounded border border-subtle">
            {currentPath}
          </code>
        </div>

        <p className="text-sm text-secondary leading-relaxed">
          The link you followed may be broken, or the address may have been typed incorrectly. You can return to the main tracker or navigate to any of the sections below.
        </p>

        {/* Suggestion Card (if recognized) */}
        {suggestedMatch && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-md bg-surface-elevated border border-subtle">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-md bg-surface-sunken text-secondary border border-subtle flex-shrink-0">
                <suggestedMatch.icon className="w-4 h-4" />
              </span>
              <div>
                <div className="text-xs text-muted">Looking for this page?</div>
                <div className="text-sm font-medium text-primary">{suggestedMatch.name}</div>
              </div>
            </div>
            <CyberButton
              variant="secondary"
              size="sm"
              iconRight={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => handleNavigate(suggestedMatch.path)}
            >
              Open {suggestedMatch.name}
            </CyberButton>
          </div>
        )}
      </div>

      {/* Directory Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          All sections
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {QUICK_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavigate(item.path)}
                className="group flex flex-col justify-between text-left p-3 rounded-lg border border-subtle bg-surface-card hover:bg-surface-hover hover:border-strong transition-colors cursor-pointer"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-primary group-hover:text-accent transition-colors">
                    <Icon className="w-4 h-4 text-secondary group-hover:text-accent transition-colors flex-shrink-0" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <div className="mt-2 text-[11px] font-mono text-muted/70">
                  {item.path}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
