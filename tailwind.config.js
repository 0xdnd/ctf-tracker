import tailwindAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: 'rgb(var(--cyber-bg) / <alpha-value>)',
          card: 'rgb(var(--cyber-card) / <alpha-value>)',
          cardHover: 'rgb(var(--cyber-card-hover) / <alpha-value>)',
          'card-hover': 'rgb(var(--cyber-card-hover) / <alpha-value>)',
          border: 'rgb(var(--cyber-border) / <alpha-value>)',
          borderGlow: 'rgb(var(--cyber-border-glow) / <alpha-value>)',
          'border-glow': 'rgb(var(--cyber-border-glow) / <alpha-value>)',
          emerald: 'rgb(var(--cyber-emerald, 16 185 129) / <alpha-value>)',
          crimson: 'rgb(var(--cyber-crimson, 239 68 68) / <alpha-value>)',
          cyan: 'rgb(var(--cyber-cyan, 0 240 255) / <alpha-value>)',
          primary: 'rgb(var(--cyber-cyan, 0 240 255) / <alpha-value>)',
          purple: 'rgb(var(--cyber-purple, 168 85 247) / <alpha-value>)',
          amber: 'rgb(var(--cyber-amber, 245 158 11) / <alpha-value>)',
          neonGreen: 'rgb(var(--cyber-neon, 159 239 0) / <alpha-value>)',
          neonLime: '#9fef00',
          oledBlack: '#000000',
          muted: 'rgb(var(--cyber-muted) / <alpha-value>)',
          text: 'rgb(var(--cyber-text) / <alpha-value>)',
          code: 'rgb(var(--cyber-code) / <alpha-value>)',
          box: 'rgb(var(--cyber-box, 159 239 0) / <alpha-value>)',
        },
        htb: {
          lime: '#9fef00',
          black: '#000000',
          card: '#0b1015',
          elevated: '#121820',
          sunken: '#05070a',
          hover: '#16202c',
          border: '#1c2633',
          borderStrong: '#2a3a4e',
        },
        diff: {
          'very-easy': 'rgb(var(--diff-very-easy, 6 182 212) / <alpha-value>)',
          easy: 'rgb(var(--diff-easy, 16 185 129) / <alpha-value>)',
          medium: 'rgb(var(--diff-medium, 245 158 11) / <alpha-value>)',
          hard: 'rgb(var(--diff-hard, 244 63 94) / <alpha-value>)',
          insane: 'rgb(var(--diff-insane, 168 85 247) / <alpha-value>)',
        },
        surface: {
          base: 'rgb(var(--surface-base) / <alpha-value>)',
          card: 'rgb(var(--surface-card) / <alpha-value>)',
          elevated: 'rgb(var(--surface-elevated) / <alpha-value>)',
          sunken: 'rgb(var(--surface-sunken) / <alpha-value>)',
          hover: 'rgb(var(--surface-hover) / <alpha-value>)',
        },
      },
      borderColor: {
        subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
        strong: 'rgb(var(--border-strong) / <alpha-value>)',
        accent: 'rgb(var(--border-accent) / <alpha-value>)',
      },
      borderRadius: {
        xs: 'var(--radius-xs, 4px)',
        sm: 'var(--radius-sm, 6px)',
        md: 'var(--radius-md, 8px)',
        lg: 'var(--radius-lg, 12px)',
        xl: 'var(--radius-xl, 16px)',
      },
      transitionDuration: {
        100: '100ms',
        150: '150ms',
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
        layout: 'var(--duration-layout)',
      },
      transitionTimingFunction: {
        'out': 'var(--ease-out)',
        'in': 'var(--ease-in)',
        'in-out': 'var(--ease-in-out)',
        'drawer': 'var(--ease-drawer)',
        'micro': 'var(--ease-micro)',
      },
      transitionProperty: {
        'transform-colors': 'transform, background-color, border-color, color',
        'interactive': 'transform, background-color, border-color, color, box-shadow',
        'width-colors': 'width, background-color, border-color',
        'opacity-colors': 'opacity, background-color, border-color, color',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-emerald': 'none',
        'glow-crimson': 'none',
        'glow-cyan': 'none',
        'glow-primary': 'none',
        'glow-box': 'none',
        'glow-purple': 'none',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
        'fade-in': 'fadeIn 150ms var(--ease-out)',
        'fadeIn': 'fadeIn 150ms var(--ease-out)',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      }
    },
  },
  plugins: [tailwindAnimate],
}
