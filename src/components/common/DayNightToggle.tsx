import React from 'react';
import { useCtfStore, ThemePreset } from '../../store/useCtfStore';
import { playCyberSound } from '../../utils/helpers';

interface DayNightToggleProps {
  className?: string;
}

export const DayNightToggle: React.FC<DayNightToggleProps> = ({ className = '' }) => {
  const themePreset = useCtfStore((s) => s.themePreset || 'zerobox');
  const setThemePreset = useCtfStore((s) => s.setThemePreset);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);

  const isLight = themePreset === 'light';

  const handleToggle = () => {
    if (soundEnabled) playCyberSound('click');
    if (isLight) {
      // Revert to previous dark theme or default zerobox
      const lastDark = (localStorage.getItem('zb_last_dark_theme') as ThemePreset) || 'zerobox';
      setThemePreset(lastDark === 'light' ? 'zerobox' : lastDark);
    } else {
      // Save current dark theme to restore on next toggle, then switch to light
      localStorage.setItem('zb_last_dark_theme', themePreset);
      setThemePreset('light');
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      onClick={handleToggle}
      className={`relative w-[54px] h-[28px] rounded-full p-0 flex items-center cursor-pointer transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan select-none flex-shrink-0 border shadow-inner ${
        isLight
          ? 'bg-[#cbd7e3] border-[#b0c2d4]'
          : 'bg-[#475368] border-white/10'
      } ${className}`}
      title={isLight ? 'Switch to Dark Mode (Alt+D)' : 'Switch to Light Mode (Alt+D)'}
      aria-label="Toggle Dark / Light Mode"
    >
      {/* Track Stars (Visible in Dark Mode on the right side) */}
      <span
        className={`absolute right-1.5 top-0 bottom-0 w-6 pointer-events-none transition-all duration-300 ${
          isLight ? 'opacity-0 scale-50 translate-x-2' : 'opacity-100 scale-100 translate-x-0'
        }`}
        aria-hidden="true"
      >
        <span className="absolute w-[3px] h-[3px] bg-white rounded-full top-[5px] left-[5px] shadow-[0_0_2px_#fff]" />
        <span className="absolute w-[4px] h-[4px] bg-white rounded-full top-[8px] right-[4px] shadow-[0_0_2px_#fff]" />
        <span className="absolute w-[2.5px] h-[2.5px] bg-white rounded-full top-[15px] left-[11px] shadow-[0_0_2px_#fff]" />
        <span className="absolute w-[3.5px] h-[3.5px] bg-white rounded-full bottom-[4px] right-[4px] shadow-[0_0_2px_#fff]" />
        <span className="absolute w-[2px] h-[2px] bg-white rounded-full bottom-[3px] left-[3px] shadow-[0_0_2px_#fff]" />
      </span>

      {/* Sliding White Circular Thumb */}
      <span
        className={`absolute top-[2px] left-[2px] w-[22px] h-[22px] bg-white rounded-full shadow-md flex items-center justify-center transition-transform duration-350 ease-[cubic-bezier(0.34,1.4,0.64,1)] ${
          isLight ? 'translate-x-[26px]' : 'translate-x-0'
        }`}
        aria-hidden="true"
      >
        {/* Crescent Moon (Dark Mode) */}
        <svg
          className={`absolute w-3.5 h-3.5 text-[#475368] transition-all duration-300 ${
            isLight
              ? 'opacity-0 rotate-90 scale-50'
              : 'opacity-100 rotate-0 scale-100'
          }`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12.3 2a10 10 0 0 0-.19 20 10 10 0 0 0 8.35-4.5 10 10 0 0 1-11.66-11.66A9.9 9.9 0 0 0 12.3 2z" />
        </svg>

        {/* Stylized Sun with Radial Rays (Light Mode) */}
        <svg
          className={`absolute w-3.5 h-3.5 text-[#475368] transition-all duration-300 ${
            isLight
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-50'
          }`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="12" cy="12" r="4.5" />
          <rect x="11" y="1.5" width="2" height="3" rx="1" />
          <rect x="11" y="19.5" width="2" height="3" rx="1" />
          <rect x="1.5" y="11" width="3" height="2" rx="1" />
          <rect x="19.5" y="11" width="3" height="2" rx="1" />
          <rect x="4.22" y="4.22" width="2" height="3" rx="1" transform="rotate(-45 5.22 5.72)" />
          <rect x="16.78" y="16.78" width="2" height="3" rx="1" transform="rotate(-45 17.78 18.28)" />
          <rect x="4.22" y="16.78" width="3" height="2" rx="1" transform="rotate(-45 5.72 17.78)" />
          <rect x="16.78" y="4.22" width="3" height="2" rx="1" transform="rotate(-45 18.28 5.22)" />
        </svg>
      </span>
    </button>
  );
};
