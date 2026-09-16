import React from 'react';
import { useCtfStore } from '../../store/useCtfStore';

export const CrtOverlay: React.FC = () => {
  const crtOverlay = useCtfStore((s) => s.crtOverlay);

  if (!crtOverlay) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {/* Scanline pattern */}
      <div 
        className="absolute inset-0 bg-repeat opacity-[0.18]"
        style={{
          backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.4) 50%)',
          backgroundSize: '100% 4px',
        }}
      />
      {/* Moving scanline beam */}
      <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-cyber-cyan/10 to-transparent animate-scanline" />
      {/* Subtle CRT Vignette */}
      <div 
        className="absolute inset-0"
        style={{
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.85)',
        }}
      />
    </div>
  );
};
