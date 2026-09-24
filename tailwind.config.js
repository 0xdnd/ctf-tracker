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
          cyan: 'rgb(var(--cyber-cyan, 6 182 212) / <alpha-value>)',
          purple: 'rgb(var(--cyber-purple, 168 85 247) / <alpha-value>)',
          amber: 'rgb(var(--cyber-amber, 245 158 11) / <alpha-value>)',
          neonGreen: 'rgb(var(--cyber-neon, 0 255 102) / <alpha-value>)',
          muted: 'rgb(var(--cyber-muted) / <alpha-value>)',
          text: 'rgb(var(--cyber-text) / <alpha-value>)',
          code: 'rgb(var(--cyber-code) / <alpha-value>)',
        },
        diff: {
          'very-easy': 'rgb(var(--diff-very-easy, 6 182 212) / <alpha-value>)',
          easy: 'rgb(var(--diff-easy, 16 185 129) / <alpha-value>)',
          medium: 'rgb(var(--diff-medium, 245 158 11) / <alpha-value>)',
          hard: 'rgb(var(--diff-hard, 244 63 94) / <alpha-value>)',
          insane: 'rgb(var(--diff-insane, 168 85 247) / <alpha-value>)',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-emerald': '0 0 8px rgba(56, 189, 248, 0.2)',
        'glow-crimson': '0 0 8px rgba(244, 63, 94, 0.2)',
        'glow-cyan': '0 0 8px rgba(59, 130, 246, 0.25)',
        'glow-purple': '0 0 8px rgba(99, 102, 241, 0.2)',
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
