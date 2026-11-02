// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, it, expect } from 'vitest';

const src = readFileSync('public/table-filter.js', 'utf8');
const run = () => new Function('module', src)({ exports: {} });

const tr = (name: string, os: string, diff: string, plat: string, tags: string) =>
  `<tr data-name="${name}" data-os="${os}" data-difficulty="${diff}" data-platform="${plat}" data-tags="${tags}"><td>${name}</td><td>${plat}</td><td>${os}</td><td>${tags}</td></tr>`;
const table = (rows: string[]) => `<table class="list"><thead><tr><th>Machine</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;

// Same shape as a certification list page: chips, then an h2 followed by an h3 and a table per difficulty.
const FIXTURE = `<main id="main"><h1>List</h1>
<h2>Jump to difficulty</h2><div class="chips"><a href="#easy">Easy (3)</a><a href="#hard">Hard (1)</a></div>
<h2>List by difficulty</h2>
<h3 id="easy">Easy (3)</h3>${table([tr('Lame', 'Linux', 'Easy', 'HTB', 'Samba|CVE-2007-2447'), tr('Blue', 'Windows', 'Easy', 'THM', 'EternalBlue|SMB'), tr('Bashed', 'Linux', 'Easy', 'HTB', 'Sudo')])}
<h3 id="hard">Hard (1)</h3>${table([tr('Zipping', 'Linux', 'Hard', 'HTB', '')])}
<p>after</p></main>`;

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
const visibleNames = () => [...document.querySelectorAll<HTMLElement>('tbody tr')].filter((r) => !r.hidden).map((r) => r.dataset.name);

describe('table filter in the DOM', () => {
  beforeEach(() => {
    document.body.innerHTML = FIXTURE;
    run();
  });

  it('adds one labelled toolbar before the first list section and leaves the tables intact', () => {
    expect(document.querySelectorAll('.tf')).toHaveLength(1);
    expect($('.tf').nextElementSibling?.textContent).toBe('List by difficulty');
    expect(document.querySelectorAll('tbody tr')).toHaveLength(4);
    for (const id of ['q', 'os', 'difficulty', 'platform', 'tag', 'sort']) {
      expect(document.getElementById('tf-' + id), id).toBeTruthy();
      expect(document.querySelector(`label[for="tf-${id}"]`)?.textContent, id).toBeTruthy();
    }
    expect($('.tf-count').getAttribute('aria-live')).toBe('polite');
    expect($('.tf-count').textContent).toBe('Showing 4 of 4 machines');
    expect(document.getElementById('tf-sort')!.textContent).not.toContain('Difficulty');
  });

  it('search narrows rows, count and sections; hidden sections drop their chips', async () => {
    type(document.getElementById('tf-q') as HTMLInputElement, 'zipp');
    await wait(200);
    expect(visibleNames()).toEqual(['Zipping']);
    expect($('.tf-count').textContent).toBe('Showing 1 of 4 machines');
    expect($<HTMLElement>('#easy').hidden).toBe(true);
    expect($<HTMLElement>('#hard').hidden).toBe(false);
    expect($<HTMLElement>('a[href="#easy"]').hidden).toBe(true);
    expect($<HTMLElement>('a[href="#hard"]').hidden).toBe(false);
  });

  it('selects filter, an empty result shows the message, and Reset restores everything', () => {
    choose(document.getElementById('tf-os') as HTMLSelectElement, 'Windows');
    expect(visibleNames()).toEqual(['Blue']);
    choose(document.getElementById('tf-tag') as HTMLSelectElement, 'Sudo');
    expect(visibleNames()).toEqual([]);
    expect($('.tf-count').textContent).toBe('Showing 0 of 4 machines');
    expect($<HTMLElement>('.tf-empty').hidden).toBe(false);
    expect($('.tf-empty').textContent).toContain('No machines match');
    $<HTMLButtonElement>('.tf-reset').click();
    expect(visibleNames()).toEqual(['Lame', 'Blue', 'Bashed', 'Zipping']);
    expect($<HTMLElement>('.tf-empty').hidden).toBe(true);
    expect((document.getElementById('tf-os') as HTMLSelectElement).value).toBe('');
    expect(document.querySelectorAll('[hidden]:not(.tf-empty)')).toHaveLength(0);
  });

  it('sorts rows inside their own table only, and Default order restores the source order', () => {
    const order = () => [...document.querySelectorAll<HTMLElement>('tbody tr')].map((r) => r.dataset.name);
    const sort = document.getElementById('tf-sort') as HTMLSelectElement;
    choose(sort, 'name-desc');
    expect(order()).toEqual(['Lame', 'Blue', 'Bashed', 'Zipping']);
    choose(sort, 'name-asc');
    expect(order()).toEqual(['Bashed', 'Blue', 'Lame', 'Zipping']);
    expect(document.querySelectorAll('table')[0].querySelectorAll('tr[data-name]')).toHaveLength(3);
    choose(sort, '');
    expect(order()).toEqual(['Lame', 'Blue', 'Bashed', 'Zipping']);
  });

  it('does nothing and does not throw on a page without list tables', () => {
    document.body.innerHTML = '<main id="main"><h1>Other</h1><table><tbody><tr><td>x</td></tr></tbody></table></main>';
    expect(run).not.toThrow();
    expect(document.querySelector('.tf')).toBeNull();
  });
});
