import { describe, expect, it } from "vitest";
import {
  buildSyntheticArchive,
  syntheticAccount,
  syntheticAdImpression,
  syntheticAdImpressionBatch,
  syntheticConnectedApp,
  syntheticIpAuditEntry,
  syntheticTweet,
} from "@/lib/archive/__fixtures/synthetic-archive";
import { buildSurveillanceTimeline } from "./surveillance-timeline";

describe("buildSurveillanceTimeline", () => {
  it("returns null when fewer than two milestones are available", () => {
    const archive = buildSyntheticArchive({
      account: syntheticAccount({ createdAt: "2015-01-01T00:00:00.000Z" }),
    });
    expect(buildSurveillanceTimeline(archive)).toBeNull();
  });

  it("builds milestones in chronological order", () => {
    const archive = buildSyntheticArchive({
      account: syntheticAccount({ createdAt: "2015-01-01T00:00:00.000Z" }),
      tweets: [
        syntheticTweet({ createdAt: "2016-06-01T00:00:00.000Z" }),
      ],
      adImpressions: [
        syntheticAdImpressionBatch([
          syntheticAdImpression({ impressionTime: "2018-03-15T00:00:00.000Z" }),
        ]),
      ],
      ipAudit: [
        syntheticIpAuditEntry({ createdAt: "2017-01-01T00:00:00.000Z" }),
      ],
    });
    const result = buildSurveillanceTimeline(archive);
    expect(result).not.toBeNull();
    const labels = result?.milestones.map((m) => m.label) ?? [];
    expect(labels).toContain("Account created");
    expect(labels).toContain("First tweet");
    expect(labels).toContain("First ad served");
    expect(labels).toContain("IP tracking begins");
    // Sorted by timestamp ascending — account creation should be first
    expect(result?.milestones[0]?.label).toBe("Account created");
  });

  it("computes duration label for multi-year timelines", () => {
    const archive = buildSyntheticArchive({
      account: syntheticAccount({ createdAt: "2015-01-01T00:00:00.000Z" }),
      tweets: [
        syntheticTweet({ createdAt: "2020-01-01T00:00:00.000Z" }),
      ],
    });
    const result = buildSurveillanceTimeline(archive);
    expect(result?.durationLabel).toMatch(/year/);
    expect(result?.totalDays).toBeGreaterThan(365);
  });

  it("includes connected app and tweet milestones with valid dates", () => {
    const archive = buildSyntheticArchive({
      account: syntheticAccount({ createdAt: "2015-01-01T00:00:00.000Z" }),
      connectedApps: [
        syntheticConnectedApp({ approvedAt: "2018-06-01T00:00:00.000Z" }),
      ],
      tweets: [syntheticTweet({ createdAt: "2016-01-01T00:00:00.000Z" })],
    });
    const result = buildSurveillanceTimeline(archive);
    const labels = result?.milestones.map((m) => m.label) ?? [];
    expect(labels).toContain("First third-party app");
    expect(labels).toContain("First tweet");
  });
});
