// ---------------------------------------------------------------------------
// X Eras — cluster a user's history into behavioral chapters
// ---------------------------------------------------------------------------
//
// Segments the user's timeline into distinct "eras" based on tweet volume,
// client app, and interaction style. Each era gets a label, vibe descriptor,
// and key stats — reflecting back a life history told through X usage.
//
// The insight cross-references:
//   1. Tweets (volume per year, source app, reply/RT ratio)
//   2. DMs (per-period message volume)
//   3. Likes (engagement shift)
//   4. Client journey (app switches as era boundaries)
//
// Eras are defined by calendar years and can span 1-3 years each. The
// system groups consecutive years with similar behavior patterns.
// ---------------------------------------------------------------------------

import type { ParsedArchive, Tweet } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";
import { getYearsOnX } from "@/lib/archive/account-summary";

// --- Types ------------------------------------------------------------------

export interface XEra {
  /** Display label like "2012–2014" */
  readonly label: string;
  /** Start year (inclusive). */
  readonly startYear: number;
  /** End year (inclusive). */
  readonly endYear: number;
  /** Generated era name — captures the vibe. */
  readonly name: string;
  /** Generated one-line description. */
  readonly description: string;
  /** Average tweets per day in this era. */
  readonly tweetsPerDay: number;
  /** Total tweets in this era. */
  readonly tweetCount: number;
  /** Dominant client app. */
  readonly primaryClient: string;
  /** Reply percentage (0–100). */
  readonly replyPercent: number;
  /** Retweet percentage (0–100). */
  readonly retweetPercent: number;
  /** Total DM messages in this era. */
  readonly dmCount: number;
  /** Total likes in this era (approximated from available data). */
  readonly likeCount: number;
}

export interface XErasResult {
  /** The eras, in chronological order. */
  readonly eras: readonly XEra[];
  /** Total span in years. */
  readonly totalYears: number;
  /** Username for display. */
  readonly username: string;
}

// --- Helpers ----------------------------------------------------------------

interface YearBucket {
  year: number;
  tweets: Tweet[];
  dmCount: number;
  likeCount: number;
  clients: Map<string, number>;
}

function bucketByYear(archive: ParsedArchive): YearBucket[] {
  const buckets = new Map<number, YearBucket>();

  function ensureBucket(year: number): YearBucket {
    let b = buckets.get(year);
    if (!b) {
      b = { year, tweets: [], dmCount: 0, likeCount: 0, clients: new Map() };
      buckets.set(year, b);
    }
    return b;
  }

  for (const tweet of archive.tweets) {
    const d = parseDate(tweet.createdAt);
    if (!d) continue;
    const year = d.getFullYear();
    const bucket = ensureBucket(year);
    bucket.tweets.push(tweet);
    const client = tweet.source || "Unknown";
    bucket.clients.set(client, (bucket.clients.get(client) ?? 0) + 1);
  }

  for (const conv of archive.directMessages) {
    for (const msg of conv.messages) {
      const d = parseDate(msg.createdAt);
      if (!d) continue;
      ensureBucket(d.getFullYear()).dmCount++;
    }
  }
  for (const conv of archive.groupDirectMessages) {
    for (const msg of conv.messages) {
      const d = parseDate(msg.createdAt);
      if (!d) continue;
      ensureBucket(d.getFullYear()).dmCount++;
    }
  }

  // Likes lack reliable timestamps in most archives, but some have expandedUrl
  // with tweet IDs that encode timestamps. For simplicity, distribute likes
  // proportionally to tweet volumes per year.
  const totalTweets = archive.tweets.length;
  const totalLikes = archive.likes.length;
  if (totalTweets > 0 && totalLikes > 0) {
    for (const bucket of buckets.values()) {
      bucket.likeCount = Math.round(
        (bucket.tweets.length / totalTweets) * totalLikes,
      );
    }
  }

  return [...buckets.values()].sort((a, b) => a.year - b.year);
}

