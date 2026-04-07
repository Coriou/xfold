import { describe, expect, it } from "vitest";
import {
  computeScore,
  computeScoreShareability,
} from "@/components/share-cards/cards/score/compute";
import { computePrivacyScore } from "@/lib/privacy-score";
import {
  buildSyntheticArchive,
  syntheticAdImpression,
  syntheticAdImpressionBatch,
  syntheticPersonalization,
  syntheticTweet,
} from "@/lib/archive/__fixtures/synthetic-archive";

describe("computeScore", () => {
  it("returns a score card props for any archive (never null)", () => {
    const archive = buildSyntheticArchive();
    const score = computePrivacyScore(archive);
    const props = computeScore({ archive, score });
    expect(props).not.toBeNull();
    expect(props?.grade).toBe(score.grade);
    expect(props?.overall).toBe(score.overall);
  });

  it("counts unique advertisers across impressions and engagements", () => {
    const archive = buildSyntheticArchive({
      adImpressions: [
        syntheticAdImpressionBatch([
          syntheticAdImpression({ advertiserScreenName: "a" }),
          syntheticAdImpression({ advertiserScreenName: "b" }),
          syntheticAdImpression({ advertiserScreenName: "a" }),
        ]),
      ],
    });
    const score = computePrivacyScore(archive);
    const props = computeScore({ archive, score });
    expect(props?.advertisers).toBe(2);
  });

  it("counts personalization interests", () => {
    const archive = buildSyntheticArchive({
      personalization: syntheticPersonalization({
        interests: [
          { name: "tech", isDisabled: false },
          { name: "music", isDisabled: true },
        ],
      }),
    });
    const score = computePrivacyScore(archive);
    const props = computeScore({ archive, score });
    expect(props?.interests).toBe(2);
  });

  it("includes a totals bullet when there is data", () => {
    const archive = buildSyntheticArchive({
      tweets: [syntheticTweet(), syntheticTweet()],
    });
    const score = computePrivacyScore(archive);
    const props = computeScore({ archive, score });
    const hasTotals = props?.bullets.some((b) =>
      b.includes("data points stored"),
    );
    expect(hasTotals).toBe(true);
  });
});

describe("computeScoreShareability", () => {
  it("matches the overall score", () => {
    const archive = buildSyntheticArchive();
    const score = computePrivacyScore(archive);
    const props = computeScore({ archive, score });
    expect(props).not.toBeNull();
    if (!props) return;
    expect(computeScoreShareability(props)).toBe(props.overall);
  });

  it("clamps to 0-100", () => {
    expect(
      computeScoreShareability({
        username: "u",
        overall: 999,
        grade: "F",
        headline: "",
        bullets: [],
        tweets: 0,
        interests: 0,
        advertisers: 0,
      }),
    ).toBe(100);
    expect(
      computeScoreShareability({
        username: "u",
        overall: -10,
        grade: "A",
        headline: "",
        bullets: [],
        tweets: 0,
        interests: 0,
        advertisers: 0,
      }),
    ).toBe(0);
  });
});
