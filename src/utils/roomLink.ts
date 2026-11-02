// Starting Point rows all carry one generic room URL: it opens the track's hub page, not a page of that machine,
// so its link label says so (mirrors isStartingPointHub in scripts/lib/content-model.cjs for the static pages).
export const STARTING_POINT_HUB_URL = 'https://app.hackthebox.com/starting-point';
export const STARTING_POINT_HUB_LABEL = 'Open the Hack The Box Starting Point hub (general page)';

export const isStartingPointHubUrl = (url?: string): boolean => url === STARTING_POINT_HUB_URL;