function topClient(clients: Map<string, number>): string {
  let best = "Unknown";
  let bestCount = 0;
  for (const [name, count] of clients) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

function daysInYearRange(startYear: number, endYear: number): number {
  return (endYear - startYear + 1) * 365;
}

function classifyEra(stats: {
  tweetsPerDay: number;
  replyPercent: number;
  retweetPercent: number;
  dmCount: number;
  tweetCount: number;
}): { name: string; description: string } {
  const { tweetsPerDay, replyPercent, retweetPercent, dmCount, tweetCount } =
    stats;

  // Lurker: very few tweets
  if (tweetsPerDay < 0.1 && tweetCount < 20) {
    if (dmCount > 100) {
      return {
        name: "The Shadow User",
        description:
          "Barely tweeted publicly, but active in DMs. A private presence.",
      };
    }
    return {
      name: "The Lurker Phase",
      description: "More reading than writing. X was still watching.",
    };
  }

  // Power user
  if (tweetsPerDay > 5) {
    if (replyPercent > 50) {
      return {
        name: "The Debater",
        description:
          "Constant replies and conversations. X mapped your social graph here.",
      };
    }
    if (retweetPercent > 40) {
      return {
        name: "The Amplifier",
        description:
          "Heavy retweeting — shaping the algorithm with every share.",
      };
    }
    return {
      name: "Peak Poster",
      description: "Max output. This is when X learned the most about you.",
    };
  }

  // Moderate
  if (tweetsPerDay > 1) {
    if (replyPercent > 40) {
      return {
        name: "The Conversationalist",
        description:
          "Engaged and social. Your replies painted a detailed interest map.",
      };
    }
    return {
      name: "The Regular",
      description: "Steady posting. Enough data for X to build a rich profile.",
    };
  }

  // Light
  if (tweetsPerDay > 0.3) {
    if (dmCount > 200) {
      return {
        name: "The DM Era",
        description:
          "Fewer public posts, more private messages. X stored all of them.",
      };
    }
    return {
      name: "The Slowdown",
      description:
        "Posting tapered off, but X kept collecting everything else.",
    };
  }

  // Minimal
  if (dmCount > 50) {
    return {
      name: "The Ghost",
      description: "Almost silent publicly. DMs tell a different story.",
    };
  }
  return {
    name: "The Quiet Years",
    description:
      "Minimal activity, but your account stayed open — data kept flowing.",
  };
}

function areSimilar(a: YearBucket, b: YearBucket): boolean {
  const days = 365;
  const aTpd = a.tweets.length / days;
  const bTpd = b.tweets.length / days;

  // Similar volume (within 3x of each other, or both quiet)
  // If one year is "loud" (>0.5 tweets/day) we compare ratios; the previous
  // implementation used `|| 0.01` as a divide-by-zero guard which produced
  // wildly distorted ratios when one bucket was empty. The right answer in
  // that case is "yes, a loud year and a silent year are NOT similar".
  if (aTpd > 0.5 || bTpd > 0.5) {
    if (aTpd === 0 || bTpd === 0) return false;
    const ratio = aTpd > bTpd ? aTpd / bTpd : bTpd / aTpd;
    if (ratio > 3) return false;
  }

  // Same primary client
  if (topClient(a.clients) !== topClient(b.clients)) return false;

  return true;
}

// --- Main -------------------------------------------------------------------

export function buildXEras(archive: ParsedArchive): XErasResult | null {
  if (archive.tweets.length < 10) return null;

  const yearBuckets = bucketByYear(archive);
  if (yearBuckets.length < 2) return null;

  // Group consecutive similar years into eras
  const groups: YearBucket[][] = [];
  let current: YearBucket[] = [];

  for (const bucket of yearBuckets) {
    const prev = current[current.length - 1];
    if (!prev || areSimilar(prev, bucket)) {
      current.push(bucket);
    } else {
      groups.push(current);
      current = [bucket];
    }
    // Cap eras at 4 years max
    if (current.length >= 4) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length > 0) groups.push(current);

  const eras: XEra[] = [];

  for (const group of groups) {
    const first = group[0];
    const last = group[group.length - 1];
    if (!first || !last) continue;

    const startYear = first.year;
    const endYear = last.year;
    const days = daysInYearRange(startYear, endYear);

    let totalTweets = 0;
    let replies = 0;
    let retweets = 0;
    let dmCount = 0;
    let likeCount = 0;
    const allClients = new Map<string, number>();

    for (const b of group) {
      totalTweets += b.tweets.length;
      dmCount += b.dmCount;
      likeCount += b.likeCount;
      for (const t of b.tweets) {
        if (t.inReplyToStatusId) replies++;
        if (t.isRetweet) retweets++;
      }
      for (const [client, count] of b.clients) {
        allClients.set(client, (allClients.get(client) ?? 0) + count);
      }
    }

    const tweetsPerDay = days > 0 ? totalTweets / days : 0;
    const replyPercent = totalTweets > 0 ? (replies / totalTweets) * 100 : 0;
    const retweetPercent = totalTweets > 0 ? (retweets / totalTweets) * 100 : 0;

    const { name, description } = classifyEra({
      tweetsPerDay,
      replyPercent,
      retweetPercent,
      dmCount,
      tweetCount: totalTweets,
    });

    eras.push({
      label: startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`,
      startYear,
      endYear,
      name,
      description,
      tweetsPerDay: Math.round(tweetsPerDay * 10) / 10,
      tweetCount: totalTweets,
      primaryClient: topClient(allClients),
      replyPercent: Math.round(replyPercent),
      retweetPercent: Math.round(retweetPercent),
      dmCount,
      likeCount,
    });
  }

  if (eras.length < 2) return null;

  const firstEra = eras[0];
  const lastEra = eras[eras.length - 1];
  if (!firstEra || !lastEra) return null;

  // Use the canonical "years on X" value so this share card matches the
  // Top Findings card and the Privacy Erosion section header. The previous
  // computation used `lastEra.endYear - firstEra.startYear + 1`, which is
  // the span of *years that had tweets* — which can be smaller than the
  // account's actual age if the user joined X before they started posting.
  const canonicalYears = getYearsOnX(archive);
  const totalYears =
    canonicalYears ?? lastEra.endYear - firstEra.startYear + 1;

  return {
    eras,
    totalYears,
    username: archive.meta.username,
  };
}
