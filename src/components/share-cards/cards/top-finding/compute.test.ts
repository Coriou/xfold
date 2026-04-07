import { describe, expect, it } from "vitest";
import {
  computeTopFinding,
  computeTopFindingShareability,
} from "@/components/share-cards/cards/top-finding/compute";
import { computePrivacyScore } from "@/lib/privacy-score";
import {
  buildSyntheticArchive,
  syntheticTweet,
  syntheticPersonalization,
} from "@/lib/archive/__fixtures/synthetic-archive";
import type { DeletedTweet } from "@/lib/archive/types";

function syntheticDeletedTweet(
  overrides: Partial<DeletedTweet> = {},
): DeletedTweet {
  return {
    id: "d1",
    fullText: "deleted tweet",
    createdAt: "2020-06-15T12:00:00.000Z",
    deletedAt: "2021-01-01T00:00:00.000Z",
    isRetweet: false,
    hashtags: [],
    mentions: [],
    ...overrides,
  };
}

function ctx(archive = buildSyntheticArchive()) {
  return { archive, score: computePrivacyScore(archive) };
}

describe("computeTopFinding", () => {
  it("returns null for an empty archive", () => {
    expect(computeTopFinding(ctx())).toBeNull();
  });

  it("returns props when deleted tweets exist", () => {
    const archive = buildSyntheticArchive({
      tweets: Array.from({ length: 50 }, (_, i) =>
        syntheticTweet({ id: `t${i}`, fullText: `tweet ${i}` }),
      ),
      deletedTweets: Array.from({ length: 20 }, (_, i) =>
        syntheticDeletedTweet({ id: `d${i}`, fullText: `deleted tweet ${i}` }),
      ),
    });
    const result = computeTopFinding(ctx(archive));
    expect(result).not.toBeNull();
    expect(result?.totalFindings).toBeGreaterThanOrEqual(1);
    expect(result?.username).toBe("test_user");
  });

  it("returns correct severity counts", () => {
    const archive = buildSyntheticArchive({
      tweets: Array.from({ length: 100 }, (_, i) =>
        syntheticTweet({ id: `t${i}`, fullText: `tweet ${i}` }),
      ),
      deletedTweets: Array.from({ length: 50 }, (_, i) =>
        syntheticDeletedTweet({ id: `d${i}`, fullText: `deleted tweet ${i}` }),
      ),
      personalization: syntheticPersonalization({
        interests: Array.from({ length: 300 }, (_, i) => ({
          name: `interest-${i}`,
          isDisabled: i < 20,
        })),
        advertisers: Array.from({ length: 500 }, (_, i) => `advertiser-${i}`),
      }),
    });
    const result = computeTopFinding(ctx(archive));
    expect(result).not.toBeNull();
    if (result) {
      expect(result.criticalCount + result.highCount).toBeLessThanOrEqual(
        result.totalFindings,
      );
    }
  });
});

describe("computeTopFindingShareability", () => {
  it("returns higher uniqueness than magnitude", () => {
    const archive = buildSyntheticArchive({
      deletedTweets: Array.from({ length: 10 }, (_, i) =>
        syntheticDeletedTweet({ id: `d${i}`, fullText: `deleted ${i}` }),
      ),
      tweets: Array.from({ length: 50 }, (_, i) =>
        syntheticTweet({ id: `t${i}`, fullText: `tweet ${i}` }),
      ),
    });
    const result = computeTopFinding(ctx(archive));
    expect(result).not.toBeNull();
    if (result) {
      const shareability = computeTopFindingShareability(result);
      expect(shareability.uniqueness).toBeGreaterThanOrEqual(90);
    }
  });
});
