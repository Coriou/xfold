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

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — run ESLint
