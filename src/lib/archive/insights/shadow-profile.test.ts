import { describe, expect, it } from "vitest";
import {
  buildSyntheticArchive,
  syntheticAccount,
  syntheticAdImpression,
  syntheticAdImpressionBatch,
  syntheticInterest,
  syntheticIpAuditEntry,
  syntheticPersonalization,
  syntheticProfile,
  syntheticTweet,
  syntheticUploadedContact,
} from "@/lib/archive/__fixtures/synthetic-archive";
import { buildShadowProfile } from "./shadow-profile";

describe("buildShadowProfile", () => {
  it("returns empty profiles for an empty archive", () => {
    const result = buildShadowProfile(buildSyntheticArchive());
    expect(result.explicit).toEqual([]);
    expect(result.inferred).toEqual([]);
    expect(result.explicitCount).toBe(0);
    expect(result.inferredCount).toBe(0);
    expect(result.totalInterestCount).toBe(0);
    expect(result.unconfirmedInterestCount).toBe(0);
  });

  it("collects explicit user-provided fields", () => {
    const archive = buildSyntheticArchive({
      account: syntheticAccount({
        email: "ben@example.invalid",
        phoneNumber: "+15555550100",
        timezone: "America/New_York",
      }),
      profile: syntheticProfile({
        bio: "synthetic bio",
        location: "Nowhere",
        website: "https://example.invalid",
      }),
      tweets: [syntheticTweet()],
      contacts: [syntheticUploadedContact()],
    });
    const result = buildShadowProfile(archive);
    const labels = result.explicit.map((e) => e.label);
    expect(labels).toContain("Email");
    expect(labels).toContain("Phone number");
    expect(labels).toContain("Bio");
    expect(labels).toContain("Profile location");
    expect(labels).toContain("Tweets");
    expect(labels).toContain("Uploaded contacts");
  });

  it("collects inferred fields from personalization and tracking", () => {
    const archive = buildSyntheticArchive({
      personalization: syntheticPersonalization({
        gender: "Male",
        inferredAge: "25-34",
        interests: [syntheticInterest({ name: "Technology" })],
      }),
      ipAudit: [
        syntheticIpAuditEntry({ loginIp: "10.0.0.1" }),
        syntheticIpAuditEntry({ loginIp: "10.0.0.2" }),
      ],
    });
    const result = buildShadowProfile(archive);
    const labels = result.inferred.map((e) => e.label);
    expect(labels).toContain("Gender");
    expect(labels).toContain("Age range");
    expect(labels).toContain("Interests assigned");
    expect(labels).toContain("IP addresses logged");
  });

  it("counts unconfirmed interests when no behavioral evidence exists", () => {
    const archive = buildSyntheticArchive({
      tweets: [syntheticTweet({ fullText: "completely unrelated" })],
      personalization: syntheticPersonalization({
        interests: [
          syntheticInterest({ name: "Cryptozoology" }),
          syntheticInterest({ name: "Underwater Basket Weaving" }),
        ],
      }),
    });
    const result = buildShadowProfile(archive);
    expect(result.totalInterestCount).toBe(2);
    expect(result.unconfirmedInterestCount).toBe(2);
  });

  it("extracts advertiser demographics from ad targeting criteria", () => {
    const archive = buildSyntheticArchive({
      adImpressions: [
        syntheticAdImpressionBatch([
          syntheticAdImpression({
            advertiserScreenName: "advA",
            targetingCriteria: [
              { targetingType: "Income range", targetingValue: "$75k-100k" },
            ],
          }),
          syntheticAdImpression({
            advertiserScreenName: "advB",
            targetingCriteria: [
              { targetingType: "Income range", targetingValue: "$75k-100k" },
            ],
          }),
        ]),
      ],
    });
    const result = buildShadowProfile(archive);
    expect(result.advertiserDemographics.length).toBeGreaterThan(0);
    expect(result.advertiserDemographics[0]?.type).toBe("Income range");
    expect(result.advertiserDemographics[0]?.advertiserCount).toBe(2);
  });
});
