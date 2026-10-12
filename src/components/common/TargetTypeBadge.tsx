import React from 'react';
import type { Machine } from '../../types';
import { getTargetType, TARGET_TYPE_LABELS } from '../../utils/targetType';
import { CyberBadge } from './CyberBadge';

/** "Pro Lab" / "Exam" marker for personal targets; renders nothing for ordinary machines. */
export const TargetTypeBadge: React.FC<{ machine: Pick<Machine, 'id' | 'platform' | 'tags'>; size?: 'xs' | 'sm' }> = ({
  machine,
  size = 'xs',
}) => {
  const type = getTargetType(machine);
  if (type === 'machine') return null;
  return (
    <CyberBadge variant="info" size={size} data-testid="target-type-badge">
      {TARGET_TYPE_LABELS[type]}
    </CyberBadge>
  );
};
