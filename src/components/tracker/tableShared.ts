export type SortField = 'name' | 'platform' | 'os' | 'difficulty' | 'status' | 'timeSpentSeconds';

export const CHECKBOX_CLASS =
  'peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed';

/** The small visible box; the input above covers the whole 32px cell so the hit area is large. */
export const CHECKBOX_BOX =
  'pointer-events-none flex h-3.5 w-3.5 items-center justify-center rounded border border-strong bg-surface-card text-on-accent transition-colors duration-150 peer-checked:border-accent peer-checked:bg-accent peer-indeterminate:border-accent peer-indeterminate:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-disabled:opacity-40 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100';

export const CHECK_CELL =
  'relative flex h-8 w-8 cursor-pointer items-center justify-center [@media(pointer:coarse)]:h-8 [@media(pointer:coarse)]:w-8 tap-target-sm';

export const STATUS_DOT: Record<string, string> = {
  backlog: 'bg-surface-hover border border-strong',
  recon: 'bg-accent',
  foothold: 'bg-callout-warn-fg',
  root: 'bg-callout-success-fg',
  completed: 'bg-callout-tip-fg',
};
