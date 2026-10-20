// /htb-pro-labs-guide/
// Compares the 10 Official Hack The Box Pro Labs from src/data/proLabsData.ts (public metadata only:
// lab names, host counts, flag counts, difficulty tiers, exam alignment, and official HTB links).
const PATH = '/htb-pro-labs-guide/';
const PROLABS_URL = 'https://app.hackthebox.com/pro-labs';

function build({ model, esc }) {
  const labs = model.proLabs || [];
  const totalHosts = labs.reduce((acc, l) => acc + (l.hostCount || 0), 0);
  const totalFlags = labs.reduce((acc, l) => acc + (l.flagCount || 0), 0);
  const hostCounts = labs.map((l) => l.hostCount || 0);
  const hostRange = labs.length ? `${Math.min(...hostCounts)} to ${Math.max(...hostCounts)} hosts` : 'multiple hosts';
  // Counts quoted in the prose come from the lab data, so a data change cannot leave stale numbers behind.
  const lab = (name) => {
    const l = labs.find((x) => x.name === name);
    if (!l) throw new Error(`htb-pro-labs guide: lab "${name}" missing from model.proLabs`);
    return l;
  };
  const hosts = (name) => `${lab(name).hostCount} hosts`;
  const hostsFlags = (name) => `${lab(name).hostCount} hosts, ${lab(name).flagCount} flags`;
  const hostsFlagsDiff = (name) => `${hostsFlags(name)}, ${lab(name).difficulty}`;

  const rows = labs
    .map(
      (l) =>
        `<tr><td><a href="${esc(l.roomUrl)}" rel="nofollow noopener">${esc(l.name)}</a></td><td>${esc(l.difficulty)}</td><td>${l.hostCount}</td><td>${l.flagCount}</td><td>${esc((l.examAlignment || []).join(', '))}</td><td class="hide-sm">${esc(l.description)}</td></tr>`
    )
    .join('');

  const faq = [
    [
      'Which HTB Pro Lab is best for CPTS and OSCP preparation?',
      `Genesis (${hostsFlagsDiff('Genesis')}) and Dante (${hostsFlagsDiff('Dante')}) are the standard starting points. Genesis focuses on foundational Active Directory, while Dante introduces multi-subnet pivoting across mixed Linux and Windows hosts, which maps closely to both CPTS and OSCP. Mayhem (${hostsFlagsDiff('Mayhem')}) is a strong follow-up for multi-tier network segregation.`,
    ],
    [
      'Which HTB Pro Lab is best for CRTO and Active Directory red teaming?',
      `Zephyr (${hostsFlags('Zephyr')}), Offshore (${hostsFlags('Offshore')}), RastaLabs (${hostsFlags('RastaLabs')}), and Halcyon (${hostsFlags('Halcyon')}, hybrid cloud / Entra ID) focus heavily on Active Directory credential abuse, Kerberos delegation, forest trusts, and C2 tradecraft.`,
    ],
    [
      'Which HTB Pro Labs align with OSEP (PEN-300)?',
      `Cybernetics (${hostsFlags('Cybernetics')}), AptLabs (${hostsFlags('AptLabs')}), and Blizzard (${hostsFlags('Blizzard')}) focus on advanced defense evasion, EDR bypass, adversary emulation, and multi-forest enterprise compromise.`,
    ],
    [
      'Does ZeroBox contain Pro Lab walkthroughs or flags?',
      'No. In strict compliance with the Hack The Box Acceptable Use Policy (§8.2), ZeroBox bundles only public metadata (lab names, host counts, flag counts, difficulty tiers, and exam alignment) so you can track your own progress offline.',
    ],
  ];

  const body = `<h2>What Hack The Box Pro Labs are</h2>
<p>Hack The Box Pro Labs are multi-host enterprise simulation networks designed to train multi-subnet pivoting, Active Directory domain dominance, and defense evasion. Unlike standalone CTF boxes, a Pro Lab places you at an external perimeter or assumed-breach foothold and requires chaining credentials, trusts, and tunnels across ${hostRange} to reach the final flags.</p>
<h2>HTB Pro Labs comparison table</h2>
<p>The table below compares all ${labs.length} Pro Labs included in ZeroBox (${totalHosts} total hosts and ${totalFlags} total flags) using public metadata from <a href="${PROLABS_URL}" rel="nofollow noopener">Hack The Box Pro Labs</a>.</p>
<table><thead><tr><th>Pro Lab</th><th>Difficulty</th><th>Hosts</th><th>Flags</th><th>Exam Alignment</th><th class="hide-sm">Focus</th></tr></thead><tbody>${rows}</tbody></table>
<h2>Recommended order by certification goal</h2>
<ul>
<li><strong>CPTS and OSCP preparation:</strong> Start with <strong>Genesis</strong> to solidify foundational Active Directory enumeration, then move to <strong>Dante</strong> and <strong>Mayhem</strong> to practise multi-subnet pivoting (Ligolo-ng, Chisel, SSH dynamic forwarding) across Linux and Windows targets. Pair these with the <a href="/cpts-like-machines/">CPTS-like machines</a>, <a href="/ippsec-cpts-machines/">Unofficial IppSec CPTS machines</a>, and <a href="/oscp-like-machines/">OSCP-like machines</a> lists.</li>
<li><strong>CRTO and CRTP (Active Directory Red Team):</strong> Work through <strong>Zephyr</strong> for Kerberos delegation and ACL abuse, <strong>Offshore</strong> for multi-forest trust relationships, <strong>RastaLabs</strong> for operational security and C2 tradecraft, and <strong>Halcyon</strong> for hybrid Azure AD / Entra ID environments. Drill individual domain techniques first on the <a href="/active-directory-machines/">Active Directory machines</a> and <a href="/crto-like-machines/">CRTO-like machines</a> pages.</li>
<li><strong>OSEP (PEN-300) and Advanced Red Teaming:</strong> Tackle <strong>Cybernetics</strong>, <strong>AptLabs</strong>, and <strong>Blizzard</strong> once you are comfortable bypassing modern endpoint protections and managing deep pivot chains. Rehearse standalone evasion boxes first on the <a href="/osep-like-machines/">OSEP-like machines</a> hub.</li>
</ul>
<h2>How to track a Pro Lab without losing your place</h2>
<p>Multi-host networks punish disorganised notes because a credential found on host 3 often unlocks a service on host 11 days later. Keep a dedicated workspace note per subnet, log every credential and hash in the <a href="/tracker/">ZeroBox tracker</a>, and follow the <a href="/methodology-guide/">pentest methodology checklist</a> every time you pivot into a new network segment.</p>`;

  return {
    path: PATH,
    crumb: 'HTB Pro Labs guide',
    title: 'HTB Pro Labs Guide: Dante, Zephyr, Offshore Compared',
    description: `Compare all ${labs.length} Hack The Box Pro Labs (Genesis, Dante, Zephyr, Offshore, RastaLabs, Cybernetics) by hosts, flags, difficulty and CPTS, OSCP or CRTO fit.`,
    h1: 'Hack The Box Pro Labs guide: difficulty, hosts, flags and exam fit',
    lead: esc(`Hack The Box Pro Labs simulate multi-host enterprise networks where you chain footholds, pivot across subnets, and attack Active Directory domains. This guide compares the ${labs.length} Pro Labs in ZeroBox by host count, flag count, difficulty, and which certification (CPTS, OSCP, CRTO, CRTP, OSEP) each lab prepares you for.`),
    directAnswer: `<h2>Which HTB Pro Lab should you start with?</h2>
<p>Start with <strong>Genesis</strong> (${hosts('Genesis')}, ${lab('Genesis').difficulty}) if you want a focused introduction to Active Directory, or <strong>Dante</strong> (${hosts('Dante')}, ${lab('Dante').difficulty}) if you are preparing for CPTS or OSCP and want to practise pivoting across mixed Linux and Windows subnets. Move to <strong>Zephyr</strong>, <strong>Offshore</strong>, and <strong>Halcyon</strong> for CRTO-style Active Directory attacks, and save <strong>Cybernetics</strong>, <strong>AptLabs</strong>, and <strong>Blizzard</strong> for OSEP-level evasion.</p>`,
    topCta: { body: 'Track your Pro Lab hosts, flags and pivot notes offline in ZeroBox.', href: '/tracker/', label: 'Open tracker' },
    body,
    cta: {
      title: 'Track every host, flag and pivot offline.',
      body: `ZeroBox includes built-in presets for all ${labs.length} HTB Pro Labs so you can log progress and credentials in your browser.`,
      href: '/tracker/',
      label: 'Open tracker',
    },
    faq,
    related: ['/cpts-like-machines/', '/ippsec-cpts-machines/', '/oscp-like-machines/', '/crto-like-machines/', '/cpts-exam-guide/'],
    sources: [[PROLABS_URL, 'Hack The Box: Official Pro Labs Directory']],
    affil: 'ZeroBox is an independent project and is not affiliated with Hack The Box, OffSec or Zero-Point Security.',
  };
}

module.exports = { build };
