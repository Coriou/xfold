# Contributing to xfold

Issues and pull requests are welcome. xfold is a small project with a few non-negotiable ground rules. Please skim this file before sending a patch.

## The non-negotiables

### 1. Never commit real archive data

xfold is a privacy tool. Real X archive data — even sanitised — must never appear in source, tests, fixtures, or documentation. This is a hard rule, not a guideline.

- Tests use synthetic fixtures from `src/lib/archive/__fixtures/synthetic-archive.ts`. Extend the helpers there when you need new shapes.
- The bundled demo archive (`src/lib/archive/demo-archive.ts`) is hand-built from invented usernames, IPs, dates, and content. If you need to demo a new section, add to it; never derive from a real archive.
- If you need to understand the archive format, read the "X archive format" section in [CLAUDE.md](CLAUDE.md). Do not parse a real archive to find out.

### 2. Stay client-side

The privacy promise is the product. Pull requests that introduce any of the following will be closed:

- API routes, server actions, or server components that touch user data
- Analytics, telemetry, error reporting, third-party scripts
- Outbound network calls (the production CSP enforces `connect-src 'self'` — your code physically cannot reach anything else)
- Fonts, images, or assets loaded from a CDN
- Cookies, sign-up flows, account systems

If you're not sure whether something counts as "client-side enough," open an issue first.

### 3. Don't run `npm run build` while `npm run dev` is active

They share `.next/`. Running them concurrently corrupts the build directory and produces confusing errors. Tear down the dev server before kicking off a production build.

## Required checks before sending a PR

All three must pass cleanly:

```bash
npm run typecheck
npm run lint
npm test
```

xfold uses a strict TypeScript posture (see [CLAUDE.md](CLAUDE.md) for the full rule list). Highlights: no `any`, no non-null assertions, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, exhaustive switches with `assertNever`, `import type` for type-only imports, and discriminated unions over class hierarchies.

The insights engine (`src/lib/archive/insights/`) targets 100% statement coverage. Pure functions get unit tests; React components only get smoke tests when actually needed.

## Pull request guidelines

- Keep PRs focused. One logical change per PR is easier to review than a sprawl.
- Update or add tests for behavior changes.
- Reference the issue number in your PR description if there is one.
- Don't push to `main` directly; open a PR.
- The maintainer reserves the right to close PRs that conflict with the privacy promise even if they're technically correct.

## Reporting bugs

Open an issue at [github.com/Coriou/xfold/issues](https://github.com/Coriou/xfold/issues). Include:

- Browser + version
- A description of what you expected vs. what happened
- A screenshot or short screen recording when relevant
- Whether the issue reproduces with the bundled demo archive (the "Try with sample data" button on the landing page) — if it does, that's a perfect reproduction case

Please **do not** attach a real archive ZIP to a bug report. If you need to share an archive-specific bug, redact aggressively or recreate it with synthetic data.
