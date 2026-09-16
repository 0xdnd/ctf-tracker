import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { playCyberSound } from '../../utils/helpers';

interface ShareLinkButtonProps {
  path: string;
  title?: string;
  label?: string;
  className?: string;
  iconOnly?: boolean;
}

export const ShareLinkButton: React.FC<ShareLinkButtonProps> = ({
  path,
  title = 'item',
  label,
  className = '',
  iconOnly = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof window === 'undefined') return;

    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    // Construct robust HashRouter URL for universal public sharing
    const fullUrl = `${window.location.origin}${window.location.pathname}#${cleanPath}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = fullUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      playCyberSound('copy');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy share link:', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      title={copied ? 'Direct link copied to clipboard!' : `Share direct link to ${title}`}
      aria-label={`Share direct link to ${title}`}
      className={`relative inline-flex items-center justify-center gap-1.5 transition-all text-xs font-mono font-medium rounded-lg ${
        copied
          ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
          : 'bg-slate-100 hover:bg-slate-200 dark:bg-cyber-bg dark:hover:bg-cyber-card border border-slate-200 dark:border-cyber-border text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-cyber-cyan hover:border-slate-300 dark:hover:border-cyber-cyan/40'
      } ${className}`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-50 duration-150" />
      ) : (
        <Share2 className="w-3.5 h-3.5" />
      )}
      {!iconOnly && (
        <span>{copied ? 'Copied Link!' : label || 'Share'}</span>
      )}
    </button>
  );
};
