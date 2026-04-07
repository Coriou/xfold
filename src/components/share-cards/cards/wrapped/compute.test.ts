import { describe, expect, it } from "vitest";
import {
  computeWrapped,
  computeWrappedShareability,
} from "@/components/share-cards/cards/wrapped/compute";
import { computePrivacyScore } from "@/lib/privacy-score";
import {
  buildSyntheticArchive,
  syntheticAccount,
  syntheticTweet,
} from "@/lib/archive/__fixtures/synthetic-archive";

describe("computeWrapped", () => {
  it("returns null when there are no tweets", () => {
    const archive = buildSyntheticArchive();
    const score = computePrivacyScore(archive);
    expect(computeWrapped({ archive, score })).toBeNull();
  });

  it("returns null when account is missing (no daysOnX)", () => {
    const archive = buildSyntheticArchive({
      tweets: [syntheticTweet()],
    });
    const score = computePrivacyScore(archive);
    expect(computeWrapped({ archive, score })).toBeNull();
  });

  it("computes a complete wrapped card props", () => {
    const archive = buildSyntheticArchive({
      account: syntheticAccount({ createdAt: "2018-01-01T00:00:00.000Z" }),
      tweets: [
        syntheticTweet({
          createdAt: "2020-06-15T10:00:00.000Z",
          hashtags: ["javascript"],
          fullText: "first ever tweet about javascript",
        }),
        syntheticTweet({
          createdAt: "2021-06-15T10:00:00.000Z",
          hashtags: ["javascript"],
        }),
      ],
    });
    const score = computePrivacyScore(archive);
    const props = computeWrapped({ archive, score });
    expect(props).not.toBeNull();
    expect(props?.daysOnX).toBeGreaterThan(2000);
    expect(props?.topHashtag?.tag).toBe("javascript");
    expect(props?.topHashtag?.count).toBe(2);
    expect(props?.firstTweetText).toContain("first ever tweet");
  });
});

describe("computeWrappedShareability", () => {
  it("returns 0 for a fresh account with no extras", () => {
    expect(
      computeWrappedShareability({
        username: "u",
        daysOnX: 0,
        tweetCount: 1,
        likeCount: 0,
        topHashtag: null,
        topHourLabel: null,
        topContactScreenName: null,
        firstTweetText: null,
        firstTweetDate: null,
      }),
    ).toBe(0);
  });

  it("rewards account age", () => {
    const young = computeWrappedShareability({
      username: "u",
      daysOnX: 365,
      tweetCount: 1,
      likeCount: 0,
      topHashtag: null,
      topHourLabel: null,
      topContactScreenName: null,
      firstTweetText: null,
      firstTweetDate: null,
    });
    const old = computeWrappedShareability({
      username: "u",
      daysOnX: 365 * 10,
      tweetCount: 1,
      likeCount: 0,
      topHashtag: null,
      topHourLabel: null,
      topContactScreenName: null,
      firstTweetText: null,
      firstTweetDate: null,
    });
    expect(old).toBeGreaterThan(young);
  });

  it("clamps to 100", () => {
    expect(
      computeWrappedShareability({
        username: "u",
        daysOnX: 365 * 100,
        tweetCount: 0,
        likeCount: 0,
        topHashtag: { tag: "x", count: 1 },
        topHourLabel: "11 PM",
        topContactScreenName: "alice",
        firstTweetText: null,
        firstTweetDate: null,
      }),
    ).toBe(100);
  });
});
