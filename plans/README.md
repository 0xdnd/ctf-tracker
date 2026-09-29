# ZEROBOX Animation Improvement Plans

> Generated from the [Animation & Motion Audit](../animation_audit_zerobox.md) at commit `e93fcee`.  
> Plans are ordered by recommended execution sequence (respecting dependencies).

## Plan Index

| # | Title | Severity | Category | Status | Dependencies |
|---|-------|----------|----------|--------|--------------|
| [001](001-motion-design-tokens.md) | Establish motion design tokens | MEDIUM | Cohesion & Tokens | DONE | None (foundational) |
| [002](002-prefers-reduced-motion.md) | Add CSS prefers-reduced-motion | HIGH | Accessibility | DONE | None |
| [003](003-install-tailwindcss-animate.md) | Install tailwindcss-animate plugin | HIGH | Cohesion | DONE | None |
| [004](004-transition-all-cleanup.md) | Replace transition-all with specific properties | HIGH | Performance | DONE | #001 (tokens) |
| [005](005-fix-broken-modal-exits.md) | Fix broken modal exit animations | HIGH | Interruptibility | DONE | None |

## Recommended Execution Order

```
#001 (tokens)  ──→  #004 (transition-all)
#002 (a11y)    ──→  independent
#003 (plugin)  ──→  independent
#005 (exits)   ──→  independent
```

1. **#001 — Motion design tokens** — Foundational. Establishes `--ease-*` and `--duration-*` variables that #004 references. Small scope (2 files), fast to execute.
2. **#002 — prefers-reduced-motion** — Independent, quick win. 1 file, ~25 lines. High accessibility impact.
3. **#003 — Install tailwindcss-animate** — Independent, quick win. 2 config files, 0 component changes. Fixes 10+ ghost animations.
4. **#004 — transition-all cleanup** — Highest labor (35 files, 200+ replacements). Depends on #001 for token names. Mechanical but tedious — good candidate for parallel subagents.
5. **#005 — Fix broken modal exits** — Independent. 5 call sites need `<AnimatePresence>` wrappers. Quick to execute.

## Future Plans (Not Yet Written)

These findings from the audit are deferred pending user selection:

| Audit # | Title | Severity |
|---------|-------|----------|
| 6 | Standardize modal entrance pattern | MEDIUM |
| 7 | Fix `scale(0)` in AnalyticsView | MEDIUM |
| 8 | Drawer exit animations | LOW |
| 9 | Dead Framer Motion imports | LOW |
| 10 | Sidebar duration tuning | LOW |
