// First-visit welcome card, painted from the HTML of the prerendered app pages (web build only).
// The real card is React (src/onboarding/WelcomeCard.tsx via OnboardingLayer's WelcomeFallback) and cannot paint until
// the JS bundle runs. This module emits the same card as static markup that reuses the app's own Tailwind class strings
// (already in the render-blocking stylesheet, so no extra request and no second copy of the styles). A tiny inline head
// script decides whether to show it; React removes it the moment its own card is in the DOM.
// src/test/seo/welcomeStatic.test.ts pins the markup to the React components and the gate to useFirstRunTour.

const FIRST_RUN_KEY = 'zerobox_onboarding_completed';
const ONBOARDING_KEY = 'zerobox_onboarding_v1';
const MARKER = 'data-zb-welcome';

// Mirrors useFirstRunTour (key + excluded landing paths), App.tsx (?popout=true), the persisted tourDone flag, the
// ?target= / ?machine= share links (TrackerView opens a machine modal for them, which holds the tour back) and the
// auto UI zoom App.tsx applies, so the card is the same size before and after React mounts. Read-only: the key itself is
// still written by useFirstRunTour. A click on a static button is recorded for React to replay once it has mounted.
const GATE_SCRIPT =
  `(function(){try{var d=document.documentElement,l=location;` +
  `if(/^\\/(oscp-points-calculator|exam)\\/?$/.test(l.pathname)||/^\\/(field-manual|notes)\\/?$/i.test(l.pathname)||/[?&]popout=true(&|$)/.test(l.search)||/[?&](target|machine)=/.test(l.search))return;` +
  `if(localStorage.getItem('${FIRST_RUN_KEY}'))return;` +
  `try{var o=JSON.parse(localStorage.getItem('${ONBOARDING_KEY}')||'null');if(o&&o.tourDone===true)return}catch(e){}` +
  `d.classList.add('zb-first');` +
  `document.addEventListener('click',function(e){var t=e.target;t=t&&t.closest&&t.closest('[data-zb-act]');if(!t)return;` +
  `window.__zbWelcomeIntent=t.getAttribute('data-zb-act');if(window.__zbWelcomeIntent==='skip')d.classList.remove('zb-first')},true)` +
  `}catch(e){}})();`;

const GATE_STYLE = '.zb-welcome{display:none}html.zb-first .zb-welcome{display:block}html.zb-first #boot-splash{display:none}';

// Class strings copied from guideMotion.tsx, WelcomeCard.tsx, OnboardingLayer.tsx (WelcomeFallback) and CyberLogo.tsx.
const C = {
  overlay: 'zb-welcome fixed inset-0 z-critical',
  center: 'absolute inset-0 flex items-center justify-center p-3 max-md:items-start',
  card:
    'max-h-full w-[28rem] max-w-full overflow-y-auto p-5 max-md:mt-[calc(6vh-0.75rem)] max-md:max-h-[88vh] md:p-7 ' +
    'rounded-2xl border border-subtle bg-surface-card font-sans',
  logo:
    'relative flex-shrink-0 flex items-center justify-center transition-[transform,background-color,border-color,color] duration-300 ' +
    'group-hover:scale-105 w-[52px] h-[52px] sm:w-14 sm:h-14',
  logoImg: 'w-full h-full object-contain select-none',
  title: 'mt-4 text-[17px] font-semibold leading-snug tracking-tight text-primary [text-wrap:balance]',
  body: 'mt-1.5 text-[15px] leading-[1.55] text-secondary [text-wrap:pretty] md:text-sm md:leading-[1.6]',
  list: 'mt-4 divide-y divide-subtle border-y border-subtle',
  row: 'flex items-start gap-3 py-3',
  icon: 'mt-0.5 h-[18px] w-[18px] flex-shrink-0 text-muted',
  rowTitle: 'block text-sm font-medium text-primary',
  rowBody: 'mt-0.5 block text-[13px] leading-[1.45] text-secondary',
  importBtn:
    'mt-3 w-full rounded-lg border border-subtle px-3 py-2 text-[13px] font-medium text-secondary transition-colors hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:min-h-11',
  actions: 'mt-4 flex items-center justify-between gap-2',
  actionsEnd: 'flex items-center gap-2',
  btnBase:
    'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card [@media(pointer:coarse)]:min-h-11',
};
const BTN_PRIMARY = `${C.btnBase} bg-accent px-5 py-2 font-semibold text-on-accent hover:bg-accent-hover`;
const BTN_GHOST = `-ml-3 ${C.btnBase} px-3 py-2 text-muted hover:text-primary`;

