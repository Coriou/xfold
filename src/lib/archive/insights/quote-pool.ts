// ---------------------------------------------------------------------------
// Quote pool — extract specific, quotable, viscerally-shareable strings
// ---------------------------------------------------------------------------
//
// Most share cards lose impact because they pick big numbers ("247 ads") over
// specific quotes ("you're on a list called 'negative engagers - global'").
// This module extracts a ranked pool of *quoted strings* from across an
// archive, each with enough metadata for callers to render a one-line receipt.
//
// Each quote has:
//   - text:        the literal string to display, verbatim
//   - source:      a short tag indicating where it came from
//   - date:        ISO timestamp when applicable, null otherwise
//   - severity:    'low' | 'medium' | 'high' (drives card color)
//   - specificity: 0-100 (uniqueness score — picks the most damning quote)
//   - contextLine: one-sentence framing for the quote
//
// Each candidate generator is a small pure function. Adding a new quote source
// is one new function + one entry in `buildQuotePool`.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate, truncate } from "@/lib/format";

export type QuoteSource =
  | "connected-app"
  | "grok-prompt"
  | "stored-dm"
  | "audience-list"
  | "creation-moment"
  | "oldest-active-ip";

export type QuoteSeverity = "low" | "medium" | "high";

export interface Quote {
  readonly text: string;
  readonly source: QuoteSource;
  readonly date: string | null;
  readonly severity: QuoteSeverity;
  /** 0–100. Higher = more specific / damning / shareable. */
  readonly specificity: number;
  readonly contextLine: string;
}

// ---------------------------------------------------------------------------
// Candidate generators
// ---------------------------------------------------------------------------

/**
 * The oldest connected app with write access. The combination of "still has
 * access" + "approved over a decade ago" is a stronger receipt than any
 * single number.
 */
function oldestWriteAccessApp(archive: ParsedArchive): Quote | null {
  const writeApps = archive.connectedApps.filter((a) =>
    a.permissions.some((p) => p.toLowerCase().includes("write")),
  );
  if (writeApps.length === 0) return null;

  let oldest = writeApps[0];
  if (!oldest) return null;
  let oldestTs = parseDate(oldest.approvedAt)?.getTime() ?? Infinity;
  for (const app of writeApps) {
    const ts = parseDate(app.approvedAt)?.getTime() ?? Infinity;
    if (ts < oldestTs) {
      oldest = app;
      oldestTs = ts;
    }
  }

  const yearsAgo =
    oldestTs === Infinity
      ? 0
      : Math.floor((Date.now() - oldestTs) / (1000 * 60 * 60 * 24 * 365.25));

  // Specificity scales with age — a 13-year-old token is way more shareable
  // than a 1-year-old token.
  const specificity = Math.min(100, 40 + yearsAgo * 5);
  const severity: QuoteSeverity =
    yearsAgo >= 8 ? "high" : yearsAgo >= 4 ? "medium" : "low";

  return {
    text: oldest.name,
    source: "connected-app",
    date: oldest.approvedAt,
    severity,
    specificity,
    contextLine: `Has had write access to your account for ${yearsAgo} ${yearsAgo === 1 ? "year" : "years"}.`,
  };
}

/**
 * The first thing the user ever asked Grok. Self-evident shareability —
 * AI prompts are personal, the retention of them is shocking, and they're
 * almost always either funny or revealing.
 */
function firstGrokPrompt(archive: ParsedArchive): Quote | null {
  let earliest: { text: string; createdAt: string } | null = null;
  let earliestTs = Infinity;

  for (const convo of archive.grokConversations) {
    for (const msg of convo.messages) {
      if (msg.sender !== "user") continue;
      if (!msg.message.trim()) continue;
      const ts = parseDate(msg.createdAt)?.getTime() ?? Infinity;
      if (ts < earliestTs) {
        earliestTs = ts;
        earliest = { text: msg.message, createdAt: msg.createdAt };
      }
    }
  }

  if (!earliest) return null;

  return {
    text: truncate(earliest.text, 140),
    source: "grok-prompt",
    date: earliest.createdAt,
    severity: "high",
    // Grok prompts are inherently very specific.
    specificity: 90,
    contextLine: "The first thing you ever asked Grok. X retained it forever.",
  };
}

/**
 * The oldest stored DM. The shock is the *retention*, not the content. We
 * truncate to a short preview so this works as a quote without exposing
 * a wall of text.
 */
function oldestStoredDm(archive: ParsedArchive): Quote | null {
  let earliest: { text: string; createdAt: string } | null = null;
  let earliestTs = Infinity;

  for (const convo of archive.directMessages) {
    for (const msg of convo.messages) {
      if (!msg.text.trim()) continue;
      const ts = parseDate(msg.createdAt)?.getTime() ?? Infinity;
      if (ts < earliestTs) {
        earliestTs = ts;
        earliest = { text: msg.text, createdAt: msg.createdAt };
      }
    }
  }

  if (!earliest) return null;

  const yearsAgo =
    earliestTs === Infinity
      ? 0
      : Math.floor(
          (Date.now() - earliestTs) / (1000 * 60 * 60 * 24 * 365.25),
        );

  return {
    text: truncate(earliest.text, 120),
    source: "stored-dm",
    date: earliest.createdAt,
    severity: yearsAgo >= 5 ? "high" : "medium",
    specificity: Math.min(100, 50 + yearsAgo * 4),
    contextLine: `X has been storing this DM for ${yearsAgo} ${yearsAgo === 1 ? "year" : "years"}.`,
  };
}

/**
 * Audience-list targeting names. These are *literal strings* that real
 * advertisers attached to lists with the user on them. Often unintentionally
 * revealing — see "Pro Targeting - Exclusion Audience: negative engagers".
 *
 * Sentiment-keyword ranking biases toward the most embarrassing list.
 */
