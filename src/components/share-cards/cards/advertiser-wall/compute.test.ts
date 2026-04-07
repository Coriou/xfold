import { describe, expect, it } from "vitest";
import {
  computeAdvertiserWall,
  computeAdvertiserWallShareability,
} from "@/components/share-cards/cards/advertiser-wall/compute";
import { computePrivacyScore } from "@/lib/privacy-score";
import {
  buildSyntheticArchive,
  syntheticAdImpression,
  syntheticAdImpressionBatch,
} from "@/lib/archive/__fixtures/synthetic-archive";

describe("computeAdvertiserWall", () => {
  it("returns null when there are fewer than 5 advertisers", () => {
    const archive = buildSyntheticArchive({
      adImpressions: [
        syntheticAdImpressionBatch([
          syntheticAdImpression({ advertiserScreenName: "a" }),
          syntheticAdImpression({ advertiserScreenName: "b" }),
        ]),
      ],
    });
    const score = computePrivacyScore(archive);
    expect(computeAdvertiserWall({ archive, score })).toBeNull();
  });

  it("returns props when there are 5+ advertisers", () => {
    const archive = buildSyntheticArchive({
      adImpressions: [
        syntheticAdImpressionBatch(
          Array.from({ length: 6 }, (_, i) =>
            syntheticAdImpression({
              advertiserName: `Brand ${i}`,
              advertiserScreenName: `b${i}`,
            }),
          ),
        ),
      ],
    });
    const score = computePrivacyScore(archive);
    const props = computeAdvertiserWall({ archive, score });
    expect(props?.uniqueAdvertisers).toBe(6);
    expect(props?.names.length).toBe(6);
  });

  it("caps names at 12", () => {
    const archive = buildSyntheticArchive({
      adImpressions: [
        syntheticAdImpressionBatch(
          Array.from({ length: 30 }, (_, i) =>
            syntheticAdImpression({
              advertiserName: `Brand ${i}`,
              advertiserScreenName: `b${i}`,
            }),
          ),
        ),
      ],
    });
    const score = computePrivacyScore(archive);
    const props = computeAdvertiserWall({ archive, score });
    expect(props?.names.length).toBe(12);
  });
});

describe("computeAdvertiserWallShareability", () => {
  it("scales with advertiser count and clamps at 100", () => {
    expect(
      computeAdvertiserWallShareability({
        username: "u",
        uniqueAdvertisers: 30,
        targetingTypeCount: 5,
        names: [],
      }),
    ).toBe(10);
    expect(
      computeAdvertiserWallShareability({
        username: "u",
        uniqueAdvertisers: 1000,
        targetingTypeCount: 5,
        names: [],
      }),
    ).toBe(100);
  });
});
