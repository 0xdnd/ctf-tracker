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
      className={`relative inline-flex items-center justify-center gap-1.5 transition-colors text-xs font-medium rounded-lg ${
        copied
          ? 'bg-callout-success-bg border border-callout-success-border/50 text-callout-success-fg'
          : 'bg-surface-sunken hover:bg-surface-hover border border-subtle text-secondary hover:text-primary hover:border-strong'
      } ${className}`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-callout-success-fg animate-in zoom-in-50 duration-150" />
      ) : (
        <Share2 className="w-3.5 h-3.5" />
      )}
      {!iconOnly && (
        <span>{copied ? 'Link copied' : label || 'Share'}</span>
      )}
    </button>
  );
};
