// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, it, expect } from 'vitest';

const varsBarSrc = readFileSync('public/vars-bar.js', 'utf8');
const localProgressSrc = readFileSync('public/local-progress.js', 'utf8');
const tableFilterSrc = readFileSync('public/table-filter.js', 'utf8');

const runScript = (code: string) => new Function('module', code)({ exports: {} });

describe('vars-bar.js', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('does nothing when code blocks contain no placeholders', () => {
    document.body.innerHTML = '<main id="main"><h2>Commands</h2><pre><code>whoami -all</code></pre></main>';
    runScript(varsBarSrc);
    expect(document.getElementById('zb-vars-bar')).toBeNull();
  });

  it('injects labelled inputs, substitutes placeholders live, syncs localStorage and clears cleanly', () => {
    document.body.innerHTML =
      '<main id="main"><h2>Recon</h2><pre><code>nmap -sV {TARGET_IP} &amp;&amp; nc {LHOST} {LPORT}</code></pre></main>';
    runScript(varsBarSrc);
    const bar = document.getElementById('zb-vars-bar');
    expect(bar).not.toBeNull();

    const targetIn = document.getElementById('vb-target') as HTMLInputElement;
    const lhostIn = document.getElementById('vb-lhost') as HTMLInputElement;
    const lportIn = document.getElementById('vb-lport') as HTMLInputElement;
    expect(document.querySelector('label[for="vb-target"]')?.textContent).toBe('TARGET_IP');

    targetIn.value = '10.10.11.42';
    targetIn.dispatchEvent(new Event('input', { bubbles: true }));
    lhostIn.value = '10.10.14.9';
    lhostIn.dispatchEvent(new Event('input', { bubbles: true }));
    lportIn.value = '9001';
    lportIn.dispatchEvent(new Event('input', { bubbles: true }));

    const code = document.querySelector('pre code')!;
    expect(code.textContent).toBe('nmap -sV 10.10.11.42 && nc 10.10.14.9 9001');
    expect(JSON.parse(localStorage.getItem('zerobox-static-vars') || '{}')).toMatchObject({
      targetIp: '10.10.11.42',
      lhost: '10.10.14.9',
      lport: '9001',
    });

    const reset = bar!.querySelector('button') as HTMLButtonElement;
    reset.click();
    expect(code.textContent).toBe('nmap -sV {TARGET_IP} && nc {LHOST} {LPORT}');
  });
});

describe('local-progress.js', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `<main id="main">
      <table class="list"><tbody>
        <tr data-name="Lame" data-platform="HTB"><td><a href="/machines/htb-lame/">Lame</a></td><td>HTB</td></tr>
        <tr data-name="Blue" data-platform="HTB"><td><a href="/machines/htb-blue/">Blue</a></td><td>HTB</td></tr>
      </tbody></table>
    </main>`;
  });

  it('leaves the DOM completely untouched when no local progress exists', () => {
    runScript(localProgressSrc);
    expect(document.querySelector('.lp-summary')).toBeNull();
    expect(document.querySelectorAll('[data-local-solved]')).toHaveLength(0);
  });

  it('marks solved rows and inserts summary without mutating first-cell text', () => {
    localStorage.setItem(
      'zerobox_profile_guest',
      JSON.stringify({
        machines: [
          { id: 'htb-lame', name: 'Lame', platform: 'HTB', status: 'root' },
          { id: 'htb-blue', name: 'Blue', platform: 'HTB', status: 'recon' },
        ],
      })
    );
    runScript(localProgressSrc);
    expect(document.querySelector('.lp-summary')?.textContent).toBe('Solved in your browser: 1 of 2 on this page.');
    const solvedRows = document.querySelectorAll('tr[data-local-solved="true"]');
    expect(solvedRows).toHaveLength(1);
    expect(solvedRows[0].querySelector('td')?.textContent).toBe('Lame');
  });
});

describe('table-filter.js URL sync and / shortcut', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/oscp-like-machines/');
    document.body.innerHTML = `<main id="main"><h1>OSCP</h1>
      <h2>List</h2>
      <table class="list"><thead><tr><th>Machine</th></tr></thead><tbody>
        <tr data-name="Lame" data-os="Linux" data-difficulty="Easy" data-platform="HTB" data-tags="Samba"><td>Lame</td></tr>
        <tr data-name="Blue" data-os="Windows" data-difficulty="Easy" data-platform="HTB" data-tags="SMB"><td>Blue</td></tr>
      </tbody></table>
    </main>`;
    runScript(tableFilterSrc);
  });

  it('syncs OS filter to location.search and restores clean pathname on Reset', () => {
    const osSelect = document.getElementById('tf-os') as HTMLSelectElement;
    osSelect.value = 'Windows';
    osSelect.dispatchEvent(new Event('change', { bubbles: true }));
    expect(location.search).toBe('?os=Windows');

    (document.querySelector('.tf-reset') as HTMLButtonElement).click();
    expect(location.search).toBe('');
    expect(location.pathname).toBe('/oscp-like-machines/');
  });

  it('focuses search on / key when outside inputs', () => {
    const search = document.getElementById('tf-q') as HTMLInputElement;
    expect(document.activeElement).not.toBe(search);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(search);
  });
});
