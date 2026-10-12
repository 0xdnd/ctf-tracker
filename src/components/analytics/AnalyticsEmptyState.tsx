import React from 'react';
import { BarChart3, Crosshair, Database } from 'lucide-react';
import { CyberButton } from '../common/CyberButton';

interface AnalyticsEmptyStateProps {
  onOpenTracker: () => void;
  /** Provided only when a demo-data loader exists. */
  onLoadDemo?: () => void;
}

export const AnalyticsEmptyState: React.FC<AnalyticsEmptyStateProps> = ({ onOpenTracker, onLoadDemo }) => (
  <section
    aria-labelledby="analytics-empty-title"
    className="flex flex-col items-center text-center gap-4 px-6 py-14 rounded-2xl border border-subtle bg-surface-card machined-edge"
  >
    <div className="p-3 rounded-xl bg-surface-sunken border border-subtle">
      <BarChart3 className="w-6 h-6 text-muted" aria-hidden="true" />
    </div>
    <div className="space-y-1.5 max-w-md">
      <h2 id="analytics-empty-title" className="text-base font-semibold text-primary">No activity yet</h2>
      <p className="text-sm text-muted">
        Your streak, skill radar and time benchmarks appear after you log a session or capture a flag.
      </p>
    </div>
    <div className="flex flex-wrap items-center justify-center gap-2">
      <CyberButton variant="primary" size="lg" iconLeft={<Crosshair className="w-4 h-4" aria-hidden="true" />} onClick={onOpenTracker}>
        Open tracker
      </CyberButton>
      {onLoadDemo && (
        <CyberButton variant="secondary" size="lg" iconLeft={<Database className="w-4 h-4" aria-hidden="true" />} onClick={onLoadDemo}>
          Load demo data
        </CyberButton>
      )}
    </div>
  </section>
);
