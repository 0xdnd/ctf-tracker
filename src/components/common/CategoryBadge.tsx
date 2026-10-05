import React from 'react';
import { 
  Globe, 
  Shield, 
  Terminal, 
  Layers, 
  Cpu, 
  Sparkles, 
  Key, 
  Database,
  Flame,
  Zap,
  Upload,
  FileCode,
  Code,
  Binary,
  KeyRound,
  Network,
  Boxes,
  Lock
} from 'lucide-react';
import { Machine } from '../../types';
import { classifyMachine, getCategoryTone, NEUTRAL_TONE } from '../../utils/categoryUtils';

export interface CategoryBadgeProps {
  machine: Machine;
  size?: 'xs' | 'sm';
  className?: string;
  showIcon?: boolean;
  variant?: 'default' | 'hardware';
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = React.memo(({
  machine,
  size = 'xs',
  className = '',
  showIcon = true,
  variant = 'default',
}) => {
  const { primary, primaryDef, badgeColor, categories } = classifyMachine(machine);

  const getIcon = () => {
    const catId = primaryDef?.id || primary;
    const iconClass = `w-2.5 h-2.5 ${(primaryDef ? getCategoryTone(primaryDef.id) : NEUTRAL_TONE).text}`;
    switch (catId) {
      case 'ADCS':
        return <Cpu className={iconClass} />;
      case 'Active Directory':
        return <Cpu className={iconClass} />;
      case 'Kernel Exploits':
        return <Zap className={iconClass} />;
      case 'Binary / BOF':
        return <Sparkles className={iconClass} />;
      case 'SSTI':
        return <Code className={iconClass} />;
      case 'Deserialization':
        return <Binary className={iconClass} />;
      case 'RCE':
        return <Flame className={iconClass} />;
      case 'SQLi':
        return <Database className={iconClass} />;
      case 'SSRF':
        return <Globe className={iconClass} />;
      case 'File Upload':
        return <Upload className={iconClass} />;
      case 'LFI':
        return <FileCode className={iconClass} />;
      case 'XXE':
        return <Code className={iconClass} />;
      case 'IDOR':
        return <KeyRound className={iconClass} />;
      case 'API & GraphQL':
        return <Network className={iconClass} />;
      case 'CMS Exploits':
        return <Globe className={iconClass} />;
      case 'XSS':
        return <Globe className={iconClass} />;
      case 'Web':
        return <Globe className={iconClass} />;
      case 'Cloud & Containers':
        return <Boxes className={iconClass} />;
      case 'Reverse Engineering':
        return <Binary className={iconClass} />;
      case 'Cryptography':
        return <Lock className={iconClass} />;
      case 'Windows PrivEsc':
        return <Layers className={iconClass} />;
      case 'Linux PrivEsc':
        return <Terminal className={iconClass} />;
      case 'Auth & Passwords':
        return <KeyRound className={iconClass} />;
      case 'Pivoting':
        return <Network className={iconClass} />;
      case 'Network / SMB':
        return <Key className={iconClass} />;
      default:
        return <Shield className={iconClass} />;
    }
  };

  const sizeClass =
    size === 'xs'
      ? 'h-4 text-[11px] px-1 rounded'
      : 'h-5 text-xs px-1.5 rounded';

  const hardwareSizeClass =
    size === 'xs'
      ? 'h-4 text-[11px] px-1'
      : 'h-5 text-xs px-1.5';

  if (variant === 'hardware') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded border border-subtle bg-surface-sunken text-secondary font-sans select-none cursor-default font-medium ${hardwareSizeClass} ${className}`}
        title={`Primary Vector: ${primary} • All Categories: ${categories.join(', ')}`}
      >
        {showIcon && <span className="flex-shrink-0">{getIcon()}</span>}
        <span className="truncate max-w-[80px]">{primary}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-sans font-medium border ${badgeColor} ${sizeClass} ${className}`}
      title={`Primary Vector: ${primary} • All Categories: ${categories.join(', ')}`}
    >
      {showIcon && getIcon()}
      <span className="truncate max-w-[80px]">{primary}</span>
    </span>
  );
});
