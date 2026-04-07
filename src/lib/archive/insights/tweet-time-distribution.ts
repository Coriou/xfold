// ---------------------------------------------------------------------------
// Tweet time distribution — when do you tweet?
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { formatHour, parseDate } from "@/lib/format";

export interface HourDistribution {
  /** 24-element array (index 0 = midnight, 23 = 11pm) of tweet counts. */
  buckets: number[];
  totalParsed: number;
}

export interface TopHour {
  hour: number;
  label: string;
  count: number;
}

export function buildHourDistribution(
  archive: ParsedArchive,
): HourDistribution {
  const buckets = new Array<number>(24).fill(0);
  let total = 0;

  for (const tweet of archive.tweets) {
    const d = parseDate(tweet.createdAt);
    if (!d) continue;
    const idx = d.getHours();
    if (idx < 0 || idx > 23) continue;
    const current = buckets[idx];
    if (current !== undefined) buckets[idx] = current + 1;
    total++;
  }

  return { buckets, totalParsed: total };
}

export function topTweetHour(archive: ParsedArchive): TopHour | null {
  const dist = buildHourDistribution(archive);
  if (dist.totalParsed === 0) return null;

  let bestHour = 0;
  let bestCount = -1;
  for (let h = 0; h < 24; h++) {
    const c = dist.buckets[h] ?? 0;
    if (c > bestCount) {
      bestCount = c;
      bestHour = h;
    }
  }

  return { hour: bestHour, label: formatHour(bestHour), count: bestCount };
}
