import React from 'react';
import { OverflowMenu } from './OverflowMenu';
import type { OverflowItem } from './OverflowMenu';

export type { OverflowItem } from './OverflowMenu';

export interface PageHeaderProps {
  title: string;
  /** One short line. Do not restate the title. */
  description?: string;
  icon?: React.ReactNode;
  /** The single primary action for the page. Always visible. */
  primaryAction?: React.ReactNode;
  /** Secondary actions, rendered inline from `sm` upward only (hidden via CSS below `sm`). */
  actions?: React.ReactNode;
  /** Everything else, collapsed into an OverflowMenu. Always reachable, including at 390px. */
  overflow?: OverflowItem[];
  /** Optional sub-row, e.g. tabs or filters. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader - the one shared page header (title, one-line description, one primary action,
 * secondary actions, overflow). Single row on desktop; at 390px the action cluster wraps
 * below the title and inline `actions` are replaced by the overflow menu.
 *
 * Callers that need a secondary action on mobile must also list it in `overflow`.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon,
  primaryAction,
  actions,
  overflow,
  children,
  className = '',
}) => {
  const hasOverflow = Boolean(overflow && overflow.length > 0);
  const hasActionCluster = Boolean(primaryAction || actions || hasOverflow);

  return (
    <div data-testid="page-header" className={`w-full ${className}`}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-[16rem] items-start gap-3">
          {icon && (
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center text-muted [&>svg]:h-5 [&>svg]:w-5">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-semibold leading-tight tracking-[-0.015em] text-primary">{title}</h1>
            {description && <p className="mt-0.5 text-sm text-secondary">{description}</p>}
          </div>
        </div>

        {hasActionCluster && (
          <div className="flex w-full flex-shrink-0 items-center gap-2 sm:w-auto sm:justify-end">
            {actions && <div className="hidden items-center gap-2 sm:flex">{actions}</div>}
            {primaryAction}
            {hasOverflow && <OverflowMenu items={overflow!} />}
          </div>
        )}
      </div>

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

export default PageHeader;
