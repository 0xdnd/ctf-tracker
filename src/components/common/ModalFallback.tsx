import React from 'react';
import { Skeleton } from './Skeleton';

/** Suspense fallback for lazily loaded modals: dimmed backdrop + panel-shaped skeleton. */
export const ModalFallback: React.FC = () => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading"
    className="fixed inset-0 z-modal flex items-center justify-center py-4 bg-surface-inverse/70 font-sans"
  >
    <div className="relative w-full mx-3 max-w-2xl rounded-2xl border border-subtle bg-surface-card p-6 shadow-xl">
      <Skeleton width="40%" height={20} />
      <div className="mt-6 space-y-3">
        <Skeleton height={14} />
        <Skeleton height={14} width="85%" />
        <Skeleton height={14} width="60%" />
      </div>
      <Skeleton className="mt-8" height={120} rounded="rounded-xl" />
    </div>
  </div>
);

export default ModalFallback;
