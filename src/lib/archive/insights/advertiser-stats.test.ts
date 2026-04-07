import { describe, expect, it } from "vitest";
import { buildAdvertiserStats } from "@/lib/archive/insights/advertiser-stats";
import {
  buildSyntheticArchive,
  syntheticAdEngagement,
  syntheticAdEngagementBatch,
  syntheticAdImpression,
  syntheticAdImpressionBatch,
  syntheticTargetingCriterion,
} from "@/lib/archive/__fixtures/synthetic-archive";

describe("buildAdvertiserStats", () => {
  it("returns zeroed stats for empty archive", () => {
    const stats = buildAdvertiserStats(buildSyntheticArchive());
    expect(stats.uniqueAdvertisers).toBe(0);
    expect(stats.totalImpressions).toBe(0);
    expect(stats.totalEngagements).toBe(0);
    expect(stats.targetingTypes).toEqual([]);
    expect(stats.top).toEqual([]);
  });

  it("aggregates impressions and engagements per advertiser", () => {
    const archive = buildSyntheticArchive({
      adImpressions: [
        syntheticAdImpressionBatch([
          syntheticAdImpression({
            advertiserName: "Acme",
            advertiserScreenName: "acme",
          }),
          syntheticAdImpression({
            advertiserName: "Acme",
            advertiserScreenName: "acme",
          }),
          syntheticAdImpression({
            advertiserName: "Globex",
            advertiserScreenName: "globex",
          }),
        ]),
      ],
      adEngagements: [
        syntheticAdEngagementBatch([
          syntheticAdEngagement({
            advertiserName: "Acme",
            advertiserScreenName: "acme",
          }),
        ]),
      ],
    });
    const stats = buildAdvertiserStats(archive);
    expect(stats.uniqueAdvertisers).toBe(2);
    expect(stats.totalImpressions).toBe(3);
    expect(stats.totalEngagements).toBe(1);
    expect(stats.top).toHaveLength(2);
    expect(stats.top[0]?.screenName).toBe("acme");
    expect(stats.top[0]?.impressions).toBe(2);
    expect(stats.top[0]?.engagements).toBe(1);
    expect(stats.top[1]?.screenName).toBe("globex");
  });

  it("collects unique targeting types across both data sources", () => {
    const archive = buildSyntheticArchive({
      adImpressions: [
        syntheticAdImpressionBatch([
          syntheticAdImpression({
            targetingCriteria: [
              syntheticTargetingCriterion({ targetingType: "Interests" }),
              syntheticTargetingCriterion({ targetingType: "Age" }),
            ],
          }),
        ]),
      ],
      adEngagements: [
        syntheticAdEngagementBatch([
          syntheticAdEngagement({
            targetingCriteria: [
              syntheticTargetingCriterion({ targetingType: "Locations" }),
              syntheticTargetingCriterion({ targetingType: "Age" }),
            ],
          }),
        ]),
      ],
    });
    const stats = buildAdvertiserStats(archive);
    expect(stats.targetingTypes).toEqual(["Age", "Interests", "Locations"]);
  });

  it("respects topN slicing", () => {
    const archive = buildSyntheticArchive({
      adImpressions: [
        syntheticAdImpressionBatch([
          syntheticAdImpression({ advertiserName: "A", advertiserScreenName: "a" }),
          syntheticAdImpression({ advertiserName: "B", advertiserScreenName: "b" }),
          syntheticAdImpression({ advertiserName: "C", advertiserScreenName: "c" }),
        ]),
      ],
    });
    expect(buildAdvertiserStats(archive, 2).top).toHaveLength(2);
    expect(buildAdvertiserStats(archive, 0).top).toHaveLength(0);
  });
});
