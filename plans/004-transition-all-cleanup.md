# 004 — Replace transition-all with specific transition properties

- **Status**: DONE
- **Commit**: `e93fcee`
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 35+ files, 200+ class replacements (mechanical find-and-replace with verification)

## Problem

Tailwind's `transition-all` class compiles to `transition-property: all`, which animates **every CSS property change** — including `width`, `height`, `padding`, `margin`, `top`, `left` — triggering expensive layout + paint + composite cycles on the GPU for properties that should change instantly.

The codebase uses `transition-all` in 200+ locations across 35+ files. Meanwhile, the raw CSS rules in `src/index.css` correctly enumerate only the intended properties (lines 348, 368). The Tailwind layer contradicts this discipline.

Examples of the pattern:

```tsx
/* src/components/layout/Sidebar.tsx:139 — only bg/border/width actually animate */
className="... transition-all duration-300 ..."

/* src/components/tracker/KanbanBoard.tsx:139 — only transform/shadow/border/bg animate */
className="... transition-all duration-150 hover:-translate-y-0.5 ..."

/* src/components/tracker/GridView.tsx:114 — only border/bg/shadow animate */
className="... transition-all duration-150 ..."

/* src/components/common/FloatingPayloadBar.tsx:145 — only bg/border/color/opacity animate */
className="... transition-all ..."
```

## Target

Replace every `transition-all` with the narrowest Tailwind transition utility that covers the actually-animated properties. The mapping:

| Current | Animated Properties | Replacement |
|---|---|---|
| `transition-all` on elements with only `hover:bg-*`, `hover:text-*`, `hover:border-*` changes | `background-color`, `border-color`, `color` | `transition-colors` |
| `transition-all` on elements with `hover:scale-*`, `active:scale-*`, `hover:-translate-*` | `transform` + colors | `transition-[transform,background-color,border-color,color]` |
| `transition-all` on elements with `hover:shadow-*` in addition to colors | `box-shadow` + colors | `transition-[box-shadow,background-color,border-color,color]` |
| `transition-all` on elements with `hover:opacity-*` | `opacity` + colors | `transition-[opacity,background-color,border-color,color]` |
| `transition-all` on the Sidebar width collapse (`w-72` ↔ `w-16`) | `width` + colors | `transition-[width,background-color,border-color]` (layout property, but intentional here) |

## Repo conventions to follow

- The codebase already uses specific transition utilities in some places: `transition-colors` (30+ uses), `transition-transform` (15+ uses), `transition-opacity` (10+ uses). These are the correct pattern.
- Exemplar: `src/components/tracker/KanbanBoard.tsx:139` already uses `transition-[transform,box-shadow,border-color,background-color]` — this is the exact right pattern for cards with hover lift + shadow + color changes.
- Wait — checking the actual code: the KanbanBoard line 139 uses `transition-all`. But `src/components/tracker/KanbanBoard.tsx:146` uses `transition-opacity` elsewhere. The specific utilities already exist as a pattern.

## Steps

This is a mechanical replacement. For each of the 35+ files listed below, replace `transition-all` with the appropriate specific utility based on which properties actually animate on that element.

### High-impact files (do these first):

1. **`src/components/layout/Sidebar.tsx`** — 16 occurrences.
   - Line 139 (sidebar container): Replace `transition-all duration-300` → `transition-[width,background-color,border-color] duration-slow` (uses token from plan #1 if available, else `duration-200`)
   - Lines 216, 231, 246, 261, 314, 336, 357, 366, 375, 390, 400, 409, 418, 427 (nav buttons with `active:scale-[0.98]` and `hover:bg-*`): Replace `transition-all` → `transition-[transform,background-color,border-color,color]`
   - Line 291 (progress bar): Replace `transition-all duration-500` → `transition-[width] duration-300`

2. **`src/components/tracker/KanbanBoard.tsx`** — 11 occurrences.
   - Lines with `hover:-translate-y-0.5` or `active:scale-*`: Replace `transition-all` → `transition-[transform,box-shadow,border-color,background-color]`
   - Lines with only color changes: Replace `transition-all` → `transition-colors`

3. **`src/components/tracker/GridView.tsx`** — 11 occurrences.
   - Same pattern as KanbanBoard: check for transform vs. color-only hover states.

4. **`src/components/tracker/TableView.tsx`** — 8 occurrences.
   - Lines with `active:scale-*`: `transition-[transform,background-color,border-color,color]`
   - Lines with only hover color: `transition-colors`

5. **`src/components/layout/UnifiedHeader.tsx`** — 10 occurrences.
   - Buttons and badges: `transition-colors` for color-only, `transition-[transform,background-color,border-color,color]` for those with scale.

6. **Remaining ~25 files**: Apply the same logic — inspect each `transition-all` usage, determine which properties actually animate (check for `hover:*`, `active:*`, `focus:*` siblings), and replace with the narrowest utility.

### Decision tree for each replacement:

```
Has active:scale-* or hover:scale-* or hover:-translate-*?
  → YES: transition-[transform,background-color,border-color,color]
  → NO: Has hover:shadow-* or hover:ring-*?
    → YES: transition-[box-shadow,background-color,border-color,color]
    → NO: Has hover:opacity-* or opacity changes?
      → YES: transition-[opacity,background-color,border-color,color]
      → NO: transition-colors
```

## Boundaries

- Do NOT change any `duration-*` values in this plan (except Sidebar as noted — that's plan #10's concern, but the `transition-all` must be fixed here regardless).
- Do NOT change any `ease-*` or timing function values.
- Do NOT remove `transition-all` from elements where ALL properties genuinely need to animate (extremely rare — validate before keeping).
- Do NOT change the `html.theme-transition` rule in `src/index.css:452` — that's a deliberate broad transition for theme switching with `!important`.
- If a specific `transition-[...]` class causes a visual regression on a particular element, keep `transition-all` for that element and note it.

## Verification

- **Mechanical**: `npm run build` exits 0. `npx tsc --noEmit` exits 0.
- **Performance check**: Open DevTools → Performance panel. Record a 5-second trace while hovering over table rows, kanban cards, and sidebar buttons rapidly. Compare total "Recalculate Style" time before and after — it should decrease.
- **Feel check**:
  1. Hover sidebar nav items — background color transitions smoothly.
  2. Click sidebar collapse toggle — width animates smoothly.
  3. Hover kanban cards — lift + shadow transitions smoothly.
  4. Hover table action buttons — color transitions smoothly.
  5. Press any button — `scale(0.98)` press feedback is instant.
  6. **Critically**: confirm no element has a "stuck" or "jumped" state where a property used to animate but now doesn't.
- **Done when**: Zero `transition-all` remains in `.tsx` files (grep returns empty), all feel checks pass, build exits 0.
