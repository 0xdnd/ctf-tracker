import { createLucideIcon } from 'lucide-react';

/** Monitor with a rising graph line. */
export const AnalyticsMonitorIcon = createLucideIcon('AnalyticsMonitor', [
  ['rect', { width: '20', height: '14', x: '2', y: '3', rx: '2', key: 'am1' }],
  ['path', { d: 'M12 17v4', key: 'am2' }],
  ['path', { d: 'M8 21h8', key: 'am3' }],
  ['path', { d: 'M6 13l4-4 3 2.5 5-5', key: 'am4' }],
]);
