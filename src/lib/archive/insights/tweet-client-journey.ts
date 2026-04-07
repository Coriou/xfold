// ---------------------------------------------------------------------------
// Tweet client journey — group tweets by source app, find first/last seen
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";

export interface ClientJourneyEntry {
  /** Source app name as parsed from the HTML in tweet.source */
  client: string;
  count: number;
  firstSeen: string | null;
  lastSeen: string | null;
  /** True for any client outside the small allowlist of official X clients. */
  isThirdParty: boolean;
}

const OFFICIAL_CLIENTS: ReadonlySet<string> = new Set([
  "Twitter Web App",
  "Twitter Web Client",
  "Twitter for iPhone",
  "Twitter for iPad",
  "Twitter for Android",
  "Twitter for Mac",
  "Twitter for Windows",
  "Twitter for Android Tablets",
  "Twitter for BlackBerry",
  "Tweetdeck",
  "TweetDeck",
  "TweetDeck Web App",
  "X Web App",
  "X for iPhone",
  "X for iPad",
  "X for Android",
  "X for Mac",
]);

function isOfficial(client: string): boolean {
  return OFFICIAL_CLIENTS.has(client);
}

interface Accum {
  count: number;
  minTime: number;
  maxTime: number;
  minDate: string | null;
  maxDate: string | null;
}

export function buildTweetClientJourney(
  archive: ParsedArchive,
): ClientJourneyEntry[] {
  const byClient = new Map<string, Accum>();

  for (const tweet of archive.tweets) {
    const client = tweet.source || "Unknown";
    let accum = byClient.get(client);
    if (!accum) {
      accum = {
        count: 0,
        minTime: Number.POSITIVE_INFINITY,
        maxTime: Number.NEGATIVE_INFINITY,
        minDate: null,
        maxDate: null,
      };
      byClient.set(client, accum);
    }
    accum.count++;

    const d = parseDate(tweet.createdAt);
    if (d) {
      const t = d.getTime();
      if (t < accum.minTime) {
        accum.minTime = t;
        accum.minDate = tweet.createdAt;
      }
      if (t > accum.maxTime) {
        accum.maxTime = t;
        accum.maxDate = tweet.createdAt;
      }
    }
  }

  const entries: ClientJourneyEntry[] = [];
  for (const [client, accum] of byClient) {
    entries.push({
      client,
      count: accum.count,
      firstSeen: accum.minDate,
      lastSeen: accum.maxDate,
      isThirdParty: !isOfficial(client),
    });
  }

  entries.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.client.localeCompare(b.client);
  });

  return entries;
}
