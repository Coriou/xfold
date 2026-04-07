import { describe, expect, it } from "vitest";
import { findFirstAndLastTweet } from "@/lib/archive/insights/first-and-last-tweet";
import {
  buildSyntheticArchive,
  syntheticTweet,
} from "@/lib/archive/__fixtures/synthetic-archive";

describe("findFirstAndLastTweet", () => {
  it("returns nulls when there are no tweets", () => {
    const result = findFirstAndLastTweet(buildSyntheticArchive());
    expect(result.first).toBeNull();
    expect(result.last).toBeNull();
    expect(result.daysBetween).toBe(0);
  });

  it("identifies the earliest and latest tweet", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ id: "b", createdAt: "2022-06-15T00:00:00.000Z" }),
        syntheticTweet({ id: "a", createdAt: "2020-01-01T00:00:00.000Z" }),
        syntheticTweet({ id: "c", createdAt: "2024-12-31T00:00:00.000Z" }),
      ],
    });
    const result = findFirstAndLastTweet(archive);
    expect(result.first?.id).toBe("a");
    expect(result.last?.id).toBe("c");
  });

  it("computes whole days between first and last", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ createdAt: "2020-01-01T00:00:00.000Z" }),
        syntheticTweet({ createdAt: "2020-01-11T00:00:00.000Z" }),
      ],
    });
    expect(findFirstAndLastTweet(archive).daysBetween).toBe(10);
  });

  it("ignores tweets with unparseable dates", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ id: "bad", createdAt: "not a date" }),
        syntheticTweet({ id: "ok", createdAt: "2021-01-01T00:00:00.000Z" }),
      ],
    });
    const result = findFirstAndLastTweet(archive);
    expect(result.first?.id).toBe("ok");
    expect(result.last?.id).toBe("ok");
    expect(result.daysBetween).toBe(0);
  });

  it("handles all-unparseable as zero days", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ createdAt: "" }),
        syntheticTweet({ createdAt: "not a date" }),
      ],
    });
    const result = findFirstAndLastTweet(archive);
    expect(result.first).toBeNull();
    expect(result.last).toBeNull();
    expect(result.daysBetween).toBe(0);
  });
});
