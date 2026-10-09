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
  obsidian: `${import.meta.env.BASE_URL}logo-zerobox.webp`,
  monolith: `${import.meta.env.BASE_URL}logo-zerobox.webp`,
  industrial: `${import.meta.env.BASE_URL}logo-oled.webp`,
  zerobox: `${import.meta.env.BASE_URL}logo-zerobox.webp`,
  neon: `${import.meta.env.BASE_URL}logo-zerobox.webp`,
  htb: `${import.meta.env.BASE_URL}logo-htb.webp`,
  'midnight-blue': `${import.meta.env.BASE_URL}logo-midnight.webp`,
  slate: `${import.meta.env.BASE_URL}logo-midnight.webp`,
  oled: `${import.meta.env.BASE_URL}logo-oled.webp`,
  light: `${import.meta.env.BASE_URL}logo-zerobox.webp`,
};

const DEFAULT_LOGO = `${import.meta.env.BASE_URL}logo-zerobox.webp`;

export const CyberLogo: React.FC<CyberLogoProps> = ({ 
  size = 'lg', 
  className = '',
  glow: _glow,
  theme: explicitTheme
}) => {
  const currentStoreTheme = useCtfStore((s) => s.themePreset || 'obsidian');
  const activePreset = explicitTheme || currentStoreTheme;

  const currentLogo = THEME_LOGO_MAP[activePreset] || DEFAULT_LOGO;
  const base = currentLogo.replace(/.webp$/, '');
  const srcSet = `${base}-64.webp 64w, ${base}-128.webp 128w, ${base}-224.webp 224w`;

  const containerSizeMap = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-[52px] h-[52px] sm:w-14 sm:h-14',
    xl: 'w-[72px] h-[72px] sm:w-20 sm:h-20',
    '2xl': 'w-24 h-24 sm:w-28 sm:h-28',
  };

  const sizesMap = {
    sm: '32px',
    md: '44px',
    lg: '(min-width: 640px) 56px, 52px',
    xl: '(min-width: 640px) 80px, 72px',
    '2xl': '(min-width: 640px) 112px, 96px',
  };
  const pxMap = { sm: 32, md: 44, lg: 56, xl: 80, '2xl': 112 };

  return (
    <div
      className={`relative flex-shrink-0 flex items-center justify-center transition-[transform,background-color,border-color,color] duration-300 group-hover:scale-105 ${containerSizeMap[size]} ${className}`}
      title={`ZeroBox (${activePreset})`}
    >
      <img
        src={currentLogo}
        srcSet={srcSet}
        sizes={sizesMap[size]}
        width={pxMap[size]}
        height={pxMap[size]}
        alt={`ZeroBox logo - ${activePreset}`}
        key={activePreset}
        {...(size === 'sm' ? ({ fetchpriority: 'high' } as any) : {})}
        decoding="async"
        className="w-full h-full object-contain select-none"
      />
    </div>
  );
};
