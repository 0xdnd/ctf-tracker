import React, { useEffect, useRef, useState } from 'react';
import { renderMermaid, type MermaidTheme } from '../../utils/mermaidRenderer';

const readTheme = (): MermaidTheme =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'default';

function useDocumentTheme(): MermaidTheme {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

function useVisible(ref: React.RefObject<HTMLElement>): boolean {
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const el = ref.current;
    if (visible || !el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, visible]);
  return visible;
}

interface RenderState {
  source: string;
  theme: MermaidTheme;
  svg?: string;
  error?: string;
}

export interface MermaidDiagramProps {
  source: string;
  /** The normal code block body, shown in Code mode and when rendering fails. */
  fallback: React.ReactNode;
}

const toggleClass =
  'active:scale-[0.97] px-2 py-0.5 rounded text-[11px] text-on-inverse-muted hover:bg-surface-inverse-elevated hover:text-on-inverse transition-interactive cursor-pointer';

export default function MermaidDiagram({ source, fallback }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useDocumentTheme();
  const visible = useVisible(ref);
  const [showCode, setShowCode] = useState(false);
  const [state, setState] = useState<RenderState | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    renderMermaid(source, theme).then(
      (svg) => {
        if (!cancelled) setState({ source, theme, svg });
      },
      (err: unknown) => {
        if (cancelled) return;
        const message = (err instanceof Error ? err.message : String(err)).split('\n')[0].slice(0, 160);
        setState({ source, theme, error: message || 'Unknown error' });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [visible, source, theme]);

  // A diagram from the previous theme stays up while the new one renders (no flash).
  const current =
    state && state.source === source && (state.theme === theme || state.svg) ? state : null;

  if (current?.error) {
    return (
      <div ref={ref}>
        {fallback}
        <p role="alert" className="px-3.5 pb-2.5 text-[11px] text-on-inverse-muted">
          Diagram could not be rendered: {current.error}
        </p>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex justify-end px-2 pt-1.5">
        <button
          type="button"
          className={toggleClass}
          aria-pressed={showCode}
          onClick={() => setShowCode((v) => !v)}
        >
          {showCode ? 'Diagram' : 'Code'}
        </button>
      </div>
      {showCode ? (
        fallback
      ) : current?.svg ? (
        <div
          data-testid="mermaid-diagram"
          className="mermaid-diagram mx-2 mb-2 overflow-x-auto rounded-lg bg-surface-card p-3 flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: current.svg }}
        />
      ) : (
        <div aria-busy="true" className="h-40 flex items-center justify-center text-[11px] text-on-inverse-muted">
          Rendering diagram…
        </div>
      )}
    </div>
  );
}
