import { describe, expect, it } from "vitest";
import {
  computeReceipt,
  computeReceiptShareability,
} from "@/components/share-cards/cards/receipt/compute";
import { computePrivacyScore } from "@/lib/privacy-score";
import {
  buildSyntheticArchive,
  syntheticAdImpression,
  syntheticAdImpressionBatch,
} from "@/lib/archive/__fixtures/synthetic-archive";

describe("computeReceipt", () => {
  it("returns null for an empty archive", () => {
    const archive = buildSyntheticArchive();
    const score = computePrivacyScore(archive);
    expect(computeReceipt({ archive, score })).toBeNull();
  });

  it("returns the highest-shareability extreme stat", () => {
    const archive = buildSyntheticArchive({
      adImpressions: [
        syntheticAdImpressionBatch(
          Array.from({ length: 100 }, (_, i) =>
            syntheticAdImpression({
              advertiserName: `Brand ${i}`,
              advertiserScreenName: `brand_${i}`,
            }),
          ),
        ),
      ],
    });
    const score = computePrivacyScore(archive);
    const props = computeReceipt({ archive, score });
    expect(props).not.toBeNull();
    expect(props?.value).toBe("100");
    expect(props?.label).toContain("advertisers");
  });
});

describe("computeReceiptShareability", () => {
  it("returns the props' shareability field", () => {
    expect(
      computeReceiptShareability({
        username: "u",
        value: "100",
        label: "things",
        contextLine: "context",
        shareability: 75,
      }),
    ).toBe(75);
  });
});
