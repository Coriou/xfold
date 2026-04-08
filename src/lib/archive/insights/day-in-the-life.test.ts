import { describe, expect, it } from "vitest";
import {
  buildSyntheticArchive,
  syntheticAdImpression,
  syntheticAdImpressionBatch,
} from "@/lib/archive/__fixtures/synthetic-archive";
import { buildDayInTheLife } from "./day-in-the-life";

describe("buildDayInTheLife", () => {
  it("returns null when there are no events at all", () => {
    const archive = buildSyntheticArchive();
    expect(buildDayInTheLife(archive)).toBeNull();
  });

  it("does not crash on impressions with empty targetingCriteria", () => {
    // Need at least 10 events on the densest day for buildDayInTheLife to
    // commit a result. All impressions share a single date so they cluster.
    const impressions = Array.from({ length: 12 }, () =>
      syntheticAdImpression({ targetingCriteria: [] }),
    );
    const archive = buildSyntheticArchive({
      adImpressions: [syntheticAdImpressionBatch(impressions)],
    });
    const result = buildDayInTheLife(archive);
    expect(result).not.toBeNull();
    // The ad-impression event should still be present even though targeting
    // detail is unavailable, with detail safely null.
    const adEvents = result?.events.filter((e) => e.kind === "ad-impression");
    expect(adEvents?.length ?? 0).toBeGreaterThan(0);
    for (const ev of adEvents ?? []) {
      expect(ev.detail).toBeNull();
    }
  });

  it("includes targeting detail when targetingCriteria is non-empty", () => {
    const impressions = Array.from({ length: 12 }, () =>
      syntheticAdImpression({
        targetingCriteria: [
          { targetingType: "Interests", targetingValue: "Technology" },
        ],
      }),
    );
    const archive = buildSyntheticArchive({
      adImpressions: [syntheticAdImpressionBatch(impressions)],
    });
    const result = buildDayInTheLife(archive);
    const adEvent = result?.events.find((e) => e.kind === "ad-impression");
    expect(adEvent?.detail).toContain("Interests");
    expect(adEvent?.detail).toContain("Technology");
  });
});
