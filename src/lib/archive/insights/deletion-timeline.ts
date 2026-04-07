// ---------------------------------------------------------------------------
// Deletion timeline — temporal analysis of deleted tweets
// ---------------------------------------------------------------------------
//
// Reframes deleted tweets as a trust-violation timeline: when did deletions
// happen, how long has X kept them, what topics were erased, and how does
// deletion activity correlate with posting activity?
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";

// --- Types ------------------------------------------------------------------

export interface DeletionTimelineBucket {
  /** "YYYY-MM" format. */
  readonly month: string;
  /** Number of tweets posted in this month that were later deleted. */
  readonly deletedCount: number;
  /** Number of active (non-deleted) tweets posted in the same month. */
  readonly activeCount: number;
}

export interface ErasedTopic {
  /** The hashtag (without #). */
  readonly tag: string;
  /** How many deleted tweets contain this hashtag. */
  readonly deletedCount: number;
  /** How many active tweets contain this hashtag. */
  readonly activeCount: number;
  /** True if this hashtag appears ONLY in deleted tweets (fully erased). */
  readonly fullyErased: boolean;
}

export interface DeletionTimelineStats {
  /** Monthly buckets of deleted vs active tweets. */
  readonly timeline: readonly DeletionTimelineBucket[];
  /** Topics the user tried to erase, sorted by deletedCount desc. */
  readonly erasedTopics: readonly ErasedTopic[];
  /** How many topics appear only in deleted tweets. */
  readonly fullyErasedCount: number;
  /** Longest retention: days between deletion date and today. */
  readonly longestRetentionDays: number | null;
  /** Average retention: mean days X kept a "deleted" tweet. */
  readonly averageRetentionDays: number | null;
  /** Peak deletion month (most deletions). */
  readonly peakMonth: string | null;
  /** Peak deletion count. */
  readonly peakMonthCount: number;
  /** Percentage of all-time tweets that are deleted. */
  readonly deletionRate: number;
}

// --- Implementation ---------------------------------------------------------

function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function buildDeletionTimeline(
  archive: ParsedArchive,
): DeletionTimelineStats | null {
  const deleted = archive.deletedTweets;
  if (deleted.length === 0) return null;

  const activeCount = archive.tweets.length;
  const deletionRate =
    activeCount + deleted.length > 0
      ? (deleted.length / (activeCount + deleted.length)) * 100
      : 0;

  // --- Monthly timeline ---
  const deletedByMonth = new Map<string, number>();
  const activeByMonth = new Map<string, number>();

  for (const tweet of deleted) {
    const d = parseDate(tweet.createdAt);
    if (!d) continue;
    const key = toMonthKey(d);
    deletedByMonth.set(key, (deletedByMonth.get(key) ?? 0) + 1);
  }

  for (const tweet of archive.tweets) {
    const d = parseDate(tweet.createdAt);
    if (!d) continue;
    const key = toMonthKey(d);
    activeByMonth.set(key, (activeByMonth.get(key) ?? 0) + 1);
  }

  // Merge all month keys and sort
  const allMonths = new Set([
    ...deletedByMonth.keys(),
    ...activeByMonth.keys(),
  ]);
  const sortedMonths = Array.from(allMonths).sort();

  const timeline: DeletionTimelineBucket[] = sortedMonths.map((month) => ({
    month,
    deletedCount: deletedByMonth.get(month) ?? 0,
    activeCount: activeByMonth.get(month) ?? 0,
  }));

  // --- Erased topics (hashtag analysis) ---
  const deletedHashtags = new Map<string, number>();
  const activeHashtags = new Map<string, number>();

  for (const tweet of deleted) {
    for (const tag of tweet.hashtags) {
      const lower = tag.toLowerCase();
      deletedHashtags.set(lower, (deletedHashtags.get(lower) ?? 0) + 1);
    }
  }

  for (const tweet of archive.tweets) {
    for (const tag of tweet.hashtags) {
      const lower = tag.toLowerCase();
      activeHashtags.set(lower, (activeHashtags.get(lower) ?? 0) + 1);
    }
  }

  const erasedTopics: ErasedTopic[] = [];
  for (const [tag, dCount] of deletedHashtags) {
    const aCount = activeHashtags.get(tag) ?? 0;
    erasedTopics.push({
      tag,
      deletedCount: dCount,
      activeCount: aCount,
      fullyErased: aCount === 0,
    });
  }
  erasedTopics.sort((a, b) => b.deletedCount - a.deletedCount);

  const fullyErasedCount = erasedTopics.filter((t) => t.fullyErased).length;

  // --- Retention duration ---
  const now = Date.now();
  const retentionDays: number[] = [];

  for (const tweet of deleted) {
    const deletedAt = tweet.deletedAt ? parseDate(tweet.deletedAt) : null;
    if (deletedAt) {
      const days = Math.floor(
        (now - deletedAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (days > 0) retentionDays.push(days);
    }
  }

  const longestRetentionDays =
    retentionDays.length > 0 ? Math.max(...retentionDays) : null;
  const averageRetentionDays =
    retentionDays.length > 0
      ? Math.round(
          retentionDays.reduce((sum, d) => sum + d, 0) / retentionDays.length,
        )
      : null;

  // --- Peak deletion month ---
  // Use deletion date if available, otherwise creation date
  const deletionsByMonth = new Map<string, number>();
  for (const tweet of deleted) {
    const dateStr = tweet.deletedAt ?? tweet.createdAt;
    const d = parseDate(dateStr);
    if (!d) continue;
    const key = toMonthKey(d);
    deletionsByMonth.set(key, (deletionsByMonth.get(key) ?? 0) + 1);
  }

  let peakMonth: string | null = null;
  let peakMonthCount = 0;
  for (const [month, count] of deletionsByMonth) {
    if (count > peakMonthCount) {
      peakMonth = month;
      peakMonthCount = count;
    }
  }

  return {
    timeline,
    erasedTopics,
    fullyErasedCount,
    longestRetentionDays,
    averageRetentionDays,
    peakMonth,
    peakMonthCount,
    deletionRate: Math.round(deletionRate * 10) / 10,
  };
}
