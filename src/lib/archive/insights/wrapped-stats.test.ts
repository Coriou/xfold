import { describe, expect, it } from "vitest";
import { buildWrappedStats } from "@/lib/archive/insights/wrapped-stats";
import {
  buildSyntheticArchive,
  syntheticAccount,
  syntheticScreenNameChange,
  syntheticTweet,
} from "@/lib/archive/__fixtures/synthetic-archive";

describe("buildWrappedStats", () => {
  it("returns null when there are no tweets", () => {
    expect(buildWrappedStats(buildSyntheticArchive())).toBeNull();
  });

  it("computes core counts and identifies persona", () => {
    const archive = buildSyntheticArchive({
      account: syntheticAccount({ createdAt: "2018-01-01T00:00:00.000Z" }),
      tweets: [
        syntheticTweet({ id: "1", createdAt: "2020-01-01T12:00:00.000Z" }),
        syntheticTweet({ id: "2", createdAt: "2021-06-15T12:00:00.000Z" }),
        syntheticTweet({ id: "3", createdAt: "2022-12-31T12:00:00.000Z" }),
      ],
    });
    const stats = buildWrappedStats(archive);
    expect(stats).not.toBeNull();
    expect(stats?.tweetCount).toBe(3);
    expect(stats?.daysOnX).toBeGreaterThan(2000);
    expect(stats?.firstAndLast.first?.id).toBe("1");
    expect(stats?.firstAndLast.last?.id).toBe("3");
  });

  it("classifies persona as Conversationalist when replies dominate", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ id: "1", inReplyToStatusId: "x" }),
        syntheticTweet({ id: "2", inReplyToStatusId: "y" }),
        syntheticTweet({ id: "3" }),
      ],
    });
    expect(buildWrappedStats(archive)?.breakdown.persona).toBe(
      "Conversationalist",
    );
  });

  it("classifies persona as Curator when retweets dominate", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ id: "1", isRetweet: true, fullText: "RT @x: hi" }),
        syntheticTweet({ id: "2", isRetweet: true, fullText: "RT @y: hi" }),
        syntheticTweet({ id: "3" }),
      ],
    });
    expect(buildWrappedStats(archive)?.breakdown.persona).toBe("Curator");
  });

  it("classifies persona as Broadcaster when originals dominate", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ id: "1" }),
        syntheticTweet({ id: "2" }),
        syntheticTweet({ id: "3" }),
        syntheticTweet({ id: "4", isRetweet: true, fullText: "RT @x: hi" }),
      ],
    });
    expect(buildWrappedStats(archive)?.breakdown.persona).toBe("Broadcaster");
  });

  it("breaks an original/retweet/reply tie in favor of Broadcaster", () => {
    // 1 of each — pure tie. The previous code's first-listed-wins behavior
    // would have picked "Conversationalist" from statement order; we now
    // require a strict majority of replies for that label.
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ id: "1" }),
        syntheticTweet({ id: "2", isRetweet: true, fullText: "RT @x: hi" }),
        syntheticTweet({ id: "3", inReplyToStatusId: "y" }),
      ],
    });
    expect(buildWrappedStats(archive)?.breakdown.persona).toBe("Broadcaster");
  });

  it("breaks a retweet/reply tie (with no originals) in favor of Curator", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ id: "1", isRetweet: true, fullText: "RT @x: hi" }),
        syntheticTweet({ id: "2", inReplyToStatusId: "y" }),
      ],
    });
    expect(buildWrappedStats(archive)?.breakdown.persona).toBe("Curator");
  });

  it("buckets tweets by year ascending", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ createdAt: "2022-06-15T00:00:00.000Z" }),
        syntheticTweet({ createdAt: "2020-01-01T00:00:00.000Z" }),
        syntheticTweet({ createdAt: "2020-05-01T00:00:00.000Z" }),
        syntheticTweet({ createdAt: "2024-12-31T00:00:00.000Z" }),
      ],
    });
    const yearly = buildWrappedStats(archive)?.yearly ?? [];
    expect(yearly.map((y) => y.year)).toEqual([2020, 2022, 2024]);
    expect(yearly[0]?.count).toBe(2);
  });

  it("returns null daysOnX when account is missing", () => {
    const archive = buildSyntheticArchive({
      tweets: [syntheticTweet()],
    });
    expect(buildWrappedStats(archive)?.daysOnX).toBeNull();
  });

  it("sorts screen name changes chronologically", () => {
    const archive = buildSyntheticArchive({
      tweets: [syntheticTweet()],
      screenNameChanges: [
        syntheticScreenNameChange({
          changedAt: "2020-01-01T00:00:00.000Z",
          changedFrom: "b",
          changedTo: "c",
        }),
        syntheticScreenNameChange({
          changedAt: "2018-01-01T00:00:00.000Z",
          changedFrom: "a",
          changedTo: "b",
        }),
      ],
    });
    const stats = buildWrappedStats(archive);
    expect(stats?.screenNameChanges[0]?.changedFrom).toBe("a");
    expect(stats?.screenNameChanges[1]?.changedFrom).toBe("b");
  });
});
