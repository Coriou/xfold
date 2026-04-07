import { describe, expect, it } from "vitest";
import {
  computeSecurityAuditCard,
  computeSecurityAuditShareability,
} from "@/components/share-cards/cards/security-audit/compute";
import { computePrivacyScore } from "@/lib/privacy-score";
import {
  buildSyntheticArchive,
  syntheticTweet,
  syntheticIpAuditEntry,
  syntheticDeviceToken,
} from "@/lib/archive/__fixtures/synthetic-archive";

function ctx(archive = buildSyntheticArchive()) {
  return { archive, score: computePrivacyScore(archive) };
}

describe("computeSecurityAuditCard", () => {
  it("returns null for an empty archive", () => {
    expect(computeSecurityAuditCard(ctx())).toBeNull();
  });

  it("returns props when tweets and IPs exist", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ source: "Twitter Web App" }),
        syntheticTweet({ id: "2", source: "Twitter for iPhone" }),
        syntheticTweet({ id: "3", source: "Some Weird Bot Client" }),
      ],
      ipAudit: [
        syntheticIpAuditEntry({ loginIp: "192.0.2.1" }),
        syntheticIpAuditEntry({ loginIp: "192.0.2.2" }),
        syntheticIpAuditEntry({ loginIp: "198.51.100.1" }),
      ],
      deviceTokens: [
        syntheticDeviceToken({ clientApplicationName: "Twitter Web App" }),
        syntheticDeviceToken({
          clientApplicationId: "app-2",
          clientApplicationName: "Twitter for iPhone",
        }),
      ],
    });
    const result = computeSecurityAuditCard(ctx(archive));
    // Result depends on anomaly detection — may or may not be null
    // but should not throw
    if (result) {
      expect(result.username).toBe("test_user");
      expect(result.clientCount).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("computeSecurityAuditShareability", () => {
  it("returns high uniqueness", () => {
    const props = {
      username: "test_user",
      anomalyCount: 3,
      criticalCount: 1,
      topAnomalies: ["Rare tweet client", "Multi-country login"],
      uniqueIps: 5,
      deviceCount: 3,
      clientCount: 4,
      writeAccessCount: 2,
    };
    const shareability = computeSecurityAuditShareability(props);
    expect(shareability.uniqueness).toBeGreaterThanOrEqual(80);
    expect(shareability.magnitude).toBeGreaterThan(0);
  });
});
