import { describe, it, expect, beforeEach, vi } from 'vitest';

const AUTH_KEY = 'rootvector_auth_session';
const LEGACY_CLIENT_ID_KEY = 'rootvector_google_client_id';

const oldProfile = {
  id: 'usr_alice',
  email: 'alice@operator.lab',
  name: 'Alice',
  callsign: 'alice0x',
  role: 'Tactical Operator',
  badgeColor: 'emerald',
  avatarId: 'glitch-skull',
  googleId: 'google-sub-111',
  unlockedTrophies: { first_blood: '2026-02-01T00:00:00.000Z' },
  totalXp: 420,
  rankTier: 2,
  rankTitle: 'SCRIPT KIDDIE',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
};
const otherProfile = { ...oldProfile, id: 'usr_bob', name: 'Bob', callsign: 'bob', googleId: 'google-sub-222' };

describe('old saved login data (pre Google sign-in removal)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('loads an old-shape session, keeps profile data, and drops every Google field', async () => {
    localStorage.setItem(
      AUTH_KEY,
      JSON.stringify({
        state: {
          user: oldProfile,
          profiles: [oldProfile, otherProfile],
          token: 'operator_token_123',
          isAuthenticated: true,
          guestDataMigrated: true,
          googleClientId: '123456-abc.apps.googleusercontent.com',
        },
        version: 0,
      })
    );
    localStorage.setItem(LEGACY_CLIENT_ID_KEY, '123456-abc.apps.googleusercontent.com');

    const { useAuthStore } = await import('../../store/useAuthStore');
    const state = useAuthStore.getState() as unknown as Record<string, unknown>;

    // Operator data survives
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().token).toBe('operator_token_123');
    expect(useAuthStore.getState().guestDataMigrated).toBe(true);
    expect(useAuthStore.getState().user).toMatchObject({
      id: 'usr_alice',
      name: 'Alice',
      callsign: 'alice0x',
      totalXp: 420,
      rankTitle: 'SCRIPT KIDDIE',
      unlockedTrophies: { first_blood: '2026-02-01T00:00:00.000Z' },
    });
    expect(useAuthStore.getState().profiles.map((p) => p.id)).toEqual(['usr_alice', 'usr_bob']);
    expect(useAuthStore.getState().profiles[1].name).toBe('Bob');

    // Google fields are gone everywhere
    expect('googleClientId' in state).toBe(false);
    expect('googleId' in (useAuthStore.getState().user as object)).toBe(false);
    for (const p of useAuthStore.getState().profiles) expect('googleId' in p).toBe(false);

    // Legacy client-id key removed at module load
    expect(localStorage.getItem(LEGACY_CLIENT_ID_KEY)).toBeNull();

    // Actions still work on the migrated state
    expect(() => useAuthStore.getState().updateProfile('usr_alice', { callsign: 'renamed' })).not.toThrow();
    expect(useAuthStore.getState().user?.callsign).toBe('renamed');
    expect('googleId' in (useAuthStore.getState().user as object)).toBe(false);
  });

  it('tolerates a session with no user and no profiles', async () => {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ state: { user: null, googleClientId: 'x' }, version: 0 }));
    const { useAuthStore } = await import('../../store/useAuthStore');
    expect(useAuthStore.getState().user).toBeNull();
    expect(Array.isArray(useAuthStore.getState().profiles)).toBe(true);
  });
});
