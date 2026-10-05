# 003 — Install tailwindcss-animate and fix ghost animation classes

- **Status**: DONE
- **Commit**: `e93fcee`
- **Severity**: HIGH
- **Category**: Cohesion
- **Estimated scope**: 2 config files (`package.json`, `tailwind.config.js`) + 0 component files changed

## Problem

10+ components use Tailwind animation utility classes that require the `tailwindcss-animate` plugin, which is **not installed**. These classes compile to nothing — the animations are **silent no-ops**:

| Ghost Class | Components Using It |
|---|---|
| `animate-in` | SnippetsDrawer:90, FilterDrawer:564, GraphEdgeInspectorDrawer:136, RevShellModal:135, SettingsModal:144, OperatorDossierModal:59, OperatorProfileModal:234, ExamQuickActionDrawer:187, CuratedPathways:237 |
| `fade-in` | SnippetsDrawer:90, FilterDrawer:564, RevShellModal:135, OperatorDossierModal:59, OperatorProfileModal:234, SettingsModal:144, ExamQuickActionDrawer:187 |
| `zoom-in-95` | OperatorProfileModal:244, CuratedPathways:237, SettingsDropdown:108 |
| `slide-in-from-right` | SnippetsDrawer:101, FilterDrawer:574, GraphEdgeInspectorDrawer:136 |
| `animate-fade-in` | CommandPalette:412, OperatorFlexCardModal:372, BackupModal:233, ChecklistWorkspace:750, CheatsheetView:703 |
| `animate-fadeIn` | ObsidianNoteViewer:1289 |

Current `tailwind.config.js:98`:
```js
plugins: [],
```

The `animate-fade-in` and `animate-fadeIn` classes also have no corresponding `@keyframes fadeIn` or `fade-in` definition in `src/index.css` or `tailwind.config.js`.

## Target

Install `tailwindcss-animate` and register it:

```js
// tailwind.config.js
plugins: [require('tailwindcss-animate')],
```

This single change enables all `animate-in`, `fade-in`, `zoom-in-*`, `slide-in-from-*`, `duration-*` (on animations) classes that are already authored in the component JSX.

For the `animate-fade-in` / `animate-fadeIn` classes (which are custom, not part of `tailwindcss-animate`), add a `fadeIn` keyframe to `tailwind.config.js`:

```js
keyframes: {
  scanline: {
    '0%': { transform: 'translateY(-100%)' },
    '100%': { transform: 'translateY(1000%)' },
  },
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
},
animation: {
  'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  'scanline': 'scanline 8s linear infinite',
  'fade-in': 'fadeIn 150ms ease-out',
  'fadeIn': 'fadeIn 150ms ease-out',
},
```

## Repo conventions to follow

- Dependencies are managed via `npm`. Run `npm install --save tailwindcss-animate`.
- Tailwind config uses `export default` (ESM). The plugin import uses `require()` which works in Vite's Tailwind integration.
- Existing keyframes are defined at `tailwind.config.js:90-95`. New keyframes go in the same block.
- Existing animations are at `tailwind.config.js:86-88`. New entries go in the same block.

## Steps

1. Install the plugin:
   ```bash
   npm install --save tailwindcss-animate
   ```

2. Open `tailwind.config.js`. Change line 98 from:
   ```js
   plugins: [],
   ```
   to:
   ```js
   plugins: [require('tailwindcss-animate')],
   ```

3. In the same file, add the `fadeIn` keyframe inside the existing `keyframes` block (after the `scanline` keyframe at line 94):
   ```js
   fadeIn: {
     '0%': { opacity: '0' },
     '100%': { opacity: '1' },
   },
   ```

4. Add the animation entries inside the existing `animation` block (after line 88):
   ```js
   'fade-in': 'fadeIn 150ms ease-out',
   'fadeIn': 'fadeIn 150ms ease-out',
   ```

## Boundaries

- Do NOT modify any component `.tsx` files — the class names are already correct, they just need the plugin to generate the CSS.
- Do NOT remove or alter any existing Tailwind animation/keyframe entries.
- Do NOT add exit animation classes to components in this plan — that is covered by plan #8.
- If `npm install` fails or the plugin version conflicts, STOP and report.

## Verification

- **Mechanical**: `npm install` exits 0. `npm run build` exits 0. `npx tsc --noEmit` exits 0.
- **Feel check**:
  1. Open the app. Press `Alt+S` to open the Snippets Drawer. Confirm the drawer **slides in from the right** with a visible entrance animation (previously it mounted instantly despite having `animate-in slide-in-from-right` classes).
  2. Open the Command Palette (`Ctrl+K`). Confirm the backdrop **fades in** (previously no visible fade).
  3. Open Settings (gear icon in sidebar). Confirm the modal backdrop and card **fade in with a subtle scale** (previously the backdrop had no visible animation).
  4. Open the Operator Profile Modal (`Alt+O`). Confirm the card enters with `zoom-in-95` (a subtle scale-up from 95% to 100%).
- **Done when**: All 4 feel checks above show visible entrance animations where previously there were none, build passes, no console errors.
