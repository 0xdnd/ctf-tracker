import React from 'react';
import type { Machine } from '../../types';
import { OsBadge } from '../common/OsBadge';
import { PlatformBadge } from '../common/PlatformBadge';
import { DifficultyBadge } from '../common/DifficultyBadge';

type CoreChip = 'platform' | 'os' | 'difficulty';

interface MachineChipOptions {
  /** Order of the platform / OS / difficulty chips (each surface keeps its own). */
  order: readonly CoreChip[];
  /** Trailing plain-text chips: the tags on cards, the certifications on kanban cards. */
  extras?: readonly string[];
}

const EXTRA_CHIP_CLASS =
  'inline-flex h-5 items-center rounded border border-subtle bg-surface-sunken px-1.5 text-xs font-medium text-secondary';

/**
 * The chip row of a machine card: the badge nodes and the plain-text labels BadgeOverflow names its hidden
 * ones with, derived from one list so the two can never drift apart.
 */
export function machineChips(m: Machine, { order, extras = [] }: MachineChipOptions): { badges: React.ReactNode[]; labels: string[] } {
  const core: Record<CoreChip, { label: string; node: React.ReactNode } | null> = {
    platform: m.platform ? { label: String(m.platform), node: <PlatformBadge key="plat" platform={m.platform} size="sm" /> } : null,
    os: { label: String(m.os), node: <OsBadge key="os" os={m.os} size="xs" /> },
    difficulty: { label: String(m.difficulty), node: <DifficultyBadge key="diff" difficulty={m.difficulty} size="xs" /> },
  };
  const chips = [
    ...order.map((k) => core[k]),
    ...extras.map((label) => ({
      label,
      node: (
        <span key={`extra-${label}`} className={EXTRA_CHIP_CLASS}>
          {label}
        </span>
      ),
    })),
  ].filter((c): c is { label: string; node: React.ReactNode } => c !== null);
  return { badges: chips.map((c) => c.node), labels: chips.map((c) => c.label) };
}
