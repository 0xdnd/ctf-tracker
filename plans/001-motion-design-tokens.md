# 001 — Establish motion design tokens

- **Status**: DONE
- **Commit**: `e93fcee`
- **Severity**: MEDIUM
- **Category**: Cohesion & Tokens
- **Estimated scope**: 2 files (`src/index.css`, `tailwind.config.js`), ~30 lines added

## Problem

The codebase has **zero CSS custom properties for motion** — no `--ease-*`, `--duration-*`, or `--transition-*` variables. Five different cubic-bezier curves are hardcoded across 30+ files, each slightly different, none named:

```css
/* src/index.css:350 — interactive-surface */
transition-timing-function: cubic-bezier(0, 0, 0.2, 1);

/* src/index.css:452 — theme transition */
transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);

/* src/hooks/useTheme.ts:224 — WAAPI reveal */
easing: 'cubic-bezier(0.25, 1, 0.5, 1)'

/* src/App.tsx:366 — route transitions */
transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}

/* tailwind.config.js:87 — pulse-slow */
'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
```

Every new component invents its own timing. Downstream plans (#1 transition-all, #6 modal standardization) need named tokens to reference.

## Target

Establish a minimal motion token vocabulary in `src/index.css` under `:root`:

```css
:root {
  /* Motion: Easing tokens (from Emil Kowalski / AUDIT.md) */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);         /* entering/exiting UI */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);     /* on-screen movement */
  --ease-micro: cubic-bezier(0, 0, 0.2, 1);           /* hover/color/press — matches existing interactive-* */

  /* Motion: Duration tokens */
  --duration-fast: 100ms;     /* press feedback, hover color */
  --duration-normal: 150ms;   /* dropdowns, tooltips, modals */
  --duration-slow: 200ms;     /* drawers, large modals */
  --duration-layout: 300ms;   /* sidebar collapse, page transitions — max UI budget */
}
```

Then migrate the two existing CSS rules in `index.css` to use the tokens:

```css
/* src/index.css — interactive-surface (current: cubic-bezier(0, 0, 0.2, 1)) */
.interactive-surface {
  transition-timing-function: var(--ease-micro);
  transition-duration: var(--duration-fast);
}

/* src/index.css — interactive-button */
.interactive-button {
  transition-timing-function: var(--ease-micro);
  transition-duration: var(--duration-fast);
}
```

Also register the duration tokens in `tailwind.config.js` so Tailwind classes can reference them:

```js
transitionDuration: {
  fast: 'var(--duration-fast)',
  normal: 'var(--duration-normal)',
  slow: 'var(--duration-slow)',
  layout: 'var(--duration-layout)',
},
transitionTimingFunction: {
  'out': 'var(--ease-out)',
  'in-out': 'var(--ease-in-out)',
  'micro': 'var(--ease-micro)',
},
```

## Repo conventions to follow

- CSS custom properties for colors/sizing already exist in `src/index.css` under `@layer base` and `:root` blocks. Motion tokens go adjacent.
- Tailwind extends live in `tailwind.config.js` under `theme.extend`. `transitionDuration` already has `100` and `150` entries at lines 70–73 — extend this section.
- Exemplar: `src/index.css:347-351` — the `.interactive-surface` rule already uses explicit transition properties with a custom cubic-bezier. The token migration is a drop-in replacement of the hardcoded value.

## Steps

1. Open `src/index.css`. Before the `.interactive-surface` rule (line 347), add the `:root` motion token block shown in Target above.

2. In the same file, replace `cubic-bezier(0, 0, 0.2, 1)` on lines 350 and 370 with `var(--ease-micro)`. Replace `100ms` on lines 349 and 369 with `var(--duration-fast)`.

3. Open `tailwind.config.js`. Inside `theme.extend` (after the existing `transitionDuration` on lines 70–73), replace that block and add `transitionTimingFunction`:
   ```js
   transitionDuration: {
     fast: 'var(--duration-fast)',
     normal: 'var(--duration-normal)',
     slow: 'var(--duration-slow)',
     layout: 'var(--duration-layout)',
   },
   transitionTimingFunction: {
     'out': 'var(--ease-out)',
     'in-out': 'var(--ease-in-out)',
     'micro': 'var(--ease-micro)',
   },
   ```

## Boundaries

- Do NOT migrate any Framer Motion `transition={{ }}` props in this plan — those are JS-side and will be addressed when modal standardization (plan #6) is done.
- Do NOT migrate the WAAPI `easing:` string in `useTheme.ts` — that takes a raw string, not a CSS variable.
- Do NOT rename or remove the existing `100` and `150` keys from `transitionDuration` — other components use `duration-100` and `duration-150` directly. The new named tokens are additive.
- Do NOT touch component files in this plan — this is infrastructure only.

## Verification

- **Mechanical**: `npx tsc --noEmit` exits 0. `npm run build` exits 0.
- **Feel check**: Open the app, hover over sidebar nav items and action buttons. Confirm hover/press feedback timing is identical to before (no visible change expected — the token value matches the old hardcoded value exactly).
- **Token check**: In DevTools Elements panel, select `:root` and confirm all 7 custom properties appear (`--ease-out`, `--ease-in-out`, `--ease-micro`, `--duration-fast`, `--duration-normal`, `--duration-slow`, `--duration-layout`).
- **Done when**: All 7 tokens exist in `:root`, `.interactive-surface` and `.interactive-button` reference them, Tailwind config exposes named duration/easing utilities, build passes.
