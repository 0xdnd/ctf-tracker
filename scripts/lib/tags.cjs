// Shared tag handling for the static pages. Rendering only: topic hub membership (techniques.cjs matchesTag) always
// tests the raw catalog tags with normTag, never the cleaned labels from here.

// Lowercase, separators (-, _) as one space: the form tags and keywords are compared in.
const normTag = (t) => String(t).toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
// Case- and separator-insensitive identity: "Command-Injection", "Command Injection" and "command-injection" share one key.
const tagKey = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '');

// Words the platform, OS, difficulty or list already says. Keys are normTag forms, so "starting-point" is covered too.
// HEAD_GENERIC_TAGS is the set that applied before the list was extended: head and JSON-LD output (frozen until 2026-11-15) keep filtering by it.
const HEAD_GENERIC_TAGS = new Set(['ctf', 'linux', 'windows', 'privesc', 'web', 'easy', 'medium', 'hard', 'insane', 'starting point', 'tier 0', 'tier 1', 'tier 2']);
// Beyond the head set, displayed tags also drop words too broad to name a topic (an area, an access state, a platform, a learning-path
// label) and labels that only say how basic a machine is. Track names (OSCP, CPTS, ...) are passed to createTagCleaner as `isTrack`.
const BROAD_TAGS = [
  'cms', 'credentials', 'containers', 'database', 'databases', 'share', 'file', 'file system', 'process', 'network', 'binary', 'manual', 'website', 'authentication',
  'automation', 'cloud', 'debug', 'email', 'mobile', 'recon', 'reconnaissance', 'administrator', 'anonymous', 'bypass', 'multi host', 'no auth',
  'unauthenticated', 'unauthorized access', 'king of the hill', 'privilege escalation', 'linux privesc', 'windows privesc', 'classic pentesting', 'red team',
  'exploiting cve', 'reverse shell', 'linux system', 'linux fundamentals',
  'basic linux fundamentals', 'basic linux knowledge', 'basic windows knowledge', 'basic local linux', 'basic web', 'basic cloud knowledge', 'advanced local', 'advanced remote',
];
// Source labels the Proving Grounds and VulnHub catalog files carry (which lab set a row came from), not topics.
const SOURCE_LABEL_TAGS = ['pg practice', 'pg play', 'also on pg play', 'tj null classic'];
const GENERIC_TAGS = new Set([...HEAD_GENERIC_TAGS, ...SOURCE_LABEL_TAGS, 'htb', 'thm', 'techniques', 'vulnerabilities', 'security', ...BROAD_TAGS]);
const TIER = /^tier \d+$/;
const isGenericTag = (t) => {
  const n = normTag(t);
  return GENERIC_TAGS.has(n) || TIER.test(n);
};

