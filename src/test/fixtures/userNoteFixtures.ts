import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import { useCtfStore } from '../../store/useCtfStore';

/**
 * Small in-test stand-ins for notes a user imported from their own vault.
 * The app ships no bundled notes, so tests seed these explicitly.
 */
export const FIXTURE_IMPORTED_NOTES: CptsNoteEntry[] = [
  {
    id: '01-recon-port-scanning',
    title: 'Network Discovery & Port Scanning',
    titleEn: 'Network Discovery & Port Scanning',
    category: '01 Recon',
    rawCategory: '01 Recon',
    subCategory: 'Scanning',
    tags: ['nmap', 'recon'],
    difficulty: 'Easy',
    summary: 'Fixture note: host discovery and port scanning.',
    commands: ['nmap -sC -sV -p- $TARGET'],
    relPath: '01 Recon/01 Network Discovery & Port Scanning.md',
    filename: '01 Network Discovery & Port Scanning',
    rawMarkdown: '# Network Discovery & Port Scanning\n\n```bash\nnmap -sC -sV -p- $TARGET\n```\n\nSee [[Web Content Discovery]].',
  },
  {
    id: '02-web-directory-fuzzing',
    title: 'Web Content Discovery',
    titleEn: 'Web Content Discovery',
    category: '02 Web',
    rawCategory: '02 Web',
    subCategory: 'Fuzzing',
    tags: ['ffuf', 'web'],
    difficulty: 'Easy',
    summary: 'Fixture note: directory and vhost fuzzing.',
    commands: ['ffuf -u http://$TARGET/FUZZ -w words.txt'],
    relPath: '02 Web/02 Web Content Discovery.md',
    filename: '02 Web Content Discovery',
    rawMarkdown: '# Web Content Discovery\n\n```bash\nffuf -u http://$TARGET/FUZZ -w words.txt\n```',
  },
  {
    id: '07-kerberos-attacks-master',
    title: 'Kerberos Attacks',
    titleEn: 'Kerberos Attacks',
    category: '07 Active Directory',
    rawCategory: '07 Active Directory',
    subCategory: 'Kerberos',
    tags: ['kerberos', 'active-directory'],
    difficulty: 'Hard',
    summary: 'Fixture note: roasting and ticket attacks.',
    commands: ['GetUserSPNs.py -request domain/user'],
    relPath: '07 Active Directory/07 Kerberos Attacks.md',
    filename: '07 Kerberos Attacks',
    rawMarkdown: '# Kerberos Attacks\n\n```bash\nGetUserSPNs.py -request domain/user\n```',
  },
];

export const FIXTURE_WIKILINK_MAP: Record<string, string> = {
  'network discovery & port scanning': '01-recon-port-scanning',
  'web content discovery': '02-web-directory-fuzzing',
  'kerberos attacks': '07-kerberos-attacks-master',
};

/** Puts the fixture notes into the store as if the user had imported them. */
export function seedImportedNotes(notes: CptsNoteEntry[] = FIXTURE_IMPORTED_NOTES): void {
  useCtfStore.setState({ userNotes: notes.map((n) => ({ ...n })), userWikilinkMap: { ...FIXTURE_WIKILINK_MAP } });
}
