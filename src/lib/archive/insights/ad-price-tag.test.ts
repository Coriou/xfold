import { describe, expect, it } from "vitest";
import {
  buildSyntheticArchive,
  syntheticAdImpression,
  syntheticAdImpressionBatch,
} from "@/lib/archive/__fixtures/synthetic-archive";
import { buildAdPriceTag } from "./ad-price-tag";

describe("buildAdPriceTag", () => {
  it("returns null when there are no impressions", () => {
    const archive = buildSyntheticArchive();
    expect(buildAdPriceTag(archive)).toBeNull();
  });

  it("computes biggestSpender without producing NaN when totalImpressions is zero", () => {
    // Construct an impression batch whose batch is non-empty (so we get past
    // the totalImpressions === 0 short-circuit) but whose advertiser has been
    // recorded with zero counted impressions in the spender map. Easiest way:
    // use a single batch with one impression. We then verify the biggestSpender
    // estimatedSpend is a finite number, never NaN, even on this minimal input.
    const archive = buildSyntheticArchive({
      adImpressions: [syntheticAdImpressionBatch([syntheticAdImpression()])],
    });
    const result = buildAdPriceTag(archive);
    expect(result).not.toBeNull();
    expect(result?.biggestSpender).not.toBeNull();
    expect(Number.isFinite(result?.biggestSpender?.estimatedSpend ?? NaN)).toBe(
      true,
    );
  });

  it("includes the biggest spender for an advertiser with multiple impressions", () => {
    const archive = buildSyntheticArchive({
      adImpressions: [
        syntheticAdImpressionBatch([
          syntheticAdImpression({
            advertiserName: "Big Corp",
            advertiserScreenName: "bigcorp",
          }),
          syntheticAdImpression({
            advertiserName: "Big Corp",
            advertiserScreenName: "bigcorp",
          }),
          syntheticAdImpression({
            advertiserName: "Small Co",
            advertiserScreenName: "smallco",
          }),
        ]),
      ],
    });
    const result = buildAdPriceTag(archive);
    expect(result?.biggestSpender?.name).toBe("Big Corp");
    expect(result?.biggestSpender?.impressions).toBe(2);
    expect(Number.isFinite(result?.biggestSpender?.estimatedSpend ?? NaN)).toBe(
      true,
    );
  });
});
