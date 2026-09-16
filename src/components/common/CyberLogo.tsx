import React from 'react';
import logoImg from '../../assets/logo.png';

export interface CyberLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  glow?: boolean;
}

export const CyberLogo: React.FC<CyberLogoProps> = ({ 
  size = 'lg', 
  className = '',
  glow = true 
}) => {
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
        glow ? 'drop-shadow-[0_0_14px_rgba(56,189,248,0.65)] group-hover:drop-shadow-[0_0_24px_rgba(56,189,248,0.95)]' : ''
      } ${className}`}
      title="ZEROBOX // TACTICAL CYBER OPERATIONS"
    >
      <img
        src={logoImg}
        alt="ZeroBox Tactical Cyber Operations"
        className="w-full h-full object-contain select-none filter transition-all duration-300"
      />
    </div>
  );
};
