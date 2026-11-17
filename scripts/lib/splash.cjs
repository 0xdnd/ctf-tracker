// Boot splash markers in index.html: <div id="root"><!--splash--><div id="boot-splash">...</div><!--/splash--></div>
// The splash holds nested divs, so match on the markers, never on the first </div>.
const SPLASH_RE = /<!--splash-->[\s\S]*?<!--\/splash-->/;
const ROOT_RE = /<div id="root">\s*<!--splash-->[\s\S]*?<!--\/splash-->\s*<\/div>/;
module.exports = { SPLASH_RE, ROOT_RE };
