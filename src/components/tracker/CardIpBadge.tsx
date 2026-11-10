import React from 'react';
import { EditableIpBadge, type EditableIpBadgeProps } from '../common/EditableIpBadge';
import { useCtfStore, selectTacticalVarsUnset } from '../../store/useCtfStore';
import { isPlaceholderIp } from '../../utils/ipInput';

// Low emphasis until hovered or focused; touch screens have no hover, so they keep full strength.
const QUIET =
  'opacity-60 hover:opacity-100 focus-within:opacity-100 [@media(pointer:coarse)]:opacity-100 transition-opacity motion-reduce:transition-none';

/** The machine-IP pill for tracker cards and rows: quiet while it is a placeholder and no address is set anywhere yet. */
export const CardIpBadge: React.FC<EditableIpBadgeProps> = ({ className = '', ...props }) => {
  const unset = useCtfStore(selectTacticalVarsUnset);
  const quiet = unset && isPlaceholderIp(props.initialIp);
  return <EditableIpBadge {...props} className={quiet ? `${className} ${QUIET}` : className} />;
};
