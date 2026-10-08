# Contributing to ZeroBox

Thanks for helping out. Bug reports, ideas and pull requests are welcome.

## Setup

Requires Node.js 18+ and npm 9+.

```bash
git clone https://github.com/0xdnd/ctf-tracker.git
cd ctf-tracker
npm install
npm run dev
```

The desktop build needs the [Tauri prerequisites](https://tauri.app/start/prerequisites/); run it with `npm run tauri:dev`.

## Tests

```bash
npx tsc --noEmit   # type check
npm test           # unit and component tests (Vitest)
npm run test:e2e   # browser E2E crawl (Python + Playwright)
```

Please make sure type check and `npm test` pass before opening a PR.

## Branches and pull requests

- Branch from `main` (e.g. `feat/loot-export`, `fix/kanban-drag`).
- Keep PRs small and focused on one change; describe what and why, and add screenshots for UI changes.
- Add or update tests for behavior changes.

## Commit style

Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`.

```
feat(seo): technique and certification hubs
fix(tracker): label platform link accurately
```

## Content rules

- No writeups, spoilers, flags or hints for active HTB or THM machines.
- No official walkthrough text from HTB, THM or any course provider.
- No proprietary course material or private exam notes.

## License

ZeroBox is released under the ZeroBox Source-Available Non-Commercial & Educational License (ZNSL 1.0); see [LICENSE](LICENSE). The license permits submitting non-commercial bug reports, pull requests and feedback to the upstream repository, and by contributing you agree your work is provided under those same terms.
