import React from 'react';
import { EditableIpBadge, type EditableIpBadgeProps } from '../common/EditableIpBadge';
import { useCtfStore, selectTacticalVarsUnset } from '../../store/useCtfStore';
import { isPlaceholderIp } from '../../utils/ipInput';

// Quiet while unset: a dashed outline instead of reduced opacity (opacity-reduced text failed contrast).
const QUIET =
  '[&>div]:border-dashed';

/**
 * The machine-IP pill for tracker cards and rows: quiet while it is a placeholder and no address is set anywhere yet.
 * `backlog` shows plain text (the boxed field starts at Recon); copy and edit still work. `plain` forces the plain text form (table rows).
 */
export const CardIpBadge: React.FC<EditableIpBadgeProps & { backlog?: boolean }> = ({ className = '', backlog, plain, ...props }) => {
  const unset = useCtfStore(selectTacticalVarsUnset);
  const quiet = unset && isPlaceholderIp(props.initialIp);
  return (
    <EditableIpBadge
      {...props}
      plain={plain ?? backlog}
      className={quiet ? `${className} ${QUIET}` : className}
    />
  );
};
