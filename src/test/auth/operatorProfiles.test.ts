import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore, DEFAULT_DANIEL_PROFILE } from '../../store/useAuthStore';
import { useCtfStore, mergeMachinesWithCatalog } from '../../store/useCtfStore';
import { DEMO_SOLVED_ROSTER } from '../../data/demoSolvedRoster';
import { Machine } from '../../types';

describe('Multi-Operator Identity & Profile Workspace Isolation', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset stores to default state
    useAuthStore.setState({
      user: DEFAULT_DANIEL_PROFILE,
      profiles: [DEFAULT_DANIEL_PROFILE],
      isAuthenticated: true,
      operatorProfileModalOpen: false,
    });

    useCtfStore.setState({
      currentProfileId: 'usr_daniel',
      userSolvesReset: false,
      machines: mergeMachinesWithCatalog(DEMO_SOLVED_ROSTER as Machine[], false),
      activeTargetId: null,
      customNotes: [],
      activitySessions: [],
    });
  });

  it('initializes with Daniel as default operator profile', () => {
    const user = useAuthStore.getState().user;
    const profiles = useAuthStore.getState().profiles;

    expect(user).toBeDefined();
    expect(user?.name).toBe('Daniel');
    expect(user?.id).toBe('usr_daniel');
    expect(profiles.length).toBe(1);
    expect(profiles[0].id).toBe('usr_daniel');
  });

  it('creates and logs into a new operator profile with a fresh clean workspace (0 solves)', async () => {
    // Daniel currently has solved machines
    const danielSolves = useCtfStore.getState().machines.filter((m) => m.status === 'root' || m.status === 'completed').length;
    expect(danielSolves).toBeGreaterThan(0);

    // Log in as new operator 'Sarah' with fresh start
    await useAuthStore.getState().loginAsOperator({
      name: 'Sarah',
      role: 'Web Exploitation Specialist',
      badgeColor: 'cyan',
      startFresh: true,
    });

    const activeUser = useAuthStore.getState().user;
    expect(activeUser?.name).toBe('Sarah');
    expect(activeUser?.id).toBe('usr_sarah');
    expect(activeUser?.role).toBe('Web Exploitation Specialist');

    // Sarah's workspace should have 0 solves
    const sarahMachines = useCtfStore.getState().machines;
    const sarahRooted = sarahMachines.filter((m) => m.status === 'root' || m.status === 'completed').length;
    expect(sarahRooted).toBe(0);
    expect(useCtfStore.getState().currentProfileId).toBe('usr_sarah');
    expect(useCtfStore.getState().userSolvesReset).toBe(true);

    // Verify Sarah was added to profiles roster
    const allProfiles = useAuthStore.getState().profiles;
    expect(allProfiles.length).toBe(2);
    expect(allProfiles.map((p) => p.name)).toContain('Sarah');
  });

  it('guarantees complete state isolation between operators without state bleed', async () => {
    // 1. Start with Daniel
    useAuthStore.getState().switchProfile('usr_daniel');
    const initialDanielRoots = useCtfStore.getState().machines.filter((m) => m.status === 'root' || m.status === 'completed').length;
    expect(initialDanielRoots).toBeGreaterThan(0);

    // 2. Create Sarah with fresh workspace
    await useAuthStore.getState().loginAsOperator({
      name: 'Sarah',
      startFresh: true,
    });
    expect(useCtfStore.getState().currentProfileId).toBe('usr_sarah');
    expect(useCtfStore.getState().machines.filter((m) => m.status === 'root').length).toBe(0);

    // 3. Sarah roots a machine ('thm-rootme')
    useCtfStore.getState().toggleRootFlag('thm-rootme', 'THM{sarah_flag_pwned}');
    const sarahRootsAfter = useCtfStore.getState().machines.filter((m) => m.status === 'root' || m.status === 'completed').length;
    expect(sarahRootsAfter).toBe(1);

    const sarahRootme = useCtfStore.getState().machines.find((m) => m.id === 'thm-rootme');
    expect(sarahRootme?.rootFlag).toBe('THM{sarah_flag_pwned}');

    // 4. Switch back to Daniel
    useAuthStore.getState().switchProfile('usr_daniel');
    expect(useCtfStore.getState().currentProfileId).toBe('usr_daniel');

    // Daniel's root count should remain at original count, untouched by Sarah
    const danielRoots = useCtfStore.getState().machines.filter((m) => m.status === 'root' || m.status === 'completed').length;
    expect(danielRoots).toBe(initialDanielRoots);

    // Daniel's rootme machine should have Daniel's flag or original flag, NOT Sarah's
    const danielRootme = useCtfStore.getState().machines.find((m) => m.id === 'thm-rootme');
    expect(danielRootme?.rootFlag).not.toBe('THM{sarah_flag_pwned}');

    // 5. Switch back to Sarah
    useAuthStore.getState().switchProfile('usr_sarah');
    expect(useCtfStore.getState().currentProfileId).toBe('usr_sarah');
    expect(useCtfStore.getState().machines.filter((m) => m.status === 'root' || m.status === 'completed').length).toBe(1);
    expect(useCtfStore.getState().machines.find((m) => m.id === 'thm-rootme')?.rootFlag).toBe('THM{sarah_flag_pwned}');
  });

  it('supports forking/cloning current workspace when explicitly requested', async () => {
    // Daniel has solves
    const danielRoots = useCtfStore.getState().machines.filter((m) => m.status === 'root' || m.status === 'completed').length;
    expect(danielRoots).toBeGreaterThan(0);

    // Create Alex with cloneFromCurrent: true
    await useAuthStore.getState().loginAsOperator({
      name: 'Alex',
      cloneFromCurrent: true,
      startFresh: false,
    });

    expect(useAuthStore.getState().user?.name).toBe('Alex');
    expect(useCtfStore.getState().currentProfileId).toBe('usr_alex');

    // Alex inherits a copy of the current workspace
    const alexRoots = useCtfStore.getState().machines.filter((m) => m.status === 'root' || m.status === 'completed').length;
    expect(alexRoots).toBe(danielRoots);
  });

  it('toggles operator profile modal visibility', () => {
    expect(useAuthStore.getState().operatorProfileModalOpen).toBe(false);
    useAuthStore.getState().setOperatorProfileModalOpen(true);
    expect(useAuthStore.getState().operatorProfileModalOpen).toBe(true);
    useAuthStore.getState().setOperatorProfileModalOpen(false);
    expect(useAuthStore.getState().operatorProfileModalOpen).toBe(false);
  });

  it('allows renaming and deleting profiles with safe fallback', async () => {
    await useAuthStore.getState().loginAsOperator({ name: 'TempOperator', startFresh: true });
    expect(useAuthStore.getState().user?.name).toBe('TempOperator');

    useAuthStore.getState().renameProfile('PermanentOperator');
    expect(useAuthStore.getState().user?.name).toBe('PermanentOperator');
    expect(useAuthStore.getState().user?.callsign).toBe('PermanentOperator');

    // Delete the profile
    useAuthStore.getState().deleteProfile('usr_tempoperator');
    // Should fall back to remaining profile (Daniel)
    expect(useAuthStore.getState().user?.name).toBe('Daniel');
  });

  it('atomically updates profile properties without dual-state drift between user and profiles array', async () => {
    // 1. Create operator with custom callsign
    await useAuthStore.getState().loginAsOperator({
      name: 'CyberSpecter',
      callsign: 'Specter01',
      role: 'Red Team Lead',
      startFresh: true,
    });

    const initialUser = useAuthStore.getState().user;
    expect(initialUser?.name).toBe('CyberSpecter');
    expect(initialUser?.callsign).toBe('Specter01');

    // 2. Atomically update callsign and role via updateProfile
    useAuthStore.getState().updateProfile('usr_cyberspecter', {
      callsign: 'SpecterPrime',
      role: 'Active Directory Specialist',
    });

    const updatedUser = useAuthStore.getState().user;
    const updatedInProfiles = useAuthStore.getState().profiles.find((p) => p.id === 'usr_cyberspecter');

    // Both active user session and profiles roster must match
    expect(updatedUser?.callsign).toBe('SpecterPrime');
    expect(updatedUser?.role).toBe('Active Directory Specialist');
    expect(updatedInProfiles?.callsign).toBe('SpecterPrime');
    expect(updatedInProfiles?.role).toBe('Active Directory Specialist');

    // 3. Atomically update an inactive profile without affecting active user session
    useAuthStore.getState().updateProfile('usr_daniel', {
      callsign: '0xdnd_legend',
    });

    const activeAfter = useAuthStore.getState().user;
    const danielInProfiles = useAuthStore.getState().profiles.find((p) => p.id === 'usr_daniel');

    expect(activeAfter?.id).toBe('usr_cyberspecter');
    expect(danielInProfiles?.callsign).toBe('0xdnd_legend');
  });
});
