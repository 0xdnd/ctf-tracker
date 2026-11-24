import { GlobalVariables } from '../types';
import { isPlaceholderIp } from '../utils/ipInput';
import { FilterState } from './ctfStoreTypes';

/** Workspace store: default values for the global variables and the filters. */

export const DEFAULT_GLOBAL_VARS: GlobalVariables = {
  lhost: '10.10.14.X',
  lport: '4444',
  targetIp: '10.10.10.X',
  interface: 'tun0',
  domain: '',
  dcIp: '',
  user: '',
  cred: '',
  wordlist: '',
  customVars: {
    DOMAIN: 'corp.local',
    USER: 'administrator',
    PASSWORD: 'Password123!',
  }
};

export const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  selectedPlatform: 'ALL',
  selectedDifficulty: 'ALL',
  selectedCert: 'ALL',
  selectedOs: 'ALL',
  selectedAvailability: 'ALL',
  selectedCategory: 'ALL',
  selectedVulnCategory: 'ALL',
  selectedDomain: 'all',
  excludeActiveDirectory: false,
  selectedTrack: 'ALL',
  selectedTracks: [],
  selectedStatus: 'ALL',
  selectedLanguage: 'ALL',
  selectedAreaOfInterest: 'ALL',
  selectedTechnique: 'ALL',
  selectedTags: [],
  sortBy: 'recommended',
  sortDirection: 'asc',
  hideEmptyLanes: false,
};

/** True until the user has set a local address, a remote address or a port of their own (derived, nothing persisted). */
export const selectTacticalVarsUnset = (s: { globalVars: GlobalVariables }): boolean => {
  const g = s.globalVars;
  return isPlaceholderIp(g.lhost) && isPlaceholderIp(g.targetIp) && (!g.lport || g.lport === DEFAULT_GLOBAL_VARS.lport);
};
