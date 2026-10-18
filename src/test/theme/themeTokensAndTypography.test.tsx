import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Milestone 1: Design Tokens, Typography & Tailwind Bridge Verification', () => {
  const cssPath = path.resolve(process.cwd(), 'src/index.css');
  const tailwindPath = path.resolve(process.cwd(), 'tailwind.config.js');
  const cssContent = fs.readFileSync(cssPath, 'utf-8').replace(/\r\n/g, '\n');
  const tailwindContent = fs.readFileSync(tailwindPath, 'utf-8').replace(/\r\n/g, '\n');

  describe('1. Global Typography & Sans-Serif Switch', () => {
    it('verifies body font uses clean sans-serif system stack instead of monospace default', () => {
      expect(cssContent).toMatch(
        /body\s*\{[^}]*font-family:\s*['"]Inter['"],\s*system-ui/
      );
    });

    it('verifies monospace stack is preserved for code, pre, and .font-mono elements', () => {
      expect(cssContent).toMatch(
        /code,\s*kbd,\s*samp,\s*pre,\s*\.font-mono/
      );
      expect(cssContent).toContain("'JetBrains Mono'");
    });

    it('verifies body keeps font-variant-numeric: tabular-nums for zero horizontal jitter', () => {
      expect(cssContent).toMatch(/body\s*\{[^}]*font-variant-numeric:\s*tabular-nums;/);
    });
  });

  describe('2. Dynamic Tailwind Accent & Semantic Text Tokens', () => {
    it('verifies accent.DEFAULT is dynamically bound to rgb(var(--border-accent))', () => {
      expect(tailwindContent).toContain("DEFAULT: 'rgb(var(--border-accent) / <alpha-value>)'");
    });

    it('verifies accent retains lime and azure hex tokens for backward compatibility', () => {
      expect(tailwindContent).toContain("lime: '#9fef00'");
      expect(tailwindContent).toContain("azure: '#0ea5e9'");
    });

    it('verifies semantic textColor tokens (primary, secondary, muted, tertiary, accent) are defined', () => {
      expect(tailwindContent).toContain("primary: 'rgb(var(--text-primary) / <alpha-value>)'");
      expect(tailwindContent).toContain("secondary: 'rgb(var(--text-secondary) / <alpha-value>)'");
      expect(tailwindContent).toContain("muted: 'rgb(var(--text-muted) / <alpha-value>)'");
      expect(tailwindContent).toContain("tertiary: 'rgb(var(--text-tertiary) / <alpha-value>)'");
      expect(tailwindContent).toContain("accent: 'rgb(var(--border-accent) / <alpha-value>)'");
    });
  });

  describe('3. Concentric Radii Geometry Ladder', () => {
    it('verifies tailwind.config.js extends borderRadius with 2xs, 2xl, and 3xl', () => {
      expect(tailwindContent).toContain("'2xs': '2px'");
      expect(tailwindContent).toContain("'2xl': '20px'");
      expect(tailwindContent).toContain("'3xl': '24px'");
    });
  });

  describe('4. Light Mode hover:text-white Contrast Neutralization', () => {
    it('verifies global CSS override neutralizes hover:text-white in light mode to text-primary', () => {
      expect(cssContent).toContain('html:not(.dark) .hover\\:text-white:hover');
      expect(cssContent).toContain('color: rgb(var(--text-primary))');
    });

    it('verifies group-hover:text-white is also neutralized in light mode', () => {
      expect(cssContent).toContain('html:not(.dark) .group:hover .group-hover\\:text-white');
    });
  });

  describe('5. Dual-Theme Depth & Ambient Shadows', () => {
    it('verifies .surface-card-depth and .surface-elevated-depth provide ambient shadows in light mode', () => {
      expect(cssContent).toContain('.surface-card-depth');
      expect(cssContent).toContain('.surface-elevated-depth');
      expect(cssContent).toContain('rgba(0, 0, 0, 0.05)');
    });
  });
});
