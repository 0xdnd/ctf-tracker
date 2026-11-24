import { describe, it, expect } from 'vitest';
import { maskSecretsInText, SECRET_MASK } from '../../utils/secretMasker';

const MD5 = '5f4dcc3b5aa765d61d8327deb882cf99';
const SHA1 = '5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8';
const SHA256 = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';
const LM = 'aad3b435b51404eeaad3b435b51404ee';
const NT = '31d6cfe0d16ae931b73c59d7e0c089c0';

describe('maskSecretsInText: what is masked', () => {
  it.each([
    ['an MD5-length hex hash', `hash ${MD5} found`, MD5],
    ['a SHA-1-length hex hash', `hash ${SHA1} found`, SHA1],
    ['a SHA-256-length hex hash', `hash ${SHA256} found`, SHA256],
  ])('masks %s and keeps the text around it', (_name, input, secret) => {
    const out = maskSecretsInText(input);
    expect(out).not.toContain(secret);
    expect(out).toContain(SECRET_MASK);
    expect(out.startsWith('hash ')).toBe(true);
    expect(out.endsWith(' found')).toBe(true);
  });

  it('masks an NTLM LM:NT pair as one unit, keeping the secretsdump prefix', () => {
    const out = maskSecretsInText(`Administrator:500:${LM}:${NT}:::`);
    expect(out).not.toContain(LM);
    expect(out).not.toContain(NT);
    expect(out.startsWith('Administrator:500:')).toBe(true);
    expect(out.endsWith(':::')).toBe(true);
  });

  it('masks bearer tokens', () => {
    const out = maskSecretsInText('curl -H "Authorization: Bearer abc123.def456-ghi789" https://x');
    expect(out).not.toContain('abc123.def456-ghi789');
    expect(out).toContain('Bearer');
    expect(out).toContain('https://x');
  });

  it('masks JWTs and well-known API token formats', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const gh = 'ghp_' + 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8';
    const aws = 'AKIAIOSFODNN7EXAMPLE';
    const out = maskSecretsInText(`jwt=${jwt} gh ${gh} aws ${aws}`);
    for (const secret of [jwt, gh, aws]) expect(out).not.toContain(secret);
  });

  it('masks private key blocks completely', () => {
    const key = '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAA\nQyNTUxOQAAACD\n-----END OPENSSH PRIVATE KEY-----';
    const out = maskSecretsInText(`before\n${key}\nafter`);
    expect(out).not.toContain('b3BlbnNzaC1rZXktdjEAAAAA');
    expect(out).not.toContain('END OPENSSH');
    expect(out.startsWith('before\n')).toBe(true);
    expect(out.endsWith('\nafter')).toBe(true);
  });

  it('masks an unterminated private key block to the end of the text', () => {
    const out = maskSecretsInText('x\n-----BEGIN RSA PRIVATE KEY-----\nMIIEow');
    expect(out).not.toContain('MIIEow');
  });

  it.each([
    ['password=hunter2', 'hunter2'],
    ['PASSWORD: S3cret!pw', 'S3cret!pw'],
    ['passwd = "correct horse"', 'correct horse'],
    ["api_key='k-12345abcde'", 'k-12345abcde'],
    ['token=abcdef123456', 'abcdef123456'],
    ['smbclient -U user --password=Summer2020! //10.0.0.1/share', 'Summer2020!'],
  ])('masks the value of %s but keeps the key', (input, secret) => {
    const out = maskSecretsInText(input);
    expect(out).not.toContain(secret);
    expect(out).toContain(SECRET_MASK);
  });

  it('keeps the key name of a key/value pair readable', () => {
    expect(maskSecretsInText('password=hunter2 next')).toBe(`password=${SECRET_MASK} next`);
  });
});

describe('maskSecretsInText: normal text is left unchanged', () => {
  it.each([
    'Found SMB share on 10.10.10.3, port 445 open, nmap -sV -p- 10.10.10.3',
    '## Foothold\n\nRan `gobuster dir -u http://10.10.10.3 -w common.txt` and found /admin.',
    'The password reset page is vulnerable to host header injection.',
    'Token handling looks fine; nothing stored in localStorage.',
    'commit 5baa61e is the fix',
    'timestamp 20261119123456789012345678901234 is not a hash',
    'user flag is in /home/user/user.txt',
    'Kerberos ticket lifetime is 10 hours; renew until 7 days.',
    '',
  ])('does not change %j', (text) => {
    expect(maskSecretsInText(text)).toBe(text);
  });

  it('does not touch hex runs of other lengths', () => {
    const t = 'abcdef0123456789abcdef01234567 (30) and abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab (66)';
    expect(maskSecretsInText(t)).toBe(t);
  });

  it('returns the same string for non-string-like input', () => {
    expect(maskSecretsInText(undefined as unknown as string)).toBeUndefined();
  });
});

