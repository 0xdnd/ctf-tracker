// Extra no-JS paragraphs for the prerendered app routes (scripts/prerender.cjs staticBlock).
// Kept out of src/seo/routeMeta.json because that file ships in the app bundle. {{tokens}} are filled by prerender.cjs.
module.exports = {
  '/tracker/': [
    'The tracker is a board for the machines you work on. Each target moves through five stages, from Backlog to Active recon, Foothold, System pwned and Completed, and keeps its own IP address, notes, credentials and flags. Switch between the Kanban board, a sortable table, a card grid and the attack graph, and press Ctrl+K to search the whole catalog.',
    'Everything is saved in your own browser. There is no account and no server, so nothing leaves your device. Export a JSON backup to move your progress to another browser, or paste a list of machines you already solved to mark them done in one step.',
  ],
  '/exam/': [
    'The exam simulator runs a practice attempt under the real time limit of the certification you pick: {{examTrackDurations}}. Build your set of boxes, start the clock, log flags as you capture them and watch your points against the pass mark.',
    'When the clock stops you get a submission report with your flags, notes and proof screenshots, ready to export. Like the rest of ZeroBox, the simulator works offline and keeps your data in your browser.',
  ],
};
