import { describe, expect, it } from "vitest";
import { topHashtags } from "@/lib/archive/insights/top-hashtags";
import {
  buildSyntheticArchive,
  syntheticTweet,
} from "@/lib/archive/__fixtures/synthetic-archive";

describe("topHashtags", () => {
  it("returns empty list when there are no tweets", () => {
    expect(topHashtags(buildSyntheticArchive(), 5)).toEqual([]);
  });

  it("counts and sorts by frequency", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ id: "1", hashtags: ["foo", "bar"] }),
        syntheticTweet({ id: "2", hashtags: ["foo"] }),
        syntheticTweet({ id: "3", hashtags: ["foo", "baz"] }),
      ],
    });
    const result = topHashtags(archive, 5);
    expect(result).toEqual([
      { tag: "foo", count: 3 },
      { tag: "bar", count: 1 },
      { tag: "baz", count: 1 },
    ]);
  });

  it("merges case-insensitively but preserves first-seen casing", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ id: "1", hashtags: ["JavaScript"] }),
        syntheticTweet({ id: "2", hashtags: ["javascript"] }),
        syntheticTweet({ id: "3", hashtags: ["JAVASCRIPT"] }),
      ],
    });
    const result = topHashtags(archive, 5);
    expect(result).toHaveLength(1);
    expect(result[0]?.tag).toBe("JavaScript");
    expect(result[0]?.count).toBe(3);
  });

  it("respects the limit n", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ id: "1", hashtags: ["a", "b", "c", "d", "e"] }),
      ],
    });
    expect(topHashtags(archive, 2)).toHaveLength(2);
  });

  it("handles zero limit", () => {
    const archive = buildSyntheticArchive({
      tweets: [syntheticTweet({ hashtags: ["foo"] })],
    });
    expect(topHashtags(archive, 0)).toEqual([]);
  });

  it("ignores empty-string hashtags", () => {
    const archive = buildSyntheticArchive({
      tweets: [syntheticTweet({ hashtags: ["", "real"] })],
    });
    const result = topHashtags(archive, 5);
    expect(result).toEqual([{ tag: "real", count: 1 }]);
  });
});
