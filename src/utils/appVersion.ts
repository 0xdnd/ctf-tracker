/** Full app version, injected from package.json at build time (see vite.config.ts). */
export const APP_VERSION: string = __APP_VERSION__;

/** "major.minor" for compact display, e.g. "2.4". */
export const APP_VERSION_SHORT: string = APP_VERSION.split('.').slice(0, 2).join('.');
