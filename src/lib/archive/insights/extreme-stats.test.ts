import { describe, expect, it } from "vitest";
import { scanForExtremeStats } from "@/lib/archive/insights/extreme-stats";
import {
  buildSyntheticArchive,
  syntheticAccount,
  syntheticAdImpression,
  syntheticAdImpressionBatch,
  syntheticConnectedApp,
  syntheticIpAuditEntry,
  syntheticPersonalization,
  syntheticTweet,
} from "@/lib/archive/__fixtures/synthetic-archive";

describe("scanForExtremeStats", () => {
  it("returns all candidates with zero values for empty archive", () => {
    const stats = scanForExtremeStats(buildSyntheticArchive());
    expect(stats.length).toBeGreaterThanOrEqual(8);
    for (const s of stats) {
      expect(s.value).toBe(0);
      expect(s.shareability).toBe(0);
    }
  });

  it("ranks higher shareability first", () => {
    const archive = buildSyntheticArchive({
      adImpressions: [
        syntheticAdImpressionBatch(
          Array.from({ length: 250 }, (_, i) =>
            syntheticAdImpression({
              advertiserName: `Brand ${i}`,
              advertiserScreenName: `brand_${i}`,
            }),
          ),
        ),
      ],
    });
    const stats = scanForExtremeStats(archive);
    // Top candidate should be the advertisers stat (250 unique → ~83% shareability)
    expect(stats[0]?.key).toBe("advertisers");
    expect(stats[0]?.value).toBe(250);
    expect(stats[0]?.shareability).toBeGreaterThan(80);
  });

  it("clamps shareability to 0-100", () => {
    const archive = buildSyntheticArchive({
      personalization: syntheticPersonalization({
        interests: Array.from({ length: 5000 }, (_, i) => ({
          name: `interest-${i}`,
          isDisabled: false,
        })),
      }),
    });
    const stats = scanForExtremeStats(archive);
    for (const s of stats) {
      expect(s.shareability).toBeGreaterThanOrEqual(0);
      expect(s.shareability).toBeLessThanOrEqual(100);
    }
    const interests = stats.find((s) => s.key === "interests");
    expect(interests?.shareability).toBe(100);
  });

  it("uses unique IPs (not raw count) for the ips stat", () => {
    const archive = buildSyntheticArchive({
      ipAudit: [
        syntheticIpAuditEntry({ loginIp: "192.0.2.1" }),
        syntheticIpAuditEntry({ loginIp: "192.0.2.1" }),
        syntheticIpAuditEntry({ loginIp: "192.0.2.2" }),
      ],
    });
    const stats = scanForExtremeStats(archive);
    const ips = stats.find((s) => s.key === "ips");
    expect(ips?.value).toBe(2);
  });

  it("computes account age in years from createdAt", () => {
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    const archive = buildSyntheticArchive({
      account: syntheticAccount({ createdAt: tenYearsAgo.toISOString() }),
    });
    const stats = scanForExtremeStats(archive);
    const age = stats.find((s) => s.key === "ageYears");
    expect(age?.value).toBeGreaterThanOrEqual(9);
    expect(age?.value).toBeLessThanOrEqual(10);
  });

  it("counts connected apps and devices", () => {
    const archive = buildSyntheticArchive({
      connectedApps: [
        syntheticConnectedApp({ id: "1" }),
        syntheticConnectedApp({ id: "2" }),
      ],
      tweets: [syntheticTweet()],
    });
    const stats = scanForExtremeStats(archive);
    expect(stats.find((s) => s.key === "connectedApps")?.value).toBe(2);
  });
});
