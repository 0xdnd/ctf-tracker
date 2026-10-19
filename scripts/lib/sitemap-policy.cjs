// Thin app-screen routes that keep their pages (and stay crawlable) but are left out of sitemap.xml.
// /tracker/ stays listed; /cheatsheet-library/ is the content hub, /cheatsheets/ is only the app shell.
const SITEMAP_EXCLUDE = ['/analytics/', '/vault/', '/writeup/', '/notes/', '/exam/', '/cheatsheets/'];
module.exports = { SITEMAP_EXCLUDE };
