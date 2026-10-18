import React from 'react';
import { useCtfStore, ThemePreset } from '../../store/useCtfStore';
import logoZerobox from '../../assets/logo-zerobox.png';
import logoHtb from '../../assets/logo-htb.png';
import logoMidnight from '../../assets/logo-midnight.png';
import logoOled from '../../assets/logo-oled.png';
import logoDefault from '../../assets/logo.png';

export interface CyberLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  glow?: boolean;
  theme?: ThemePreset;
}

const THEME_LOGO_MAP: Record<string, string> = {
  zerobox: logoZerobox,
  neon: logoZerobox,
  htb: logoHtb,
  'midnight-blue': logoMidnight,
  slate: logoMidnight,
  oled: logoOled,
};

const THEME_GLOW_MAP: Record<string, string> = {
  zerobox: 'drop-shadow-[0_0_14px_rgba(0,240,255,0.65)] group-hover:drop-shadow-[0_0_24px_rgba(0,240,255,0.95)]',
  neon: 'drop-shadow-[0_0_14px_rgba(0,240,255,0.65)] group-hover:drop-shadow-[0_0_24px_rgba(0,240,255,0.95)]',
  htb: 'drop-shadow-[0_0_14px_rgba(159,239,0,0.65)] group-hover:drop-shadow-[0_0_24px_rgba(159,239,0,0.95)]',
  'midnight-blue': 'drop-shadow-[0_0_14px_rgba(56,189,248,0.65)] group-hover:drop-shadow-[0_0_24px_rgba(56,189,248,0.95)]',
  slate: 'drop-shadow-[0_0_14px_rgba(56,189,248,0.65)] group-hover:drop-shadow-[0_0_24px_rgba(56,189,248,0.95)]',
  oled: 'drop-shadow-[0_0_14px_rgba(56,189,248,0.6)] group-hover:drop-shadow-[0_0_24px_rgba(165,243,252,0.9)]',
  light: 'drop-shadow-[0_0_10px_rgba(0,139,153,0.35)] group-hover:drop-shadow-[0_0_18px_rgba(0,139,153,0.6)]',
};

const DEFAULT_GLOW = 'drop-shadow-[0_0_14px_rgba(0,240,255,0.65)] group-hover:drop-shadow-[0_0_24px_rgba(0,240,255,0.95)]';

export const CyberLogo: React.FC<CyberLogoProps> = ({ 
  size = 'lg', 
  className = '',
  glow = true,
  theme: explicitTheme
}) => {
  const currentStoreTheme = useCtfStore((s) => s.themePreset || 'zerobox');
  const activePreset = explicitTheme || currentStoreTheme;

  const currentLogo = THEME_LOGO_MAP[activePreset] || logoDefault;
  const currentGlow = THEME_GLOW_MAP[activePreset] || DEFAULT_GLOW;

  const containerSizeMap = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-[52px] h-[52px] sm:w-14 sm:h-14',
    xl: 'w-[72px] h-[72px] sm:w-20 sm:h-20',
    '2xl': 'w-24 h-24 sm:w-28 sm:h-28',
  };

  return (
    <div
      className={`relative flex-shrink-0 flex items-center justify-center transition-all duration-300 group-hover:scale-105 ${containerSizeMap[size]} ${
        glow ? currentGlow : ''
      } ${className}`}
      title={`ZEROBOX // TACTICAL CYBER OPERATIONS (${activePreset.toUpperCase()})`}
    >
      <img
        src={currentLogo}
        alt={`ZeroBox Tactical Cyber Operations - ${activePreset}`}
        key={activePreset}
        className="w-full h-full object-contain select-none filter transition-all duration-300"
      />
    </div>
  );
};
