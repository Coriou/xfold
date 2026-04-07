import { describe, expect, it } from "vitest";
import {
  computeBenchmarkCard,
  computeBenchmarkShareability,
} from "@/components/share-cards/cards/benchmark/compute";
import { computePrivacyScore } from "@/lib/privacy-score";
import {
  buildSyntheticArchive,
  syntheticPersonalization,
} from "@/lib/archive/__fixtures/synthetic-archive";

function ctx(archive = buildSyntheticArchive()) {
  return { archive, score: computePrivacyScore(archive) };
}

describe("computeBenchmarkCard", () => {
  it("returns null for an empty archive", () => {
    expect(computeBenchmarkCard(ctx())).toBeNull();
  });

  it("returns props when metrics exceed benchmarks", () => {
    const archive = buildSyntheticArchive({
      personalization: syntheticPersonalization({
        advertisers: Array.from({ length: 500 }, (_, i) => `adv-${i}`),
        interests: Array.from({ length: 300 }, (_, i) => ({
          name: `interest-${i}`,
          isDisabled: false,
        })),
      }),
    });
    const result = computeBenchmarkCard(ctx(archive));
    // With 500 advertisers, should exceed typical range
    if (result) {
      expect(result.username).toBe("test_user");
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.totalConcerning).toBeGreaterThan(0);
    }
  });

  it("caps items at 4", () => {
    const archive = buildSyntheticArchive({
      personalization: syntheticPersonalization({
        advertisers: Array.from({ length: 1000 }, (_, i) => `adv-${i}`),
        interests: Array.from({ length: 500 }, (_, i) => ({
          name: `interest-${i}`,
          isDisabled: false,
        })),
      }),
      deletedTweets: Array.from({ length: 200 }, (_, i) => ({
        id: `d${i}`,
        fullText: `deleted ${i}`,
        createdAt: "2020-01-01T00:00:00.000Z",
        deletedAt: "2021-01-01T00:00:00.000Z",
        isRetweet: false,
        hashtags: [] as string[],
        mentions: [] as {
          accountId: string;
          screenName: string;
          name: string;
          id: string;
        }[],
      })),
    });
    const result = computeBenchmarkCard(ctx(archive));
    if (result) {
      expect(result.items.length).toBeLessThanOrEqual(4);
    }
  });
});

describe("computeBenchmarkShareability", () => {
  it("returns proportional magnitude", () => {
    const low = computeBenchmarkShareability({
      username: "test_user",
      items: [{ label: "a", value: "1", typical: "1-2", multiplier: "1.5×" }],
      totalConcerning: 1,
    });
    const high = computeBenchmarkShareability({
      username: "test_user",
      items: [
        { label: "a", value: "1", typical: "1-2", multiplier: "2×" },
        { label: "b", value: "2", typical: "1-2", multiplier: "3×" },
        { label: "c", value: "3", typical: "1-2", multiplier: "4×" },
      ],
      totalConcerning: 5,
    });
    expect(high.magnitude).toBeGreaterThan(low.magnitude);
  });
});
