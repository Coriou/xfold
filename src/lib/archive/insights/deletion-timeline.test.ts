import { describe, expect, it } from "vitest";
import {
  buildSyntheticArchive,
  syntheticDeletedTweet,
  syntheticTweet,
} from "@/lib/archive/__fixtures/synthetic-archive";
import { buildDeletionTimeline } from "./deletion-timeline";

describe("buildDeletionTimeline", () => {
  it("returns null when there are no deleted tweets", () => {
    const archive = buildSyntheticArchive();
    expect(buildDeletionTimeline(archive)).toBeNull();
  });

  it("computes monthly buckets from a mix of active and deleted tweets", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ id: "1", createdAt: "2024-01-15T12:00:00.000Z" }),
        syntheticTweet({ id: "2", createdAt: "2024-01-16T12:00:00.000Z" }),
        syntheticTweet({ id: "3", createdAt: "2024-02-01T12:00:00.000Z" }),
      ],
      deletedTweets: [
        syntheticDeletedTweet({
          id: "d1",
          createdAt: "2024-01-20T12:00:00.000Z",
          deletedAt: "2024-06-01T12:00:00.000Z",
        }),
      ],
    });
    const result = buildDeletionTimeline(archive);
    expect(result).not.toBeNull();
    expect(result?.timeline.length).toBeGreaterThan(0);
    const jan = result?.timeline.find((b) => b.month === "2024-01");
    expect(jan?.activeCount).toBe(2);
    expect(jan?.deletedCount).toBe(1);
    expect(result?.deletionRate).toBeGreaterThan(0);
  });

  it("flags hashtags that exist only in deleted tweets as fully erased", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ hashtags: ["safe"] }),
      ],
      deletedTweets: [
        syntheticDeletedTweet({ hashtags: ["regret"] }),
      ],
    });
    const result = buildDeletionTimeline(archive);
    const erased = result?.erasedTopics.find((t) => t.tag === "regret");
    expect(erased?.fullyErased).toBe(true);
    expect(result?.fullyErasedCount).toBe(1);
  });

  it("computes retention days from deletedAt timestamps", () => {
    const archive = buildSyntheticArchive({
      deletedTweets: [
        syntheticDeletedTweet({
          // Anchor in the past so the day diff is positive
          deletedAt: "2020-01-01T00:00:00.000Z",
        }),
      ],
    });
    const result = buildDeletionTimeline(archive);
    expect(result?.longestRetentionDays).not.toBeNull();
    expect(result?.longestRetentionDays ?? 0).toBeGreaterThan(0);
  });

  it("handles deletedAt being null without crashing", () => {
    const archive = buildSyntheticArchive({
      deletedTweets: [
        syntheticDeletedTweet({ deletedAt: null }),
      ],
    });
    const result = buildDeletionTimeline(archive);
    expect(result?.longestRetentionDays).toBeNull();
    expect(result?.averageRetentionDays).toBeNull();
  });
});