// Pieces left over when the catalog import split a phrase at a comma or a slash.
const CONNECTORS_FIRST = new Set(['and', 'or', 'of', 'the', 'with', 'for', 'to']);
const CONNECTORS_LAST = new Set(['and', 'or', 'of', 'the', 'with', 'for', 'to', 'a', 'an', 'via']);
const FRAGMENTS = new Set([
  'known', 'post', 'command', 'pass', 'polling', 'hole', 'options', 'mechanisms', 'streams', 'combinations', 'transfers', 'patches',
  'boolean', 'forgery', 'server', 'injection', 'hash attacks', 'line obfuscation', 'blacklist bypassing', 'bit binaries',
  'curve cryptography', 'exploiting world', 'writable files', 'user agent t', 'php x', 'creating an http', 'ssrf using http long',
  'side template injection', 'reverse engineering 64', 'cracking password', 'protected zip files', 'silenttrinity post', 'exploiting union',
  'exploiting phuip', 'fpizdam', 'mpart', 'execute files', 'binaries with ret2libc',
]);
function isJunkTag(t) {
  const s = String(t).trim();
  if (!/[a-z0-9]/i.test(s)) return true; // "-" and other punctuation
  if (/["“”()[\]{}]/.test(s)) return true; // stray quote or bracket from a bad split
  if (/^\d+$/.test(s) || /^\d+-(and|or|to|the|with)-/i.test(s)) return true; // bare numbers, years, "22204-and-CVE"
  if (/^www\.|\.(com|net|org|io)$/i.test(s)) return true; // a website, not a topic
  const words = normTag(s).split(' ');
  if (words[0] === 'based' || CONNECTORS_FIRST.has(words[0]) || CONNECTORS_LAST.has(words[words.length - 1])) return true;
  return FRAGMENTS.has(words.join(' '));
}

// Acronyms that keep their capitals whichever spelling is most common in the data.
const SPELLING_OVERRIDES = {
  sqli: 'SQLi', suid: 'SUID', lfi: 'LFI', rfi: 'RFI', rce: 'RCE', ssh: 'SSH', smb: 'SMB', ftp: 'FTP', rdp: 'RDP', snmp: 'SNMP',
  ldap: 'LDAP', dns: 'DNS', http: 'HTTP', php: 'PHP', api: 'API', idor: 'IDOR', ssti: 'SSTI', ssrf: 'SSRF', xss: 'XSS', xxe: 'XXE', mssql: 'MSSQL',
};

const trimmed = (t) => String(t).trim().replace(/[.,;:]+$/, '');
const capitals = (s) => (s.match(/[A-Z]/g) || []).length;

// Spellings of one topic that the data keeps under different names: tagKey of the variant -> tagKey of the label it merges into.
// Both sides are keys of tags that exist in the catalog; the merged tag is always labelled with a spelling the data already has
// for the target key, so no label is invented. Display only: hub membership still tests every raw tag.
const TAG_ALIASES = {
  sqlinjection: 'sqli', basicsqlinjection: 'sqli', localfileinclusion: 'lfi', pathtraversal: 'directorytraversal', shellcommandinjection: 'commandinjection',
  exploitingsuidfiles: 'suid', exploitingsuidbinaries: 'suid', suidabuse: 'suid', suidbinary: 'suid',
  sudoprivesc: 'sudo', exploitingsudonopasswd: 'exploitingnopasswd',
  asreproast: 'asreproasting', asreproastingattack: 'asreproasting', kerberoast: 'kerberoasting', silverticketattack: 'silverticket',
  dcsyncattack: 'dcsync', dnsadminsabuse: 'dnsadmins', dockerbreakout: 'dockerescape',
  hashcracking: 'passwordcracking', john: 'johntheripper', johncracking: 'johntheripper', hydrassh: 'hydra', passwordspray: 'passwordspraying',
  deserializationattacks: 'deserialization', insecuredeserialization: 'deserialization', exploitingpythonpickle: 'pickledeserialization',
  networkpivoting: 'pivoting', tunnelingportsoverssh: 'sshtunneling', sshportforwarding: 'portforwarding',
  xssattacks: 'xss', xxeinjection: 'xxe', xmlentityinjection: 'xxe', fileuploadbypass: 'fileupload', unrestrictedfileupload: 'fileupload',
  exploitingssti: 'ssti', enumeratingwordpress: 'wordpress', exploitingwordpress: 'wordpress',
  sourcecodeanalysis: 'sourcecodereview', codeauditing: 'sourcecodereview', basicsteganography: 'steganography', basicsteganograpy: 'steganography',
  basicbufferoverflow: 'bufferoverflow', exploitingsmb: 'smb', exploitingsamba: 'samba', exploitingmssql: 'mssql',
  exploitingtarwildcards: 'tarwildcard', tarwildcardprivesc: 'tarwildcard', gtfobinsabuse: 'gtfobins', vhost: 'virtualhost', apachelogpoisoning: 'logpoisoning',
  applockerpolicies: 'applocker', applockerbypassing: 'applocker', webauthbypass: 'authenticationbypass', cookietampering: 'cookiemanipulation',
  forgingjwttokens: 'jwtforgery', paddingoracleattack: 'paddingoracle', exploitingheartbleed: 'heartbleed', ajpghostcat: 'ghostcat',
  snmpwalk: 'snmp', enumeratingsnmp: 'snmp',
};
const keyOf = (s) => {
  const k = tagKey(s);
  return TAG_ALIASES[k] || k;
};

/**
 * Builds the tag cleaner from every machine's raw tag list (the data decides the canonical spelling: the most frequent one,
 * ties to the one with more capitals, then alphabetical; SPELLING_OVERRIDES wins for acronyms; a merged group takes the label
 * from the target key's own spellings, so the label is always one the data already has).
 * options.isTrack(raw) -> true for a certification or exam track name (OSCP, CPTS, ...): a track is not a topic, so it is dropped.
 * clean(tags) -> [{ label, raws }]: junk, generic and track tags dropped, spelling variants merged and deduped, source order kept,
 * `raws` being the source spellings behind each label (used to decide whether the tag links to a topic hub).
 */
function createTagCleaner(tagLists, options = {}) {
  const isTrack = options.isTrack || (() => false);
  const counts = new Map(); // merged key -> Map(spelling -> n)
  const own = new Map(); // key before aliasing -> Map(spelling -> n)
  for (const list of tagLists) {
    for (const raw of list || []) {
      if (typeof raw !== 'string' || isJunkTag(raw)) continue;
      const s = trimmed(raw);
      const k = keyOf(s);
      if (!k) continue;
      for (const [map, key] of [[counts, k], [own, tagKey(s)]]) {
        if (!map.has(key)) map.set(key, new Map());
        map.get(key).set(s, (map.get(key).get(s) || 0) + 1);
      }
    }
  }
  const pick = (spellings) => [...spellings.entries()].sort((a, b) => b[1] - a[1] || capitals(b[0]) - capitals(a[0]) || a[0].localeCompare(b[0]))[0][0];
  const canon = new Map();
  for (const [k, spellings] of counts) {
    const best = pick(own.get(k) || spellings);
    canon.set(k, SPELLING_OVERRIDES[k] || (/^cve-\d/i.test(best) ? best.toUpperCase() : best));
  }
  const label = (raw) => {
    if (typeof raw !== 'string' || isJunkTag(raw) || isGenericTag(raw) || isTrack(raw)) return null;
    const s = trimmed(raw);
    return canon.get(keyOf(s)) || s;
  };
  function clean(tags) {
    const out = [];
    const byKey = new Map();
    for (const raw of tags || []) {
      const l = label(raw);
      if (!l) continue;
      const k = keyOf(l);
      if (byKey.has(k)) byKey.get(k).raws.push(raw);
      else {
        const e = { label: l, raws: [raw] };
        byKey.set(k, e);
        out.push(e);
      }
    }
    return out;
  }
  return { clean, label, labels: (tags) => clean(tags).map((e) => e.label) };
}

module.exports = { normTag, tagKey, GENERIC_TAGS, HEAD_GENERIC_TAGS, TAG_ALIASES, isGenericTag, isJunkTag, createTagCleaner };
