// ---------------------------------------------------------------------------
// First & last tweet — pure derivation
// ---------------------------------------------------------------------------

import type { ParsedArchive, Tweet } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";

export interface FirstAndLast {
  first: Tweet | null;
  last: Tweet | null;
  /** Whole days between first and last tweet (0 if either is missing). */
  daysBetween: number;
}

export function findFirstAndLastTweet(archive: ParsedArchive): FirstAndLast {
  let first: Tweet | null = null;
  let firstTime = Number.POSITIVE_INFINITY;
  let last: Tweet | null = null;
  let lastTime = Number.NEGATIVE_INFINITY;

  for (const t of archive.tweets) {
    const d = parseDate(t.createdAt);
    if (!d) continue;
    const time = d.getTime();
    if (time < firstTime) {
      firstTime = time;
      first = t;
    }
    if (time > lastTime) {
      lastTime = time;
      last = t;
    }
  }

  const daysBetween =
    Number.isFinite(firstTime) && Number.isFinite(lastTime)
      ? Math.floor((lastTime - firstTime) / (1000 * 60 * 60 * 24))
      : 0;

  return { first, last, daysBetween };
}
