import React from 'react';
import { ScrollFade } from '../common/ScrollFade';
import type { Machine } from '../../types';
import type { MachineLoot } from '../../utils/machineLoot';
import { getHostAccess, getPortCount, getStillNeeded, type StillNeededItem } from '../../utils/machineGlance';
import { computeChecklistProgressForMachine } from '../../utils/checklistProgress';
import { getTargetType } from '../../utils/targetType';
import { STAGE_SHORT_LABEL } from '../../utils/pipeline';

type SummaryStripTab = 'checklist' | 'overview' | 'commands' | 'recon';

interface MachineSummaryStripProps {
  machine: Machine;
  machineLoot: MachineLoot;
  onNavigate: (tab: SummaryStripTab) => void;
}

const ACCESS_LABELS = { none: 'None', user: 'User', root: 'Root' } as const;

const stillNeededLabel = (item: StillNeededItem): string => {
  switch (item.key) {
    case 'userFlag':
      return 'User flag';
    case 'rootFlag':
      return 'Root flag';
    case 'ports':
      return 'No ports recorded';
    case 'checklistInProgress':
      return `${item.count ?? 0} checklist items in progress`;
  }
};

const chipClass =
  'inline-flex min-h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-subtle bg-surface-card px-2.5 py-1 text-xs text-secondary transition-[transform,background-color,border-color,color] hover:border-strong hover:text-primary active:scale-[0.97] [@media(pointer:coarse)]:min-h-11';

export const MachineSummaryStrip: React.FC<MachineSummaryStripProps> = ({ machine, machineLoot, onNavigate }) => {
  const portCount = getPortCount(machine);
  const progress = computeChecklistProgressForMachine(machine);
  const access = getHostAccess(machine, machineLoot.bestCredLevel);
  const accessLabel = ACCESS_LABELS[access.level];
  const viaCredential = access.source === 'credential';
  const stage = STAGE_SHORT_LABEL[machine.status] ?? machine.status;
  const findingsCount = machine.findings?.length ?? 0;
  const worksCount = machineLoot.works.length;
  const foundCount = machineLoot.foundHere.length;
  const tryCount = machineLoot.tryHere.length;
  const needed = getStillNeeded(machine, {
    targetType: getTargetType(machine),
    portCount,
    checklistInProgress: progress.inProgress,
  });

  const chip = (
    label: string,
    value: React.ReactNode,
    aria: string,
    tab: SummaryStripTab,
    key: string,
    note?: string,
  ) => (
    <button key={key} type="button" aria-label={aria} onClick={() => onNavigate(tab)} className={chipClass}>
      <span className="text-muted">{label}</span>{' '}
      <span className="font-medium tabular-nums text-primary">{value}</span>
      {note && <span className="text-xs text-muted">{note}</span>}
    </button>
  );

  return (
    <div data-testid="machine-summary-strip" className="space-y-2">
      {/* One scrolling row on phones (the right edge fades); wraps from sm up. */}
      <ScrollFade unstyled fadeSize="2.5rem" className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 max-sm:pr-10 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {chip('Stage', stage, `Stage ${stage}. Open flags and intel`, 'overview', 'stage')}
        {chip(
          'Access',
          accessLabel,
          `Access ${accessLabel}${viaCredential ? ' via credential' : ''}. Open flags and intel`,
          'overview',
          'access',
          viaCredential ? 'via credential' : undefined,
        )}
        {chip('Ports', portCount, `Ports ${portCount}. Open recon`, 'recon', 'ports')}
        {chip(
          'Credentials',
          `${worksCount} work here, ${foundCount} found here`,
          `Credentials ${worksCount} work here, ${foundCount} found here. Open flags and intel`,
          'overview',
          'credentials',
        )}
        {tryCount > 0 &&
          chip('Untried', tryCount, `Untried ${tryCount} credentials. Open flags and intel`, 'overview', 'try')}
        {chip('Findings', findingsCount, `Findings ${findingsCount}. Open flags and intel`, 'overview', 'findings')}
        {chip('Checklist', `${progress.percentage}%`, `Checklist ${progress.percentage}%. Open checklist`, 'checklist', 'checklist')}
      </ScrollFade>
      <p className="text-xs text-secondary">
        <span className="font-medium text-primary">Still needed: </span>
        {needed.length === 0 ? (
          <span className="text-muted">Nothing outstanding</span>
        ) : (
          needed.map(stillNeededLabel).join(' · ')
        )}
      </p>
    </div>
  );
};
