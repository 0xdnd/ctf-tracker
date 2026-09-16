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
          emerald: '#10B981',
          crimson: '#EF4444',
          cyan: '#06B6D4',
          purple: '#8B5CF6',
          amber: '#F59E0B',
          neonGreen: '#00FF66',
          muted: 'rgb(var(--cyber-muted) / <alpha-value>)',
          text: 'rgb(var(--cyber-text) / <alpha-value>)',
          code: 'rgb(var(--cyber-code) / <alpha-value>)',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.45)',
        'glow-crimson': '0 0 20px -3px rgba(239, 68, 68, 0.45)',
        'glow-cyan': '0 0 20px -3px rgba(6, 182, 212, 0.45)',
        'glow-purple': '0 0 20px -3px rgba(139, 92, 246, 0.45)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        }
      }
    },
  },
  plugins: [],
}
