# xfold

**See what X knows about you.**

[xfold.app](https://xfold.app) is a privacy audit tool for your X (Twitter) data archive. Drop in the ZIP, see everything they collected — interests, ad targeting, login history, deleted tweets, Grok conversations, the lot — visualised in a dashboard X never wanted you to see.

The whole thing runs in your browser. No upload, no server, no account, no analytics. Open the network tab while you use it.

## Try it without an archive

[xfold.app](https://xfold.app) ships with a "Try with sample data" button that loads a fully synthetic archive. You can explore every section before deciding whether to download your own.

## What it surfaces

- **Privacy score** — a single number from across the whole archive
- **Top findings** — the dozen most concerning facts about your data, ranked
- **Interests & ad profile** — the thousand-word version of "what X thinks of you"
- **Ad price tag** — estimated dollars X earned from showing you ads
- **Wrapped** — fun stats about your tweeting history
- **Login history & device fingerprints** — every IP, every browser, geolocated
- **Connected apps** — third-party services with access to your account, including long-dead ones
- **Grok conversations** — your full chat history with X's AI, indexed
- **Deleted tweets** — yes, X kept them
- **Uploaded contacts** — the address book entries X stored from your phone
- **Off-platform tracking** — events advertisers reported back to X about your other apps
- **Shadow profile** — the things X inferred about you that you never told it

Plus 15+ more sections covering social graph, DMs, demographics, ghost data categories X hides from its own viewer, and a gallery of share-worthy export cards.

## How to get your archive

1. Go to [x.com/settings/download_your_data](https://x.com/settings/download_your_data)
2. Verify your password
3. Wait 24-48 hours for X to email you a download link
4. Download the ZIP, drop it into xfold

The archive can be 10 MB or 10 GB. xfold parses it incrementally in a Web Worker so the UI stays responsive.

## Privacy

This is a privacy tool that practices what it preaches:

- **Static site** — no API routes, no backend, no edge functions
- **Strict CSP** — `connect-src 'self'` blocks all outbound network calls at the browser level
- **No analytics** — no GA, no Sentry, no telemetry of any kind
- **No accounts** — no sign-up, no auth, no cookies
- **No third-party requests** — fonts and assets are self-hosted at build time
- **Open source** — every line is in this repo, audit it yourself

The archive is parsed in-memory in a Web Worker. Optionally, your last-loaded archive is cached in IndexedDB on your own device so reloads are instant — that storage stays on your machine and never goes anywhere.

## Tech stack

- Next.js 16 (App Router) — statically prerendered, no server runtime
- React 19
- Tailwind CSS 4
- TypeScript 5 (strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`)
- [fflate](https://github.com/101arrowz/fflate) for ZIP decompression in the worker
- [html2canvas](https://github.com/niklasvh/html2canvas) for share-card export (lazy-loaded)

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful scripts:

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build (statically prerenders all routes) |
| `npm run typecheck` | `tsc --noEmit` against the strict tsconfig |
| `npm run lint` | ESLint |
| `npm test` | Vitest once |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Vitest with v8 coverage |

## Architecture

- `src/app/` — Next.js App Router routes (one page, plus metadata files)
- `src/components/landing/` — upload zone and landing page
- `src/components/dashboard/` — sidebar, content area, error boundary
- `src/components/sections/` — one component per dashboard section (~30)
- `src/components/share-cards/` — exportable 1080×1080 share cards
- `src/lib/archive/` — archive parsing, types, and storage
  - `worker.ts` — Web Worker that streams the ZIP and decompresses media
  - `transform.ts` — turns raw archive JSON into the typed `ParsedArchive`
  - `idb-cache.ts` — gzip + IndexedDB persistence for "instant reload last archive"
  - `demo-archive.ts` — bundled synthetic archive for the demo button
  - `insights/` — pure functions that compute every dashboard insight

## Contributing

Issues and pull requests welcome. Two ground rules:

1. **Never commit real archive data**, even sanitized. Tests use the synthetic fixtures in `__fixtures/`.
2. **Stay client-side**. No API routes, no server-side data processing, no third-party scripts. The privacy promise is the product.

The TypeScript posture is strict (see `CLAUDE.md` and `tsconfig.json`) — `any` is banned, optional properties use `exactOptionalPropertyTypes`, and discriminated unions are preferred over class hierarchies. The insights engine targets 100% statement coverage.

## License

MIT
