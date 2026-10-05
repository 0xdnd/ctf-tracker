import React from 'react';
import { useCtfStore, ThemePreset } from '../../store/useCtfStore';
export interface CyberLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  /** Deprecated: the logo no longer renders a glow. Kept for API compatibility. */
  glow?: boolean;
  theme?: ThemePreset | 'midnight-blue' | string;
}

const THEME_LOGO_MAP: Record<string, string> = {
  obsidian: './logo-zerobox.png',
  monolith: './logo-zerobox.png',
  industrial: './logo-oled.png',
  zerobox: './logo-zerobox.png',
  neon: './logo-zerobox.png',
  htb: './logo-htb.png',
  'midnight-blue': './logo-midnight.png',
  slate: './logo-midnight.png',
  oled: './logo-oled.png',
  light: './logo-zerobox.png',
};

const DEFAULT_LOGO = './logo-zerobox.png';

export const CyberLogo: React.FC<CyberLogoProps> = ({ 
  size = 'lg', 
  className = '',
  glow: _glow,
  theme: explicitTheme
}) => {
  const currentStoreTheme = useCtfStore((s) => s.themePreset || 'obsidian');
  const activePreset = explicitTheme || currentStoreTheme;

  const currentLogo = THEME_LOGO_MAP[activePreset] || DEFAULT_LOGO;

  const containerSizeMap = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-[52px] h-[52px] sm:w-14 sm:h-14',
    xl: 'w-[72px] h-[72px] sm:w-20 sm:h-20',
    '2xl': 'w-24 h-24 sm:w-28 sm:h-28',
  };

  return (
    <div
      className={`relative flex-shrink-0 flex items-center justify-center transition-[transform,background-color,border-color,color] duration-300 group-hover:scale-105 ${containerSizeMap[size]} ${className}`}
      title={`ZeroBox (${activePreset})`}
    >
      <img
        src={currentLogo}
        alt={`ZeroBox logo - ${activePreset}`}
        key={activePreset}
        {...({ fetchpriority: 'high' } as any)}
        decoding="async"
        className="w-full h-full object-contain select-none"
      />
    </div>
  );
};
