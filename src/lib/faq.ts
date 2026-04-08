// ---------------------------------------------------------------------------
// FAQ — single source of truth for the landing page FAQ section AND the
// FAQPage JSON-LD blob in the root layout. Keeping both in sync is critical
// for SEO: schema.org FAQPage entries are surfaced as rich results, and
// Google flags the page if the visible Q&A doesn't match the structured data.
// ---------------------------------------------------------------------------

export interface FaqEntry {
  readonly q: string;
  readonly a: string;
}

export const FAQ: readonly FaqEntry[] = [
  {
    q: "Is xfold really 100% client-side?",
    a: "Yes. There are no API routes, no server actions, and no edge functions. Every byte of your archive is parsed and visualised inside your browser tab. The site's Content-Security-Policy enforces connect-src 'self', so the page can't make outbound network calls even if it wanted to. Open the network tab and watch — nothing leaves your machine.",
  },
  {
    q: "How do I download my X archive?",
    a: "Go to x.com/settings/download_your_data, verify your password, and request the archive. X will email you a download link within 24-48 hours. Download the ZIP and drop it into xfold — no extraction needed.",
  },
  {
    q: "What can xfold see vs. what can X see?",
    a: "xfold can only see what's already in the archive ZIP X gave you. X has the full picture (every search query, every hover, the complete ad auction history); the archive is a subset. xfold's job is to make that subset legible — to surface the things X buries six menus deep or formats so badly nobody reads them.",
  },
  {
    q: "Is xfold open source?",
    a: "Yes. The full source is on GitHub at github.com/Coriou/xfold under the MIT license. Audit it, fork it, file issues, send pull requests — every line is in the public repo.",
  },
  {
    q: "What does xfold cost?",
    a: "Nothing. xfold is free, ad-free, and account-free. There is no paid tier, no upsell, and no plan to add one.",
  },
  {
    q: "What if my archive is huge?",
    a: "xfold parses incrementally inside a Web Worker, so the UI stays responsive even on multi-GB archives. The hard upper bound on input size is 8 GB. Media files past a 256 MB hot-cache budget are decompressed lazily on demand instead of all at once, which keeps memory in check on mobile.",
  },
];
