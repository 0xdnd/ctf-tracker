import React from 'react';
import { GlobalVariables } from '../../types';
import { splitPlaceholderSegments } from '../../utils/placeholderSegments';

export const UNRESOLVED_PLACEHOLDER_HINT = 'Set it in the target bar';

export interface PlaceholderChipProps {
  /** Token name without brackets, e.g. `TARGET`. */
  name: string;
  /** Substituted value shown in the chip. */
  value: string;
  resolved: boolean;
  /** `inverse` for chips drawn on the dark code-block surface. */
  tone?: 'default' | 'inverse';
}

const TONES = {
  default: 'bg-accent-muted text-accent border-accent/40',
  inverse: 'bg-surface-inverse-elevated text-syntax-variable border-syntax-variable/40',
} as const;

const UNRESOLVED = 'bg-callout-warn-bg text-callout-warn-fg border-callout-warn-border';

/** Inline chip for a `{VAR}` placeholder: shows the resolved value, token name in the tooltip. */
export const PlaceholderChip: React.FC<PlaceholderChipProps> = ({ name, value, resolved, tone = 'default' }) => {
  const tooltip = resolved ? `{${name}}` : `{${name}} is not set. ${UNRESOLVED_PLACEHOLDER_HINT}`;
  return (
    <span
      data-placeholder={name}
      data-resolved={resolved ? 'true' : 'false'}
      title={tooltip}
      className={`inline rounded border px-1 font-mono tabular-nums [box-decoration-break:clone] ${
        resolved ? TONES[tone] : UNRESOLVED
      }`}
    >
      {value}
    </span>
  );
};

/**
 * Render `text` with every placeholder replaced by a chip. The visible text
 * matches `interpolateCommand(text, vars)`, so selecting it copies the same
 * thing the Copy buttons do.
 */
export function renderPlaceholderChips(
  text: string,
  vars: GlobalVariables,
  tone: PlaceholderChipProps['tone'] = 'default'
): React.ReactNode[] {
  return splitPlaceholderSegments(text, vars).map((seg, i) =>
    seg.kind === 'text' ? (
      <React.Fragment key={i}>{seg.text}</React.Fragment>
    ) : (
      <PlaceholderChip key={i} name={seg.name} value={seg.value} resolved={seg.resolved} tone={tone} />
    )
  );
}
