# 002 — Add CSS prefers-reduced-motion handling

- **Status**: DONE
- **Commit**: `e93fcee`
- **Severity**: HIGH
- **Category**: Accessibility
- **Estimated scope**: 1 file (`src/index.css`), ~25 lines added

## Problem

`src/index.css` contains **zero** `@media (prefers-reduced-motion: reduce)` blocks. All CSS animations and transitions run unabated when the user enables reduced motion at the OS level:

```css
/* src/index.css:399-400 — continuous shimmer */
.skeleton-dim {
  animation: skeleton-dim 1.5s ease-in-out infinite;
}

/* src/index.css:516-518 — continuous 8s rotation */
.animate-spin-slow {
  animation: spin-slow 8s linear infinite;
}

/* src/index.css:407 — smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Tailwind built-ins also affected: animate-pulse, animate-bounce, animate-spin, animate-ping */
```

JS-side handling exists in `src/hooks/useTheme.ts` (disables WAAPI/ViewTransitions) and `src/components/common/ThemeToggle.tsx` (degrades springs), but these are 2 of 30+ animated elements. All CSS keyframe animations and `scroll-behavior: smooth` are unprotected.

## Target

```css
/* src/index.css — add after the .skeleton-dim rule (after line 403) */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .skeleton-dim {
    animation: none;
    opacity: 0.6;
  }

  .animate-spin-slow {
    animation: none;
  }
}
```

This follows the AUDIT.md principle: "Reduced motion means fewer and gentler animations, not zero — keep transitions that aid comprehension, remove position changes." The `0.01ms` duration preserves the final state (no broken layouts from mid-animation stops) while eliminating perceived motion. The skeleton gets a static reduced opacity fallback so loading states remain visible.

## Repo conventions to follow

- CSS in `src/index.css` follows a logical grouping: base variables → interactive contracts → skeletons → keyframes → scrollbar → view transitions.
- The reduced-motion block should go after the skeleton rules (line 403) and before the `@layer base` block (line 405).
- Exemplar: `src/hooks/useTheme.ts:197` — the JS-side check `if (prefersReducedMotion || ...) { runThemeSwitch(theme); return; }` shows the pattern of graceful degradation already used in the codebase.

## Steps

1. Open `src/index.css`.

2. After line 403 (the closing `}` of `.skeleton-dim`), insert a blank line and the `@media (prefers-reduced-motion: reduce)` block shown in Target above.

## Boundaries

- Do NOT modify any JS/TS files — JS-side `prefers-reduced-motion` handling in `useTheme.ts` and `ThemeToggle.tsx` is already correct and should not be touched.
- Do NOT add `@media (hover: hover) and (pointer: fine)` gating in this plan — hover motion gating is a separate concern.
- Do NOT remove any keyframe definitions — only disable them under the media query.
- Keep the rule order: the `*` universal rule first (catches Tailwind `animate-*` built-ins), then specific class overrides for custom animations that need fallback states.

## Verification

- **Mechanical**: `npm run build` exits 0. `npx tsc --noEmit` exits 0.
- **Feel check**:
  1. Open DevTools → Rendering panel → check "Emulate CSS media feature `prefers-reduced-motion: reduce`".
  2. Confirm: `.skeleton-dim` elements show static 60% opacity (no pulsing).
  3. Confirm: Crosshair icons (`.animate-spin-slow`) are static (no rotation).
  4. Confirm: `animate-pulse` badges are static.
  5. Confirm: Page scrolling jumps to anchor targets instantly (no smooth scroll).
  6. Confirm: Hover highlights and button press feedback (`active:scale-[0.98]`) still apply their final state — the transition is just instant rather than animated.
  7. Uncheck the emulation — confirm all animations resume normally.
- **Done when**: All 5 checks above pass with reduced motion enabled, and all animations work normally without it.
