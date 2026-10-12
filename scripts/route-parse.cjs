'use strict';
// Reads <Route path="..."> declarations from TSX source. Anything it cannot read statically is reported in `bad`.
function stripBraces(s) {
  let out = '', depth = 0, q = null;
  for (const ch of s) {
    if (q) { if (ch === q) q = null; if (depth === 0) out += ch; continue; }
    if (depth > 0 && (ch === '"' || ch === "'" || ch === '`')) { q = ch; continue; }
    if (ch === '{') { if (depth++ === 0) out += '{'; continue; }
    if (ch === '}') { if (--depth === 0) out += '}'; continue; }
    if (depth === 0) out += ch;
  }
  return out;
}
function parseRoutes(src, file) {
  const routes = [], bad = [], stack = [];
  const re = /<Route(?=[\s/>])|<\/Route\s*>/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[0][1] === '/') { stack.pop(); continue; }
    let i = m.index + m[0].length, depth = 0, q = null;
    for (; i < src.length; i++) {
      const ch = src[i];
      if (q) { if (ch === q) q = null; continue; }
      if (depth > 0 && (ch === '"' || ch === "'" || ch === '`')) { q = ch; continue; }
      if (ch === '{') depth++; else if (ch === '}') depth--;
      else if (ch === '>' && depth === 0) break;
    }
    const tag = src.slice(m.index + m[0].length, i);
    const selfClose = tag.trimEnd().endsWith('/');
    const line = src.slice(0, m.index).split('\n').length;
    const attrs = stripBraces(tag);
    const parent = stack.length ? stack[stack.length - 1] : '';
    let full = parent;
    if (/\bpath\s*=/.test(attrs)) {
      const pm = /\bpath\s*=\s*(?:"([^"]*)"|'([^']*)')/.exec(attrs);
      if (!pm) bad.push(`${file}:${line} <Route> has a path the drift check cannot read (path={...} or similar)`);
      else {
        const p = pm[1] !== undefined ? pm[1] : pm[2];
        full = p.startsWith('/') ? p : p === '*' ? parent + '/*' : (parent.replace(/\/$/, '') + '/' + p);
        if (!p.startsWith('/') && !stack.length && p !== '*') bad.push(`${file}:${line} relative <Route path="${p}"> with no parent route`);
        routes.push(full);
      }
    }
    if (!selfClose) stack.push(full);
  }
  return { routes, bad };
}
module.exports = { parseRoutes };
