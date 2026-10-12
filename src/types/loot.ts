export type CredentialType = 'password' | 'hash' | 'ticket' | 'key' | 'token' | 'other';

/** A secret (or secret-bearing identity) captured during an engagement. Per-profile, persisted via lootPersistence. */
export interface Credential {
  id: string;
  type: CredentialType;
  username: string;
  domain?: string;
  secret: string;
  /** Top identifyHash() candidate name; only meaningful for type 'hash'. */
  hashType?: string;
  sourceMachineId?: string;
  notes?: string;
  createdAt: string;
  /** True when the secret was stripped by a redacted backup export. */
  redacted?: boolean;
}

export type CredService =
  | 'smb'
  | 'winrm'
  | 'rdp'
  | 'ssh'
  | 'ldap'
  | 'mssql'
  | 'http'
  | 'ftp'
  | 'kerberos'
  | 'other';

export type CredAttemptResult = 'tried' | 'valid' | 'invalid';

/** One credential tried against one service on one machine; unique per (credId, machineId, service). */
export interface CredAttempt {
  id: string;
  credId: string;
  machineId: string;
  service: CredService;
  port?: number;
  result: CredAttemptResult;
  at: string;
}

export type LootItemCategory = 'flag' | 'service' | 'file' | 'note';

/** Non-credential loot (flags, discovered services, files, free-form notes). */
export interface LootItem {
  id: string;
  category: LootItemCategory;
  title: string;
  value: string;
  username?: string;
  notes?: string;
  machineId?: string;
  createdAt: string;
}

export interface LootState {
  credentials: Credential[];
  credAttempts: CredAttempt[];
  lootItems: LootItem[];
}

export type NewCredentialInput = Pick<Credential, 'type' | 'username' | 'secret'> &
  Partial<Omit<Credential, 'type' | 'username' | 'secret'>>;

export type CredentialPatch = Partial<Omit<Credential, 'id' | 'createdAt'>>;

export type NewCredAttemptInput = Pick<CredAttempt, 'credId' | 'machineId' | 'service' | 'result'> &
  Partial<Pick<CredAttempt, 'id' | 'port' | 'at'>>;

export type NewLootItemInput = Pick<LootItem, 'category' | 'title' | 'value'> &
  Partial<Omit<LootItem, 'category' | 'title' | 'value'>>;

export type LootItemPatch = Partial<Omit<LootItem, 'id' | 'createdAt'>>;
