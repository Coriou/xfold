@AGENTS.md

# xfold

Client-side X/Twitter data archive explorer and privacy audit tool.

## Architecture

- **100% client-side** — no API routes, no server-side data processing. The archive ZIP is parsed in the browser.
- **Next.js 16 App Router** with `src/` directory structure.
- **Deployed on Vercel** as a standard Next.js app (not static export). Pages are statically prerendered at build time since everything is client-side.

## Key principles

- Never transmit user data anywhere. All parsing and visualization happens in the browser.
- No analytics, no cookies, no telemetry, no third-party scripts.
- Use Web Workers for heavy archive parsing to keep the UI responsive.
- Prioritize shareability — visual exports should look good when screenshotted/shared on social media.

## X archive format

The archive is a ZIP containing a `data/` folder with `.js` files. Each file assigns to `window.YTD.<name>.part0`.
Key files: `tweets.js`, `like.js`, `personalization.js`, `ad-engagements.js`, `ad-impressions.js`,
`ip-audit.js`, `device-token.js`, `connected-application.js`, `direct-messages.js`, `grok-chat-item.js`,
`follower.js`, `following.js`, `block.js`, `account.js`, `profile.js`, `ageinfo.js`, `phone-number.js`.

## Data safety

- **NEVER** reference, embed, or hardcode real archive data in source code, tests, fixtures, or examples.
- Use synthetic/mock data for all tests and development. Invent fake usernames, fake tweets, fake IPs.
- The user's demo archive at `~/Downloads/twitter-2026-04-02-*` is for manual browser testing only — never read it from code or copy files from it into the repo.
- If you need to understand the archive format, refer to the "X archive format" section above — do not parse a real archive to find out.

## TypeScript conventions

xfold uses a very-strict TypeScript posture. The exact compiler flags and ESLint rules are checked in (`tsconfig.json`, `eslint.config.mjs`); this section captures the conventions that don't fit in a config file.

### Compiler flags beyond `strict`

Enabled in `tsconfig.json`:

- `noUncheckedIndexedAccess` — `arr[0]` is `T | undefined`
- `exactOptionalPropertyTypes` — `{x?: T}` is not interchangeable with `{x: T | undefined}`
- `verbatimModuleSyntax` — forces `import type` for type-only imports
- `noImplicitOverride`
- `noFallthroughCasesInSwitch`
- `noPropertyAccessFromIndexSignature`
- `noUnusedLocals`, `noUnusedParameters`
- `allowUnreachableCode: false`, `allowUnusedLabels: false`

### ESLint rules (scoped to `src/**`)

Enabled in `eslint.config.mjs` via `@typescript-eslint`:

- `consistent-type-imports` (inline-type-imports style)
- `no-explicit-any`, `no-non-null-assertion`
- `no-floating-promises`, `no-misused-promises`
- `consistent-type-definitions` → `interface`
- `array-type` → `T[]`
- `prefer-as-const`
- `switch-exhaustiveness-check`
- `no-unnecessary-condition`, `no-unnecessary-type-assertion`
- TS `enum` declarations are banned via `no-restricted-syntax` — use `as const` objects or string-literal unions instead

### Code conventions

1. **`interface` for object shapes; `type` for unions, intersections, and aliases.**
2. **`readonly` on data fields by default.** Mutate only at construction.
3. **Discriminated unions over class hierarchies.** Type-narrowing works automatically and `switch-exhaustiveness-check` catches new variants.
4. **No `enum`** — use `as const` objects or string-literal unions.
5. **`import type`** for all type-only imports (enforced by `verbatimModuleSyntax`).
6. **No `any`** — use `unknown` and narrow with type guards. The only file-level exception is `src/lib/archive/transform.ts`, which has a documented pragma because it parses untrusted JSON.
7. **No `as` assertions** unless documented and no type guard alternative exists.
8. **Exhaustive `switch`** with the `assertNever(x: never): never` helper for the default case — compile-time safety against new union members.
9. **`satisfies`** over type assertions for literal data (validates without widening).
10. **Branded types** for IDs that could be confused (e.g. `TweetId`, `UserId`, `ChatId`).
11. **No barrel `index.ts` re-exports** unless they materially help consumers — keep imports explicit.
12. **No unused exports** — if it's not imported anywhere, delete it.

### Optional properties

For React component props that might receive `undefined` from a parent's conditional expression, use `T | undefined` explicitly:

```ts
interface Props {
  count?: number | undefined;  // accepts both omission and explicit undefined
}
```

For internal data types where omission and undefined should be distinct, use plain optional (`count?: number`) and construct with conditional spread.

### Tests

- Vitest, colocated as `*.test.ts` next to source.
- Pure functions get unit tests; React components only get smoke tests when actually needed.
- Synthetic fixtures live in `__fixtures/` directories and are never imported from production code.
- The insights engine (`src/lib/insights/`) targets 100% statement coverage; everything else is opportunistic.
- Mock data is synthetic only — see "Data safety" above.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — run ESLint
- `npm run typecheck` — run `tsc --noEmit` against the strict tsconfig
- `npm test` — run Vitest once
- `npm run test:watch` — Vitest watch mode
- `npm run test:coverage` — Vitest with v8 coverage