const DIM = 'rgb(0 0 0 / 0.72)';
const CARD_SHADOW = '0 20px 40px -12px rgb(0 0 0 / 0.45), 0 4px 12px -4px rgb(0 0 0 / 0.25)';

// lucide-react 1.x icon nodes for Crosshair, NotebookText and Timer (src/onboarding/icons.ts: target, notes, exam).
const ICONS = {
  target:
    '<circle cx="12" cy="12" r="10"></circle><line x1="22" x2="18" y1="12" y2="12"></line><line x1="6" x2="2" y1="12" y2="12"></line><line x1="12" x2="12" y1="6" y2="2"></line><line x1="12" x2="12" y1="22" y2="18"></line>',
  notes:
    '<path d="M2 6h4"></path><path d="M2 10h4"></path><path d="M2 14h4"></path><path d="M2 18h4"></path><rect width="16" height="20" x="4" y="2" rx="2"></rect><path d="M9.5 8h5"></path><path d="M9.5 12H16"></path><path d="M9.5 16H14"></path>',
  exam: '<line x1="10" x2="14" y1="2" y2="2"></line><line x1="12" x2="15" y1="14" y2="11"></line><circle cx="12" cy="14" r="8"></circle>',
};
const ICON_NAME = { target: 'crosshair', notes: 'notebook-text', exam: 'timer' };

// Text of WELCOME_STEP and WELCOME_ROWS in src/onboarding/guideMeta.ts (the test compares them).
const TITLE = 'Welcome to ZeroBox';
const BODY = 'A free prep tracker for CTFs and hacking labs. It runs in your browser and keeps everything on this device.';
const ROWS = [
  ['target', 'Track machines', 'Keep a list of the practice labs you try and how far you got.'],
  ['notes', 'Take notes', 'Write notes and writeups, and keep your favorite commands handy.'],
  ['exam', 'Practice exams', 'Run timed practice sessions for certification exams.'],
];

const row = ([icon, title, body]) =>
  `<li class="${C.row}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${ICON_NAME[icon]} ${C.icon}" aria-hidden="true">${ICONS[icon]}</svg>` +
  `<span class="min-w-0"><span class="${C.rowTitle}">${title}</span><span class="${C.rowBody}">${body}</span></span></li>`;

// aria-hidden: purely visual until React renders the real dialog. The buttons stay out of the tab order for the same reason.
const CARD_HTML =
  `<div ${MARKER} class="${C.overlay}" aria-hidden="true">` +
  `<div class="absolute inset-0" style="background:${DIM}"></div>` +
  `<div class="${C.center}"><div style="box-shadow:${CARD_SHADOW}" class="${C.card}"><div>` +
  `<div class="${C.logo}"><img src="/logo-zerobox.webp" srcset="/logo-zerobox-64.webp 64w, /logo-zerobox-128.webp 128w, /logo-zerobox-224.webp 224w" sizes="(min-width: 640px) 56px, 52px" width="56" height="56" alt="" decoding="async" class="${C.logoImg}"></div>` +
  `<div class="${C.title}">${TITLE}</div><p class="${C.body}">${BODY}</p>` +
  `<ul class="${C.list}">${ROWS.map(row).join('')}</ul>` +
  `<button type="button" tabindex="-1" data-zb-act="import" class="${C.importBtn}">Import your solved boxes</button>` +
  `<div class="${C.actions}"><button type="button" tabindex="-1" data-zb-act="skip" class="${BTN_GHOST}">Skip</button>` +
  `<div class="${C.actionsEnd}"><button type="button" tabindex="-1" data-zb-act="start" class="${BTN_PRIMARY}">Start tour</button></div></div>` +
  `</div></div></div></div>`;

// Adds the gate (before </head>) and the card (just before <div id="root">, never inside it: React replaces #root's children).
// Idempotent, and a no-op for a page without a #root.
function injectWelcome(html) {
  if (html.includes(MARKER) || !html.includes('<div id="root">')) return html;
  return html
    .replace('</head>', () => `<style>${GATE_STYLE}</style>\n<script>${GATE_SCRIPT}</script>\n</head>`)
    .replace('<div id="root">', () => `${CARD_HTML}<div id="root">`);
}

module.exports = { injectWelcome, GATE_SCRIPT, GATE_STYLE, CARD_HTML, FIRST_RUN_KEY, ONBOARDING_KEY, MARKER, C, BTN_PRIMARY, BTN_GHOST, DIM, CARD_SHADOW };
