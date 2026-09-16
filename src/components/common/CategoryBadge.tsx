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
import { classifyMachine } from '../../utils/categoryUtils';

export interface CategoryBadgeProps {
  machine: Machine;
  size?: 'xs' | 'sm';
  className?: string;
  showIcon?: boolean;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = React.memo(({
  machine,
  size = 'xs',
  className = '',
  showIcon = true,
}) => {
  const { primary, primaryDef, badgeColor, categories } = classifyMachine(machine);

  const getIcon = () => {
    const catId = primaryDef?.id || primary;
    switch (catId) {
      case 'ADCS':
        return <Cpu className="w-2.5 h-2.5 text-fuchsia-400" />;
      case 'Active Directory':
        return <Cpu className="w-2.5 h-2.5 text-purple-400" />;
      case 'Kernel Exploits':
        return <Zap className="w-2.5 h-2.5 text-red-400" />;
      case 'Binary / BOF':
        return <Sparkles className="w-2.5 h-2.5 text-red-400" />;
      case 'SSTI':
        return <Code className="w-2.5 h-2.5 text-pink-400" />;
      case 'Deserialization':
        return <Binary className="w-2.5 h-2.5 text-violet-400" />;
      case 'RCE':
        return <Flame className="w-2.5 h-2.5 text-rose-400" />;
      case 'SQLi':
        return <Database className="w-2.5 h-2.5 text-amber-400" />;
      case 'SSRF':
        return <Globe className="w-2.5 h-2.5 text-teal-400" />;
      case 'File Upload':
        return <Upload className="w-2.5 h-2.5 text-lime-400" />;
      case 'LFI':
        return <FileCode className="w-2.5 h-2.5 text-sky-400" />;
      case 'XXE':
        return <Code className="w-2.5 h-2.5 text-orange-400" />;
      case 'IDOR':
        return <KeyRound className="w-2.5 h-2.5 text-emerald-400" />;
      case 'API & GraphQL':
        return <Network className="w-2.5 h-2.5 text-indigo-400" />;
      case 'CMS Exploits':
        return <Globe className="w-2.5 h-2.5 text-blue-400" />;
      case 'XSS':
        return <Globe className="w-2.5 h-2.5 text-yellow-400" />;
      case 'Web':
        return <Globe className="w-2.5 h-2.5 text-cyan-400" />;
      case 'Cloud & Containers':
        return <Boxes className="w-2.5 h-2.5 text-sky-400" />;
      case 'Reverse Engineering':
        return <Binary className="w-2.5 h-2.5 text-purple-400" />;
      case 'Cryptography':
        return <Lock className="w-2.5 h-2.5 text-amber-400" />;
      case 'Windows PrivEsc':
        return <Layers className="w-2.5 h-2.5 text-blue-400" />;
      case 'Linux PrivEsc':
        return <Terminal className="w-2.5 h-2.5 text-emerald-400" />;
      case 'Auth & Passwords':
        return <KeyRound className="w-2.5 h-2.5 text-yellow-400" />;
      case 'Pivoting':
        return <Network className="w-2.5 h-2.5 text-indigo-400" />;
      case 'Network / SMB':
        return <Key className="w-2.5 h-2.5 text-orange-400" />;
      default:
        return <Shield className="w-2.5 h-2.5 text-gray-400" />;
    }
  };

  const sizeClass =
    size === 'xs'
      ? 'text-[9px] px-1.5 py-0.2 rounded'
      : 'text-[10px] px-2 py-0.5 rounded-md';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-bold tracking-tight border uppercase ${badgeColor} ${sizeClass} ${className}`}
      title={`Primary Vector: ${primary} • All Categories: ${categories.join(', ')}`}
    >
      {showIcon && getIcon()}
      <span className="truncate max-w-[110px]">{primary}</span>
    </span>
  );
});
