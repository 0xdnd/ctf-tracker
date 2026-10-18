// Lists machines that have a detail page but no owner note, most useful first:
// own writeup, then overlap with the most common technique hubs.
const { getModel } = require('./lib/content-model.cjs');
const TECH = require('./lib/techniques.cjs');

const model = getModel();
const pages = model.machines.filter((m) => m.hasPage);
const todo = pages.filter((m) => !m.myNotes);

const hubs = TECH.GROUPS.map((g) => ({ g, n: model.machines.filter((m) => TECH.matchesMachine(g, m)).length }))
  .sort((a, b) => b.n - a.n)
  .slice(0, 10)
  .map((h) => h.g);
const score = (m) => hubs.filter((g) => TECH.matchesMachine(g, m)).length;

const ranked = todo
  .map((m) => ({ m, own: m.ownWriteup ? 1 : 0, s: score(m) }))
  .sort((a, b) => b.own - a.own || b.s - a.s || a.m.slug.localeCompare(b.m.slug));

console.log(`${todo.length} of ${pages.length} machines with pages have no note. Showing the first 25:`);
for (const { m } of ranked.slice(0, 25)) {
  console.log([m.slug, m.name, m.difficulty, m.platform].join('\t'));
}
console.log(`Total without a note: ${todo.length}`);
