import { describe, expect, it } from "vitest";
import {
  buildHourDistribution,
  topTweetHour,
} from "@/lib/archive/insights/tweet-time-distribution";
import {
  buildSyntheticArchive,
  syntheticTweet,
} from "@/lib/archive/__fixtures/synthetic-archive";

describe("buildHourDistribution", () => {
  it("returns 24 zeros for an empty archive", () => {
    const dist = buildHourDistribution(buildSyntheticArchive());
    expect(dist.buckets).toHaveLength(24);
    expect(dist.totalParsed).toBe(0);
    expect(dist.buckets.every((c) => c === 0)).toBe(true);
  });

  it("buckets tweets by local hour", () => {
    // Local-hour bucketing depends on the runtime timezone — pick widely
    // separated UTC hours and just assert that *some* bucket has counts.
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ createdAt: "2020-01-01T00:00:00.000Z" }),
        syntheticTweet({ createdAt: "2020-01-01T12:00:00.000Z" }),
        syntheticTweet({ createdAt: "2020-01-01T23:00:00.000Z" }),
      ],
    });
    const dist = buildHourDistribution(archive);
    expect(dist.totalParsed).toBe(3);
    const sum = dist.buckets.reduce((a, b) => a + b, 0);
    expect(sum).toBe(3);
  });

  it("ignores tweets with unparseable dates", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ createdAt: "garbage" }),
        syntheticTweet({ createdAt: "2020-01-01T12:00:00.000Z" }),
      ],
    });
    const dist = buildHourDistribution(archive);
    expect(dist.totalParsed).toBe(1);
  });
});

describe("topTweetHour", () => {
  it("returns null for an empty archive", () => {
    expect(topTweetHour(buildSyntheticArchive())).toBeNull();
  });

  it("returns the most-active hour with a label", () => {
    // Stack four tweets at the same UTC hour so they land in the same bucket
    // regardless of the runtime timezone.
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ createdAt: "2020-01-01T15:00:00.000Z" }),
        syntheticTweet({ createdAt: "2020-01-02T15:00:00.000Z" }),
        syntheticTweet({ createdAt: "2020-01-03T15:00:00.000Z" }),
        syntheticTweet({ createdAt: "2020-01-04T03:00:00.000Z" }),
      ],
    });
    const result = topTweetHour(archive);
    expect(result).not.toBeNull();
    expect(result?.count).toBe(3);
    expect(typeof result?.label).toBe("string");
    expect(result?.label.length).toBeGreaterThan(0);
  });
});
