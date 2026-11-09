/** Count-only mirror of the Vault page total (flags, services, credentials, loot); the page itself is lazy, so it can't be imported here. */
interface VaultCountMachine {
  userFlag?: string;
  userPwnedAt?: string;
  rootFlag?: string;
  rootPwnedAt?: string;
  services?: unknown[];
}

export function countVaultItems(
  machines: readonly VaultCountMachine[],
  credentials: readonly unknown[],
  lootItems: readonly unknown[]
): number {
  let n = credentials.length + lootItems.length;
  for (const m of machines) {
    if (m.userFlag || m.userPwnedAt) n++;
    if (m.rootFlag || m.rootPwnedAt) n++;
    n += m.services?.length ?? 0;
  }
  return n;
}
