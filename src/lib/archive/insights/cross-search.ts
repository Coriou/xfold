// ---------------------------------------------------------------------------
// Cross-Data Search — search one keyword across ALL archive data types
// ---------------------------------------------------------------------------
//
// A global search that finds a keyword across every data domain simultaneously:
// tweets, deleted tweets, DMs, Grok, interests, ad targeting, likes.
// Shows how one topic is tracked/monetized across every surface.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate, formatDate } from "@/lib/format";

// --- Types ------------------------------------------------------------------

export type SearchResultKind =
  | "tweet"
  | "deleted-tweet"
  | "dm"
  | "grok"
  | "like"
  | "interest"
  | "ad-targeting"
  | "contact";

export interface SearchHit {
  readonly kind: SearchResultKind;
  /** Display text (truncated). */
  readonly text: string;
  /** Formatted date, if available. */
  readonly date: string | null;
  /** Optional detail line (e.g. advertiser name). */
  readonly detail: string | null;
}

export interface CrossSearchResult {
  readonly query: string;
  readonly hits: readonly SearchHit[];
  readonly countsByKind: Readonly<Record<SearchResultKind, number>>;
  readonly totalHits: number;
  /** How many different data domains had hits. */
  readonly domainsHit: number;
  /** A narrative summary: "Found across 5 data types — X tracks this topic everywhere." */
  readonly narrative: string;
}

// --- Helpers ----------------------------------------------------------------

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "\u2026";
}

function matches(text: string, queryLower: string): boolean {
  return text.toLowerCase().includes(queryLower);
}

// --- Main -------------------------------------------------------------------

export function crossSearch(
  archive: ParsedArchive,
  query: string,
): CrossSearchResult | null {
  const q = query.trim();
  if (q.length < 2) return null;

  const qLower = q.toLowerCase();
  const hits: SearchHit[] = [];
  const maxPerKind = 50;

  const counts: Record<SearchResultKind, number> = {
    tweet: 0,
    "deleted-tweet": 0,
    dm: 0,
    grok: 0,
    like: 0,
    interest: 0,
    "ad-targeting": 0,
    contact: 0,
  };

  // Tweets
  for (const t of archive.tweets) {
    if (matches(t.fullText, qLower)) {
      counts["tweet"]++;
      if (counts["tweet"] <= maxPerKind) {
        const d = parseDate(t.createdAt);
        hits.push({
          kind: "tweet",
          text: truncate(t.fullText, 120),
          date: d ? formatDate(t.createdAt) : null,
          detail: t.source ? `via ${t.source}` : null,
        });
      }
    }
  }

  // Deleted tweets
  for (const t of archive.deletedTweets) {
    if (matches(t.fullText, qLower)) {
      counts["deleted-tweet"]++;
      if (counts["deleted-tweet"] <= maxPerKind) {
        const d = parseDate(t.createdAt);
        hits.push({
          kind: "deleted-tweet",
          text: truncate(t.fullText, 120),
          date: d ? formatDate(t.createdAt) : null,
          detail: "Deleted — X still has it",
        });
      }
    }
  }

  // DMs
  for (const convo of archive.directMessages) {
    for (const msg of convo.messages) {
      if (matches(msg.text, qLower)) {
        counts["dm"]++;
        if (counts["dm"] <= maxPerKind) {
          const d = parseDate(msg.createdAt);
          hits.push({
            kind: "dm",
            text: truncate(msg.text, 120),
            date: d ? formatDate(msg.createdAt) : null,
            detail:
              msg.senderId === archive.account?.accountId
                ? "You sent"
                : "You received",
          });
        }
      }
    }
  }

  // Grok conversations
  for (const convo of archive.grokConversations) {
    for (const msg of convo.messages) {
      if (msg.sender === "user" && matches(msg.message, qLower)) {
        counts["grok"]++;
        if (counts["grok"] <= maxPerKind) {
          const d = parseDate(msg.createdAt);
          hits.push({
            kind: "grok",
            text: truncate(msg.message, 120),
            date: d ? formatDate(msg.createdAt) : null,
            detail: "Tied to your real identity",
          });
        }
      }
    }
  }

  // Likes
  for (const like of archive.likes) {
    if (like.fullText && matches(like.fullText, qLower)) {
      counts["like"]++;
      if (counts["like"] <= maxPerKind) {
        hits.push({
          kind: "like",
          text: truncate(like.fullText, 120),
          date: null,
          detail: null,
        });
      }
    }
  }

  // Interests (personalization)
  if (archive.personalization) {
    for (const interest of archive.personalization.interests) {
      if (matches(interest.name, qLower)) {
        counts["interest"]++;
        hits.push({
          kind: "interest",
          text: interest.name,
          date: null,
          detail: interest.isDisabled
            ? "You disabled this — X may still use it"
            : "Active interest",
        });
      }
    }
    for (const pi of archive.personalization.partnerInterests) {
      if (matches(pi, qLower)) {
        counts["interest"]++;
        hits.push({
          kind: "interest",
          text: pi,
          date: null,
          detail: "From third-party data broker",
        });
      }
    }
  }

  // Ad targeting criteria
  const seenTargeting = new Set<string>();
  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      for (const tc of imp.targetingCriteria) {
        if (!tc.targetingValue) continue;
        if (matches(tc.targetingValue, qLower)) {
          const key = `${tc.targetingType}|${tc.targetingValue}|${imp.advertiserName}`;
          if (seenTargeting.has(key)) continue;
          seenTargeting.add(key);

          counts["ad-targeting"]++;
          if (counts["ad-targeting"] <= maxPerKind) {
            hits.push({
              kind: "ad-targeting",
              text: `${tc.targetingType}: ${tc.targetingValue}`,
              date: null,
              detail: `Advertiser: ${imp.advertiserName}`,
            });
          }
        }
      }
    }
  }

  // Contacts
  for (const contact of archive.contacts) {
    const fullText = [contact.firstName, contact.lastName, ...contact.emails]
      .filter(Boolean)
      .join(" ");
    if (matches(fullText, qLower)) {
      counts["contact"]++;
      if (counts["contact"] <= maxPerKind) {
        const name = [contact.firstName, contact.lastName]
          .filter(Boolean)
          .join(" ");
        hits.push({
          kind: "contact",
          text: name || "Unnamed contact",
          date: null,
          detail: `${contact.emails.length} emails, ${contact.phoneNumbers.length} phones`,
        });
      }
    }
  }

  const totalHits = Object.values(counts).reduce((s, c) => s + c, 0);
  if (totalHits === 0) return null;

  const domainsHit = Object.values(counts).filter((c) => c > 0).length;

  const kindLabels: Record<SearchResultKind, string> = {
    tweet: "tweets",
    "deleted-tweet": "deleted tweets",
    dm: "DMs",
    grok: "Grok messages",
    like: "likes",
    interest: "interests",
    "ad-targeting": "ad targeting criteria",
    contact: "contacts",
  };

  const activeKinds = (Object.keys(counts) as SearchResultKind[])
    .filter((k) => counts[k] > 0)
    .map((k) => `${counts[k]} ${kindLabels[k]}`);

  const narrative =
    domainsHit >= 3
      ? `"${q}" appears across ${domainsHit} data types — X tracks this topic everywhere you go. ${activeKinds.join(", ")}.`
      : domainsHit === 2
        ? `"${q}" found in ${activeKinds.join(" and ")} — cross-domain tracking in action.`
        : `"${q}" found in ${activeKinds.join("")}.`;

  return {
    query: q,
    hits,
    countsByKind: counts,
    totalHits,
    domainsHit,
    narrative,
  };
}