const SPICY_LIST_KEYWORDS = [
  "exclusion",
  "negative",
  "lapsed",
  "dormant",
  "low-value",
  "inactive",
  "high-value",
  "lookalike",
  "high-spender",
  "retarget",
  "winback",
  "churn",
] as const;

function worstAudienceListName(archive: ParsedArchive): Quote | null {
  const names = new Set<string>();
  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      for (const tc of imp.targetingCriteria) {
        if (tc.targetingType === "List" && tc.targetingValue) {
          names.add(tc.targetingValue);
        }
      }
    }
  }
  for (const batch of archive.adEngagements) {
    for (const eng of batch.engagements) {
      for (const tc of eng.targetingCriteria) {
        if (tc.targetingType === "List" && tc.targetingValue) {
          names.add(tc.targetingValue);
        }
      }
    }
  }

  if (names.size === 0) return null;

  let bestName: string | null = null;
  let bestScore = -1;
  for (const name of names) {
    const lower = name.toLowerCase();
    let score = 0;
    for (const kw of SPICY_LIST_KEYWORDS) {
      if (lower.includes(kw)) score += 10;
    }
    // Longer, more descriptive list names are usually internal-feeling.
    score += Math.min(20, name.length / 4);
    if (score > bestScore) {
      bestScore = score;
      bestName = name;
    }
  }

  if (!bestName) return null;

  return {
    text: truncate(bestName, 140),
    source: "audience-list",
    date: null,
    severity: bestScore >= 25 ? "high" : "medium",
    specificity: Math.min(100, 60 + bestScore),
    contextLine: "An advertiser uploaded a list with this exact name. You're on it.",
  };
}

/**
 * The account creation moment, as a frozen line: date, IP, client. The
 * client comes from the first device token if available, falling back to
 * the account.createdVia field.
 */
function creationMoment(archive: ParsedArchive): Quote | null {
  const account = archive.account;
  if (!account?.createdAt) return null;

  const ts = parseDate(account.createdAt)?.getTime();
  if (!ts) return null;
  const yearsAgo = Math.floor(
    (Date.now() - ts) / (1000 * 60 * 60 * 24 * 365.25),
  );

  const ip = account.creationIp;
  const via = account.createdVia;
  const parts: string[] = [];
  if (ip) parts.push(`from ${ip}`);
  if (via) parts.push(`via ${via}`);

  const text = parts.length > 0 ? parts.join(" ") : "from an unknown source";

  return {
    text,
    source: "creation-moment",
    date: account.createdAt,
    severity: yearsAgo >= 10 ? "high" : "medium",
    specificity: Math.min(100, 50 + yearsAgo * 3),
    contextLine: `You created your account ${yearsAgo} years ago. X still has the receipt.`,
  };
}

/**
 * Returns the IP that has been seen the longest in the user's login audit.
 * The point: "this network has been logging you in continuously since X."
 */
function oldestActiveIp(archive: ParsedArchive): Quote | null {
  if (archive.ipAudit.length === 0) return null;

  // Group by IP, find the earliest seen one that ALSO appears recently.
  // "Recently" = within the last year of the audit window.
  const earliestByIp = new Map<string, number>();
  let auditMax = -Infinity;
  for (const e of archive.ipAudit) {
    const ts = parseDate(e.createdAt)?.getTime();
    if (!ts) continue;
    if (ts > auditMax) auditMax = ts;
    const prev = earliestByIp.get(e.loginIp);
    if (prev === undefined || ts < prev) {
      earliestByIp.set(e.loginIp, ts);
    }
  }
  if (earliestByIp.size === 0 || auditMax === -Infinity) return null;

  const recentCutoff = auditMax - 365 * 24 * 60 * 60 * 1000;
  const seenRecently = new Set<string>();
  for (const e of archive.ipAudit) {
    const ts = parseDate(e.createdAt)?.getTime();
    if (ts !== undefined && ts >= recentCutoff) {
      seenRecently.add(e.loginIp);
    }
  }

  let bestIp: string | null = null;
  let bestTs = Infinity;
  for (const [ip, ts] of earliestByIp) {
    if (!seenRecently.has(ip)) continue;
    if (ts < bestTs) {
      bestTs = ts;
      bestIp = ip;
    }
  }

  if (!bestIp) return null;

  const yearsSpan = Math.floor(
    (auditMax - bestTs) / (1000 * 60 * 60 * 24 * 365.25),
  );
  if (yearsSpan < 1) return null;

  return {
    text: bestIp,
    source: "oldest-active-ip",
    date: new Date(bestTs).toISOString(),
    severity: yearsSpan >= 5 ? "high" : "medium",
    specificity: Math.min(100, 30 + yearsSpan * 7),
    contextLine: `You've logged in from this network for ${yearsSpan} ${yearsSpan === 1 ? "year" : "years"} straight.`,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const GENERATORS = [
  oldestWriteAccessApp,
  firstGrokPrompt,
  oldestStoredDm,
  worstAudienceListName,
  creationMoment,
  oldestActiveIp,
] as const;

/**
 * Returns the full quote pool, sorted by specificity descending.
 * Empty when an archive has nothing quotable.
 */
export function buildQuotePool(archive: ParsedArchive): Quote[] {
  const quotes: Quote[] = [];
  for (const gen of GENERATORS) {
    const q = gen(archive);
    if (q) quotes.push(q);
  }
  quotes.sort((a, b) => b.specificity - a.specificity);
  return quotes;
}

/**
 * Convenience: the single best quote, or null if none available. Used by
 * cards that only need to render one quoted line.
 */
export function pickBestQuote(archive: ParsedArchive): Quote | null {
  const pool = buildQuotePool(archive);
  return pool[0] ?? null;
}
