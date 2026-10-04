import React from 'react';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  /** Tailwind rounding class; defaults to rounded-lg (nested element radius). */
  rounded?: string;
  className?: string;
}

/** Decorative shimmer block. Static under prefers-reduced-motion. */
export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height = 16,
  rounded = 'rounded-lg',
  className = '',
}) => (
  <div
    aria-hidden="true"
    className={`bg-surface-sunken motion-safe:animate-pulse ${rounded} ${className}`}
    style={{ width, height }}
  />
);

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({ lines = 3, className = '' }) => (
  <div aria-hidden="true" className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        height={12}
        rounded="rounded"
        width={i === lines - 1 && lines > 1 ? '60%' : '100%'}
      />
    ))}
  </div>
);

export interface SkeletonRegionProps {
  label?: string;
  className?: string;
  children: React.ReactNode;
}

/** Accessible loading wrapper: live region with a visually-hidden label. */
export const SkeletonRegion: React.FC<SkeletonRegionProps> = ({
  label = 'Loading…',
  className = '',
  children,
}) => (
  <div role="status" aria-live="polite" className={className}>
    <span className="sr-only">{label}</span>
    {children}
  </div>
);

export interface ViewSkeletonProps {
  cards?: number;
  label?: string;
  className?: string;
}

/** Page-level skeleton: header bar + card grid. */
export const ViewSkeleton: React.FC<ViewSkeletonProps> = ({
  cards = 6,
  label = 'Loading…',
  className = '',
}) => (
  <SkeletonRegion label={label} className={`w-full space-y-6 p-1 ${className}`}>
    <div aria-hidden="true" className="flex items-center justify-between gap-4">
      <div className="space-y-2 flex-1 max-w-xs">
        <Skeleton height={20} width="50%" />
        <Skeleton height={12} width="80%" rounded="rounded" />
      </div>
      <Skeleton height={32} width={112} />
    </div>
    <div aria-hidden="true" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-subtle bg-surface-card p-4 space-y-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton height={32} width={32} />
            <Skeleton height={14} width="55%" rounded="rounded" />
          </div>
          <SkeletonText lines={3} />
          <div className="flex gap-2">
            <Skeleton height={20} width={56} rounded="rounded" className="bg-surface-hover" />
            <Skeleton height={20} width={40} rounded="rounded" className="bg-surface-hover" />
          </div>
        </div>
      ))}
    </div>
  </SkeletonRegion>
);

/** Canvas-sized skeleton for lazy graph/visualization panes. */
export const CanvasSkeleton: React.FC<{ label?: string; className?: string }> = ({
  label = 'Loading…',
  className = '',
}) => (
  <SkeletonRegion
    label={label}
    className={`rounded-2xl border border-subtle bg-surface-card min-h-[420px] p-4 ${className}`}
  >
    <Skeleton height="100%" className="min-h-[388px]" rounded="rounded-lg" />
  </SkeletonRegion>
);
