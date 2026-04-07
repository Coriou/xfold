# xfold

**See what X knows about you.**

xfold is an open-source, client-side web app that lets you upload your X/Twitter data archive and visualizes everything X collected about you — in a way Twitter never wanted you to see.

Your data never leaves your browser. No server, no accounts, no tracking.

## What it reveals

### Privacy audit
- **Inferred interests** — Hundreds of topics X thinks you care about ($BTC, Andrew Tate, Brunch, AI image generation...)
- **Ad targeting profile** — Exactly why each ad was shown to you: lookalike audiences, location, age, device, app activity
- **Login history** — Every IP address and timestamp, geolocated on a map
- **Device fingerprints** — Every device/browser that ever accessed your account
- **Connected apps** — Third-party apps with access to your account, including long-dead services still holding permissions
- **Grok conversations** — Your full chat history with X's AI, which most people don't realize is in the archive
- **Demographics** — Gender, age, languages X inferred about you

### Archive explorer
- **Tweets** — Browse, search, and filter your full tweet history
- **Likes** — Every tweet you ever liked
- **DMs** — Your direct message conversations
- **Followers/Following** — Your social graph
- **Media gallery** — All photos and videos you posted

### Actions
- **Shareable exports** — Generate visual cards of your data profile to share (interest word cloud, ad targeting breakdown, activity heatmap)
- **Selective deletion** — Delete tweets by date range, keyword, engagement, or type (requires companion browser extension)
- **Data portability** — Export to clean formats (CSV, JSON, Markdown)

## Tech stack

- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS 4**
- **TypeScript 5**
- **100% client-side** — all archive parsing happens in the browser via Web Workers

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

1. User downloads their X data archive (Settings > Your Account > Download an archive of your data)
2. User uploads the ZIP file to xfold (drag-and-drop)
3. The archive is parsed entirely in the browser — nothing is uploaded to any server
4. Data is visualized across multiple interactive views

## Privacy

This is a privacy tool, so it practices what it preaches:

- **No server** — static site, all processing is client-side
- **No analytics** — no tracking, no cookies, no telemetry
- **No accounts** — no sign-up, no authentication
- **Open source** — audit the code yourself
- **Data stays local** — the archive ZIP is read in-memory and never transmitted

## License

MIT
