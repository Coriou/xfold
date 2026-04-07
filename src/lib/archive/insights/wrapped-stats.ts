// ---------------------------------------------------------------------------
// Wrapped stats — assembles everything the Wrapped section needs
// ---------------------------------------------------------------------------
//
// This is the single derivation function consumed by both:
//   - the `wrapped` share card (compute.ts)
//   - the dashboard "Your X, Wrapped" section
//
// All sub-derivations live in their own files; this module only orchestrates.
// ---------------------------------------------------------------------------

import type { ParsedArchive, ScreenNameChange } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";
import type { Contact } from "@/lib/archive/conversation-intelligence";
import {
  findFirstAndLastTweet,
  type FirstAndLast,
} from "@/lib/archive/insights/first-and-last-tweet";
import {
  topHashtags,
  type HashtagCount,
} from "@/lib/archive/insights/top-hashtags";
import { topContacts } from "@/lib/archive/insights/top-contacts";
import {
  buildHourDistribution,
  topTweetHour,
  type HourDistribution,
  type TopHour,
} from "@/lib/archive/insights/tweet-time-distribution";

export type Persona = "Conversationalist" | "Curator" | "Broadcaster";

export interface YearlyTweetCount {
  year: number;
  count: number;
}

export interface TweetTypeBreakdown {
  original: number;
  reply: number;
  retweet: number;
  total: number;
  /** Whichever has the highest share. */
  persona: Persona;
}

export interface WrappedStats {
  username: string;
  daysOnX: number | null;
  accountCreatedAt: string | null;
  tweetCount: number;
  likeCount: number;
  firstAndLast: FirstAndLast;
  hourDistribution: HourDistribution;
  topHour: TopHour | null;
  topHashtags: HashtagCount[];
  topContacts: Contact[];
  yearly: YearlyTweetCount[];
  screenNameChanges: ScreenNameChange[];
  breakdown: TweetTypeBreakdown;
}

function computeDaysOnX(archive: ParsedArchive): number | null {
  const created = archive.account?.createdAt;
  if (!created) return null;
  const d = parseDate(created);
  if (!d) return null;
  const ms = Date.now() - d.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function computeYearly(archive: ParsedArchive): YearlyTweetCount[] {
  const counts = new Map<number, number>();
  for (const t of archive.tweets) {
    const d = parseDate(t.createdAt);
    if (!d) continue;
    const year = d.getFullYear();
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  const entries: YearlyTweetCount[] = [];
  for (const [year, count] of counts) entries.push({ year, count });
  entries.sort((a, b) => a.year - b.year);
  return entries;
}

function computeBreakdown(archive: ParsedArchive): TweetTypeBreakdown {
  let original = 0;
  let reply = 0;
  let retweet = 0;
  for (const t of archive.tweets) {
    if (t.isRetweet) {
      retweet++;
    } else if (t.inReplyToStatusId) {
      reply++;
    } else {
      original++;
    }
  }
  const total = original + reply + retweet;

  let persona: Persona = "Broadcaster";
  if (total > 0) {
    if (reply >= original && reply >= retweet) persona = "Conversationalist";
    else if (retweet > original) persona = "Curator";
    else persona = "Broadcaster";
  }

  return { original, reply, retweet, total, persona };
}

export function buildWrappedStats(archive: ParsedArchive): WrappedStats | null {
  if (archive.tweets.length === 0) return null;

  return {
    username: archive.meta.username,
    daysOnX: computeDaysOnX(archive),
    accountCreatedAt: archive.account?.createdAt ?? null,
    tweetCount: archive.tweets.length,
    likeCount: archive.likes.length,
    firstAndLast: findFirstAndLastTweet(archive),
    hourDistribution: buildHourDistribution(archive),
    topHour: topTweetHour(archive),
    topHashtags: topHashtags(archive, 5),
    topContacts: topContacts(archive, 5),
    yearly: computeYearly(archive),
    screenNameChanges: [...archive.screenNameChanges].sort((a, b) =>
      a.changedAt.localeCompare(b.changedAt),
    ),
    breakdown: computeBreakdown(archive),
  };
}
