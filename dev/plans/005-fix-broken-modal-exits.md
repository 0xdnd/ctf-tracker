# 005 — Fix broken modal exit animations

- **Status**: DONE
- **Commit**: `e93fcee`
- **Severity**: HIGH
- **Category**: Interruptibility
- **Estimated scope**: 1 file (`src/App.tsx`) + 4 component files, ~20 lines changed

## Problem

Five modals define Framer Motion `exit={{ ... }}` props on their root `<motion.div>`, but their parent callers in `src/App.tsx` (and other call sites) render them with bare conditional mounts — `{condition && <Modal />}` — without wrapping in `<AnimatePresence>`. This means the exit animation **never plays**; the modal DOM node is immediately unmounted by React before Framer Motion can run the exit transition.

### Affected modals and their call sites:

**1. MachineDetailModal** — `src/App.tsx:308`:
```tsx
{selectedMachineId && <MachineDetailModal />}
```
Modal defines at `MachineDetailModal.tsx:297`:
```tsx
exit={{ opacity: 0, scale: 0.96, y: 10 }}
```

**2. KeyboardShortcutsModal** — `src/App.tsx:323`:
```tsx
{shortcutsModalOpen && <KeyboardShortcutsModal />}
```
Modal defines at `KeyboardShortcutsModal.tsx:71`:
```tsx
exit={{ opacity: 0, scale: 0.95, y: 15 }}
```

**3. QuickAssignIpModal** — rendered via `createPortal` with conditional caller:
```tsx
exit={{ opacity: 0, scale: 0.95, y: 15 }}
```

**4. ReconAutomationModal** — conditional caller:
```tsx
exit={{ opacity: 0, scale: 0.95, y: 15 }}
```

**5. LicenseModal** — conditional caller:
```tsx
exit={{ scale: 0.98, opacity: 0, y: 10 }}
```

### Modals that DO work correctly (exemplars):

- **`src/App.tsx:360-400`** — Route transitions use `<AnimatePresence mode="wait">` wrapping `<motion.div key={location.pathname}>`. This is the correct pattern.
- **`PentestReportModal.tsx:93-104`** — Has its own internal `<AnimatePresence>` wrapping the conditional render. Exit animations play.
- **`SettingsModal.tsx:143-155`** — Same pattern: internal `<AnimatePresence>`.
- **`NotesImportModal.tsx:350-367`** — Same.
- **`EvidenceVaultPage.tsx:671-679`** — Same.

## Target

Wrap each broken modal's conditional render in `<AnimatePresence>` at the call site. The modal component itself already has `exit` props — it just needs the wrapper to delay unmount.

### Pattern A (preferred for App.tsx call sites):
```tsx
<AnimatePresence>
  {selectedMachineId && <MachineDetailModal key="machine-detail" />}
</AnimatePresence>
```

### Pattern B (for modals with internal AnimatePresence — already correct):
No changes needed for PentestReportModal, SettingsModal, NotesImportModal, EvidenceVaultPage loot modal.

## Repo conventions to follow

- `AnimatePresence` is already imported in `src/App.tsx:3` (from `'framer-motion'`).
- Route transitions at `src/App.tsx:360` demonstrate the correct `<AnimatePresence mode="wait">` pattern.
- For modals, use `<AnimatePresence>` (without `mode="wait"`) — we don't want modals to block each other.
- Exemplar: `src/components/writeup/PentestReportModal.tsx:93-104` — the internal pattern wrapping backdrop + dialog in `<AnimatePresence>`.

## Steps

1. Open `src/App.tsx`.

2. Find line 308:
   ```tsx
   {selectedMachineId && <MachineDetailModal />}
   ```
   Wrap it:
   ```tsx
   <AnimatePresence>
     {selectedMachineId && <MachineDetailModal key="machine-detail" />}
   </AnimatePresence>
   ```

3. Find line 323:
   ```tsx
   {shortcutsModalOpen && <KeyboardShortcutsModal />}
   ```
   Wrap it:
   ```tsx
   <AnimatePresence>
     {shortcutsModalOpen && <KeyboardShortcutsModal key="keyboard-shortcuts" />}
   </AnimatePresence>
   ```

4. Find the call site for `ReconAutomationModal` (search for the conditional render in `App.tsx` or the parent component). Wrap it in `<AnimatePresence>` with a stable `key`.

5. Find the call site for `QuickAssignIpModal`. This modal uses `createPortal` — the `<AnimatePresence>` must wrap the conditional **before** the portal, not around the portal output. If the modal internally creates the portal, wrap the conditional mount of the component itself.

6. Find the call site for `LicenseModal`. Wrap in `<AnimatePresence>`.

7. For each modal, verify the `<motion.div>` root element inside the modal has a `key` prop (Framer Motion needs this to track the element for exit animations). If it uses `createPortal`, ensure the `<motion.div>` with `exit` props is the direct child of `<AnimatePresence>`, not separated by the portal boundary.

## Boundaries

- Do NOT modify the modal components' internal animation values (`exit`, `initial`, `animate`, `transition` props). These are already correct — they just need the wrapper to fire.
- Do NOT add `<AnimatePresence>` to modals that already have internal AnimatePresence (PentestReportModal, SettingsModal, NotesImportModal, EvidenceVaultPage loot modal).
- Do NOT change the `mode` prop — leave it as default (not `"wait"`) for modals.
- Do NOT wrap the entire modal section of App.tsx in a single `<AnimatePresence>` — each modal needs its own wrapper so they can animate independently.

## Verification

- **Mechanical**: `npm run build` exits 0. `npx tsc --noEmit` exits 0.
- **Feel check**:
  1. Open MachineDetailModal (click a target or press `Space`). Close it (click backdrop or press `Escape`). Confirm the modal **fades out with a scale-down** rather than vanishing instantly.
  2. Open Keyboard Shortcuts Modal (press `?`). Close it. Confirm smooth exit.
  3. Open each of the other 3 fixed modals. Close each. Confirm exit animation plays.
  4. In DevTools Animations panel, set playback to 25%. Close a modal and confirm: opacity drops from 1→0, scale shrinks from 1→0.95/0.96, y shifts down — matching the defined `exit` values.
  5. Rapidly open/close the same modal 5 times. Confirm no visual glitches, no stacking, no orphaned backdrops.
- **Done when**: All 5 modals have visible exit animations, rapid open/close is stable, build passes.