describe('maskSecretsInText: lab credential formats', () => {
  const NTPROOF = '0123456789abcdef0123456789abcdef';
  const BLOB = '0101000000000000c0653150de09d201a1b2c3d4e5f60718';
  const CRYPT512 = 'Q1ZmYXJ0S3FnbHhsNnVWZ0N3VUo3a3JGWkFhM1BoU0tYb2VqY1VzVmF4WjZTZ0lCcDBmaG9nR2VrZ0NZVHJWUw';
  const BCRYPT_BODY = 'abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ0123456';
  it.each([
    ['a NetNTLMv2 capture', `alice::CORP:1122334455667788:${NTPROOF}:${BLOB}`, [NTPROOF, BLOB, '1122334455667788']],
    [
      'a NetNTLMv1 capture',
      `bob::CORP:${'a1'.repeat(24)}:${'b2'.repeat(24)}:1122334455667788`,
      ['a1'.repeat(24), 'b2'.repeat(24)],
    ],
    [
      'a Kerberoast krb5tgs hash',
      '$krb5tgs$23$*svc_sql$CORP.LOCAL$MSSQLSvc/db01.corp.local*$abcdef0123456789abcdef0123456789$0123456789abcdef0123456789abcdef0123456789abcdef',
      ['abcdef0123456789abcdef0123456789', 'MSSQLSvc/db01'],
    ],
    [
      'an AS-REP roast krb5asrep hash',
      '$krb5asrep$23$jdoe@CORP.LOCAL:abcdef0123456789abcdef0123456789$0123456789abcdef0123456789abcdef0123456789abcdef',
      ['abcdef0123456789abcdef0123456789'],
    ],
    ['a sha512-crypt hash', `root:$6$rounds=5000$saltsalt$${CRYPT512}:19000:0:99999:7:::`, [CRYPT512, 'saltsalt']],
    [
      'a sha256-crypt hash',
      'root:$5$saltsalt$Zx9y8w7v6u5t4s3r2q1p0oNmLkJiHgFeDcBa123456:1:0:::',
      ['Zx9y8w7v6u5t4s3r2q1p0oNmLkJiHgFeDcBa123456'],
    ],
    ['an md5-crypt hash', 'root:$1$saltsalt$kJ8hG5fD3sA1pO9iU7yT5r:1:0:::', ['kJ8hG5fD3sA1pO9iU7yT5r']],
    [
      'a yescrypt hash',
      'user:$y$j9T$F5Jx5fExrKuPp53xLKQ..1$X3DX6M94c7o.9agCG9G317fhZg9SqC2aLhvSflGMnA5:1:::',
      ['X3DX6M94c7o.9agCG9G317fhZg9SqC2aLhvSflGMnA5', 'F5Jx5fExrKuPp53xLKQ..1'],
    ],
    ['a 2y bcrypt hash', `admin $2y$10$${BCRYPT_BODY} ok`, [BCRYPT_BODY]],
    ['a 2a bcrypt hash', `$2a$12$${BCRYPT_BODY}`, [BCRYPT_BODY]],
  ])('masks %s', (_name, input, secrets) => {
    const out = maskSecretsInText(input);
    for (const secret of secrets) expect(out).not.toContain(secret);
    expect(out).toContain(SECRET_MASK);
  });

  it('keeps the account name of a NetNTLMv2 capture and the text around it', () => {
    const out = maskSecretsInText(`got alice::CORP:1122334455667788:${NTPROOF}:${BLOB} from Responder`);
    expect(out.startsWith('got alice::CORP:')).toBe(true);
    expect(out.endsWith(' from Responder')).toBe(true);
  });

  it.each([
    'std::vector<int> v; Foo::bar: baz',
    'ssh user::host is not a capture; CORP:1122334455667788 is a port pair',
    'The $6 fee and the $5 fee are not hashes.',
    'Use $y$ or $6$ as the shadow prefix; $2y$ is bcrypt.',
    'Cost $1$ per run, $krb5tgs$ is the Kerberoast hashcat format.',
    'hashcat -m 13100 hashes.txt (krb5tgs) and -m 18200 (krb5asrep)',
    'price: $5$ and $6$ discount',
  ])('does not change %j', (text) => {
    expect(maskSecretsInText(text)).toBe(text);
  });
});

describe('maskSecretsInText: performance', () => {
  it.each([
    ['dotted', 'a.'],
    ['dashed', 'a-'],
  ])('masks 200 KB of a long %s token in under 200 ms', (_name, unit) => {
    // The leading word passes the pre-check gate, so the NetNTLM patterns really run over the long token.
    const text = 'token ' + unit.repeat(100_000);
    const start = performance.now();
    const out = maskSecretsInText(text);
    expect(performance.now() - start).toBeLessThan(200);
    expect(out).toBe(text);
  });

  it('still masks a capture that follows a long dotted run', () => {
    const capture = `alice::CORP:1122334455667788:${'ab'.repeat(16)}:${'cd'.repeat(20)}`;
    const out = maskSecretsInText(`${'a.'.repeat(500)} ${capture}`);
    expect(out).toContain('alice::CORP:');
    expect(out).toContain(SECRET_MASK);
    expect(out).not.toContain('1122334455667788');
  });
});
