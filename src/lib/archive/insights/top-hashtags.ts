// ---------------------------------------------------------------------------
// Top hashtags — pure derivation
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";

export interface HashtagCount {
  tag: string;
  count: number;
}

/**
 * Aggregate tweet hashtags case-insensitively. The returned `tag` preserves
 * the casing of the *first* occurrence so the UI doesn't lowercase visible
 * tags. Sorted by count descending, ties broken by tag asc.
 */
export function topHashtags(
  archive: ParsedArchive,
  n: number,
): HashtagCount[] {
  const counts = new Map<string, number>();
  const display = new Map<string, string>();

  for (const tweet of archive.tweets) {
    for (const tag of tweet.hashtags) {
      if (!tag) continue;
      const key = tag.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (!display.has(key)) display.set(key, tag);
    }
  }

  const entries: HashtagCount[] = [];
  for (const [key, count] of counts) {
    entries.push({ tag: display.get(key) ?? key, count });
  }

  entries.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.tag.localeCompare(b.tag);
  });

  return entries.slice(0, Math.max(0, n));
}
